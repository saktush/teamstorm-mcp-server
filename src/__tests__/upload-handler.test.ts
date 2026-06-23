import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import http from 'http';
import type { AddressInfo } from 'net';
import { parseUpload, UploadError, type ParsedUpload } from '../utils/upload-handler.js';

function buildMultipartBody({
  boundary,
  filename,
  content,
  fieldName = 'file',
  contentType = 'application/octet-stream',
}: {
  boundary: string;
  filename: string;
  content: Buffer;
  fieldName?: string;
  contentType?: string;
}): Buffer {
  return Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`),
    Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}

interface CallOptions {
  chunkSize?: number;
  _fns?: Parameters<typeof parseUpload>[3];
}

function callParseUpload(
  boundary: string,
  body: Buffer,
  uploadDir: string,
  maxSize: number,
  opts: CallOptions = {},
): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        resolve(await parseUpload(req, uploadDir, maxSize, opts._fns));
      } catch (err) {
        reject(err);
      } finally {
        res.end();
        server.close();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      const contentType = `multipart/form-data; boundary=${boundary}`;

      if (opts.chunkSize) {
        // Chunked transfer — no content-length so formidable uses chunked mode
        const client = http.request({
          host: '127.0.0.1',
          port,
          method: 'POST',
          headers: { 'content-type': contentType },
        });
        let offset = 0;
        function sendNext() {
          if (offset >= body.length) {
            client.end();
            return;
          }
          client.write(body.subarray(offset, Math.min(offset + opts.chunkSize!, body.length)));
          offset += opts.chunkSize!;
          setImmediate(sendNext);
        }
        sendNext();
      } else {
        const client = http.request({
          host: '127.0.0.1',
          port,
          method: 'POST',
          headers: { 'content-type': contentType, 'content-length': body.length },
        });
        client.end(body);
      }
    });
  });
}

describe('parseUpload', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-handler-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TC1: small file is written to disk intact with correct metadata', async () => {
    const content = Buffer.from('hello world');
    const boundary = 'testboundary123';
    const body = buildMultipartBody({ boundary, filename: 'hello.txt', content });

    const result = await callParseUpload(boundary, body, tmpDir, 50 * 1024 * 1024);

    expect(result.originalFilename).toBe('hello.txt');
    expect(result.size).toBe(content.length);
    expect(result.uploadId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.contentType).toBe('application/octet-stream');

    const stored = fs.readFileSync(path.join(tmpDir, result.uploadId));
    expect(stored).toEqual(content);

    const meta = JSON.parse(
      fs.readFileSync(path.join(tmpDir, result.uploadId + '.meta.json'), 'utf8'),
    );
    expect(meta.fileName).toBe('hello.txt');
    expect(meta.contentType).toBe('application/octet-stream');
  });

  it('TC2: large multi-chunk file contains no boundary bytes (D1 regression guard)', async () => {
    const MB = 1024 * 1024;
    const content = Buffer.alloc(5 * MB, 0x42); // 5 MB of 'B'
    const boundary = 'largeboundary1234';
    const body = buildMultipartBody({ boundary, filename: 'big.bin', content });

    const result = await callParseUpload(boundary, body, tmpDir, 50 * MB, {
      chunkSize: 64 * 1024, // send in 64 KB chunks
    });

    expect(result.size).toBe(5 * MB);

    const stored = fs.readFileSync(path.join(tmpDir, result.uploadId));
    expect(stored.length).toBe(5 * MB);
    // Old parser would append --boundary-- bytes; verify none are present
    expect(stored.subarray(-64).toString('binary')).not.toContain(boundary);
    expect(stored.every((b) => b === 0x42)).toBe(true);
  });

  it('TC3: file exceeding maxFileSize rejects with UploadError(413)', async () => {
    const content = Buffer.alloc(200);
    const boundary = 'bound123';
    const body = buildMultipartBody({ boundary, filename: 'big.bin', content });

    await expect(callParseUpload(boundary, body, tmpDir, 100)).rejects.toSatisfy(
      (err: unknown) => err instanceof UploadError && err.statusCode === 413,
    );
  });

  it('TC4: wrong field name rejects with UploadError(400)', async () => {
    const content = Buffer.from('data');
    const boundary = 'bound456';
    const body = buildMultipartBody({ boundary, filename: 'file.txt', content, fieldName: 'attachment' });

    await expect(
      callParseUpload(boundary, body, tmpDir, 50 * 1024 * 1024),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof UploadError && err.statusCode === 400,
    );
  });

  it('TC5: meta write failure cleans up the data file leaving no orphan (D2 cleanup)', async () => {
    const content = Buffer.from('some data');
    const boundary = 'bound789';
    const body = buildMultipartBody({ boundary, filename: 'file.txt', content });

    await expect(
      callParseUpload(boundary, body, tmpDir, 50 * 1024 * 1024, {
        _fns: {
          writeFileSync: () => {
            throw new Error('disk full');
          },
        },
      }),
    ).rejects.toThrow('disk full');

    // No orphaned data file should remain after cleanup
    const remaining = fs
      .readdirSync(tmpDir)
      .filter((f) => !f.endsWith('.meta.json') && !f.endsWith('.tmp'));
    expect(remaining).toHaveLength(0);
  });

  it('TC6: UTF-8 filename is preserved correctly', async () => {
    const content = Buffer.from('content');
    const boundary = 'boundunicode';
    const body = buildMultipartBody({ boundary, filename: 'файл.txt', content });

    const result = await callParseUpload(boundary, body, tmpDir, 50 * 1024 * 1024);
    expect(result.originalFilename).toBe('файл.txt');
  });
});
