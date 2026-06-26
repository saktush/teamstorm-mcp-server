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

  let files: formidable.Files;
  try {
    [, files] = await form.parse(req);
  } catch (err: unknown) {
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
