import formidable from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { IncomingMessage } from 'http';

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 413
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export interface ParsedUpload {
  uploadId: string;
  originalFilename: string;
  contentType: string;
  size: number;
}

type WriteFileFn = (path: string, data: string, opts: { mode: number }) => void;

/** Best-effort removal of temp files formidable persisted into uploadDir. */
function unlinkFiles(files: formidable.File[]): void {
  for (const file of files) {
    try {
      fs.unlinkSync(file.filepath);
    } catch {
      // ignore — already gone, or never written
    }
  }
}

/**
 * Discard files from a parse that never finished. Their write streams may still
 * be in flight, so a plain unlink can lose the race and leave the file behind;
 * formidable's own destroy() tears the stream down first and then unlinks, which
 * is how the too-large path already cleans up after itself. Asynchronous by
 * nature — callers get no completion signal.
 */
function destroyFiles(files: formidable.File[]): void {
  for (const file of files) {
    // destroy() is on PersistentFile, not the File interface the event emits
    const destroyable = file as formidable.File & { destroy?: () => void };
    try {
      destroyable.destroy?.();
    } catch {
      // ignore — stream was never opened
    }
  }
}

export async function parseUpload(
  req: IncomingMessage,
  uploadDir: string,
  maxFileSize: number,
  _fns?: { writeFileSync?: WriteFileFn }
): Promise<ParsedUpload> {
  const writeMeta: WriteFileFn =
    _fns?.writeFileSync ?? ((p, d, opts) => fs.writeFileSync(p, d, opts));
  const form = formidable({
    uploadDir,
    maxFileSize,
    maxFiles: 1,
    allowEmptyFiles: false,
    minFileSize: 1,
  });

  // When form.parse rejects it gives us no file list, so track every file it
  // opened. 'fileBegin' is the one that fires here — on an aborted parse the
  // per-file 'file' event never arrives, and formidable destroys only the file
  // it rejected, leaving any earlier ones on disk.
  const persisted: formidable.File[] = [];
  form.on('fileBegin', (_field, file) => {
    persisted.push(file);
  });

  let files: formidable.Files;
  try {
    [, files] = await form.parse(req);
  } catch (err: unknown) {
    destroyFiles(persisted);
    // formidable error codes: 1016 = biggerThanMaxFileSize, 1009 = biggerThanTotalMaxFileSize
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      ((err as { code: number }).code === 1016 || (err as { code: number }).code === 1009)
    ) {
      throw new UploadError(
        `File too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)} MB.`,
        413
      );
    }
    throw err;
  }

  const fileArray = (files as Record<string, formidable.File[]>)['file'];
  if (!fileArray || fileArray.length === 0) {
    // formidable already persisted whatever it received into uploadDir; drop it
    // all so a wrong field name can't accumulate orphans there.
    unlinkFiles(persisted);
    throw new UploadError('No file provided. Send as multipart field "file".', 400);
  }

  const file = fileArray[0];
  const uploadId = crypto.randomUUID();
  const destPath = path.join(uploadDir, uploadId);
  const metaPath = path.join(uploadDir, uploadId + '.meta.json');
  const metaTmpPath = metaPath + '.tmp';

  // Atomic: formidable wrote its temp file into uploadDir, so rename stays on the same fs
  fs.renameSync(file.filepath, destPath);

  try {
    writeMeta(
      metaTmpPath,
      JSON.stringify({
        fileName: file.originalFilename ?? 'upload',
        contentType: file.mimetype ?? 'application/octet-stream',
      }),
      { mode: 0o600 }
    );
    fs.renameSync(metaTmpPath, metaPath);
  } catch (err) {
    // Best-effort: remove the data file so there's no orphan
    try {
      fs.unlinkSync(destPath);
    } catch {
      // ignore
    }
    throw err;
  }

  return {
    uploadId,
    originalFilename: file.originalFilename ?? 'upload',
    contentType: file.mimetype ?? 'application/octet-stream',
    size: file.size,
  };
}
