import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  saveDownloadFile,
  loadDownloadMeta,
  getDownloadFilePath,
  buildContentDispositionHeader,
  type DownloadMeta,
} from '../utils/download-store.js';

describe('download-store', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-store-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('saveDownloadFile', () => {
    it('writes the buffer and a matching .meta.json sidecar, returning a UUID downloadId', async () => {
      const content = Buffer.from('hello world');
      const meta: DownloadMeta = {
        fileName: 'hello.txt',
        contentType: 'text/plain',
        size: content.length,
      };

      const { downloadId } = await saveDownloadFile(tmpDir, content, meta);

      expect(downloadId).toMatch(/^[0-9a-f-]{36}$/);

      const stored = fs.readFileSync(path.join(tmpDir, downloadId));
      expect(stored).toEqual(content);

      const storedMeta = JSON.parse(
        fs.readFileSync(path.join(tmpDir, downloadId + '.meta.json'), 'utf-8')
      );
      expect(storedMeta).toEqual(meta);
    });

    it('writes files with owner-only permissions (0o600)', async () => {
      const { downloadId } = await saveDownloadFile(tmpDir, Buffer.from('secret'), {
        fileName: 'a.txt',
        contentType: 'text/plain',
        size: 6,
      });

      const mode = fs.statSync(path.join(tmpDir, downloadId)).mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('cleans up the data file if writing the meta sidecar fails, leaving no orphan', async () => {
      await expect(
        saveDownloadFile(
          tmpDir,
          Buffer.from('data'),
          { fileName: 'x', contentType: 'x', size: 4 },
          {
            writeFileSync: (p: string) => {
              if (p.endsWith('.meta.json.tmp')) throw new Error('disk full');
              fs.writeFileSync(p, Buffer.from('data'), { mode: 0o600 });
            },
          }
        )
      ).rejects.toThrow('disk full');

      const remaining = fs.readdirSync(tmpDir).filter((f) => !f.endsWith('.tmp'));
      expect(remaining).toHaveLength(0);
    });
  });

  describe('loadDownloadMeta', () => {
    it('returns the meta previously saved', async () => {
      const meta: DownloadMeta = {
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        size: 42,
      };
      const { downloadId } = await saveDownloadFile(tmpDir, Buffer.alloc(42), meta);

      expect(loadDownloadMeta(tmpDir, downloadId)).toEqual(meta);
    });

    it('returns null when the id does not exist', () => {
      expect(loadDownloadMeta(tmpDir, '00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('buildContentDispositionHeader', () => {
    it('produces a pure-ASCII header value for an ASCII filename', () => {
      const header = buildContentDispositionHeader('report.pdf');
      expect(header).toBe(`attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`);
      expect(/^[\x20-\x7E]*$/.test(header)).toBe(true);
    });

    it('never produces header-illegal bytes for a non-ASCII filename (Node res.setHeader guard)', () => {
      const header = buildContentDispositionHeader('отчет.pdf');
      // The plain filename= parameter must stay ASCII-only — Node's http module throws
      // ERR_INVALID_CHAR on setHeader() for any byte outside \x09,\x20-\x7E.
      expect(/^[\x20-\x7E]*$/.test(header)).toBe(true);
      // The accurate name is still recoverable via the RFC 6266 extended parameter.
      expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('отчет.pdf')}`);
    });

    it('strips double quotes from the plain filename parameter to avoid breaking the header syntax', () => {
      const header = buildContentDispositionHeader('weird"name".txt');
      expect(header).toContain('filename="weirdname.txt"');
    });
  });

  describe('getDownloadFilePath', () => {
    it('points at the saved file, readable and byte-identical to the source buffer', async () => {
      const content = Buffer.from('file bytes');
      const { downloadId } = await saveDownloadFile(tmpDir, content, {
        fileName: 'x.bin',
        contentType: 'application/octet-stream',
        size: content.length,
      });

      const filePath = getDownloadFilePath(tmpDir, downloadId);
      expect(fs.readFileSync(filePath)).toEqual(content);
    });
  });
});
