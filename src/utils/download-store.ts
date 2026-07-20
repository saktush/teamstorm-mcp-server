import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface DownloadMeta {
  fileName: string;
  contentType: string;
  size: number;
}

type WriteFileFn = (path: string, data: Buffer | string, opts: { mode: number }) => void;

/**
 * Persists an already-fetched buffer for later HTTP retrieval (OOB download flow).
 * Mirrors parseUpload's atomic-write pattern, but for a buffer already in memory
 * rather than an incoming multipart stream.
 */
export async function saveDownloadFile(
  downloadDir: string,
  buffer: Buffer,
  meta: DownloadMeta,
  _fns?: { writeFileSync?: WriteFileFn }
): Promise<{ downloadId: string }> {
  const writeFile: WriteFileFn =
    _fns?.writeFileSync ?? ((p, d, opts) => fs.writeFileSync(p, d, opts));

  const downloadId = crypto.randomUUID();
  const destPath = path.join(downloadDir, downloadId);
  const destTmp = destPath + '.tmp';
  const metaPath = path.join(downloadDir, downloadId + '.meta.json');
  const metaTmp = metaPath + '.tmp';

  writeFile(destTmp, buffer, { mode: 0o600 });
  fs.renameSync(destTmp, destPath);

  try {
    writeFile(metaTmp, JSON.stringify(meta), { mode: 0o600 });
    fs.renameSync(metaTmp, metaPath);
  } catch (err) {
    try {
      fs.unlinkSync(destPath);
    } catch {
      // ignore — best-effort cleanup
    }
    throw err;
  }

  return { downloadId };
}

export function loadDownloadMeta(downloadDir: string, downloadId: string): DownloadMeta | null {
  const metaPath = path.join(downloadDir, downloadId + '.meta.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function getDownloadFilePath(downloadDir: string, downloadId: string): string {
  return path.join(downloadDir, downloadId);
}

/**
 * Builds a Content-Disposition header value safe to pass to Node's res.setHeader().
 * The plain filename= parameter must stay within \x20-\x7E — Node throws ERR_INVALID_CHAR
 * on any other byte — so non-ASCII names go only through the RFC 6266 filename*= parameter,
 * which is always percent-encoded (and therefore always header-safe).
 */
export function buildContentDispositionHeader(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
