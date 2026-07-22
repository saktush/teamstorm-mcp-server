import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { getTaskAttachmentFile } from '../../tools/attachments/download.js';
import { loadDownloadMeta, getDownloadFilePath } from '../../utils/download-store.js';

describe('TeamStormClient Attachment Download Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';
  const taskId = 'TS-100';
  const documentId = 'd0000000-0000-0000-0000-000000000001';
  const attachmentId = 'a0000000-0000-0000-0000-000000000001';
  const fileBytes = Buffer.from('%PDF-1.4 fake pdf content');

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('downloadTaskAttachmentBuffer', () => {
    it('downloads the raw bytes and extracts the filename from Content-Disposition', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments/${attachmentId}/download`)
        .reply(200, fileBytes, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="report.pdf"',
        });

      const result = await client.downloadTaskAttachmentBuffer(taskId, attachmentId, workspace);

      expect(result.buffer).toEqual(fileBytes);
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toBe('report.pdf');
    });

    it('prefers the UTF-8 filename* form when present', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments/${attachmentId}/download`)
        .reply(200, fileBytes, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="fallback.pdf"; filename*=UTF-8''%D0%BE%D1%82%D1%87%D0%B5%D1%82.pdf`,
        });

      const result = await client.downloadTaskAttachmentBuffer(taskId, attachmentId, workspace);

      expect(result.fileName).toBe('отчет.pdf');
    });

    it('falls back to a generated filename when Content-Disposition is absent', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments/${attachmentId}/download`)
        .reply(200, fileBytes, { 'Content-Type': 'application/pdf' });

      const result = await client.downloadTaskAttachmentBuffer(taskId, attachmentId, workspace);

      expect(result.fileName).toBe(`attachment-${attachmentId}.pdf`);
    });

    it('decodes a JSON error body correctly even though the request used responseType arraybuffer', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments/${attachmentId}/download`)
        .reply(404, { message: 'Attachment not found' });

      await expect(client.downloadTaskAttachmentBuffer(taskId, attachmentId, workspace)).rejects.toThrow(
        /Attachment not found/
      );
    });
  });

  describe('downloadDocumentAttachmentBuffer', () => {
    it('downloads the raw bytes from the document attachments download endpoint', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments/${attachmentId}/download`)
        .reply(200, fileBytes, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="page-export.pdf"',
        });

      const result = await client.downloadDocumentAttachmentBuffer(documentId, attachmentId, workspace);

      expect(result.buffer).toEqual(fileBytes);
      expect(result.fileName).toBe('page-export.pdf');
    });

    it('decodes a JSON error body correctly', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments/${attachmentId}/download`)
        .reply(423, { message: 'Document is locked' });

      await expect(
        client.downloadDocumentAttachmentBuffer(documentId, attachmentId, workspace)
      ).rejects.toThrow(/Document is locked/);
    });
  });

  describe('teamstorm_attachments_download tool', () => {
    let downloadDir: string;

    beforeEach(() => {
      downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-tool-test-'));
    });

    afterEach(() => {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    });

    it('saves the downloaded file to disk and returns a downloadId pointing at it', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments/${attachmentId}/download`)
        .reply(200, fileBytes, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="report.pdf"',
        });

      const result = await getTaskAttachmentFile(
        client,
        { workspace, taskId, attachmentId },
        downloadDir
      );

      expect(result.isError).toBeUndefined();
      const downloadId = result.structuredContent?.downloadId as string;
      expect(downloadId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.content[0].text).toContain(downloadId);
      expect(result.content[0].text).toContain('/download/');

      expect(loadDownloadMeta(downloadDir, downloadId)).toEqual({
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        size: fileBytes.length,
      });
      expect(fs.readFileSync(getDownloadFilePath(downloadDir, downloadId))).toEqual(fileBytes);
    });

    it('returns isError when the underlying download fails', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments/${attachmentId}/download`)
        .reply(404, { message: 'Attachment not found' });

      const result = await getTaskAttachmentFile(
        client,
        { workspace, taskId, attachmentId },
        downloadDir
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Attachment not found');
    });
  });
});
