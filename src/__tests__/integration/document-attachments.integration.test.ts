import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { listDocumentAttachments } from '../../tools/document-attachments/list.js';
import { getDocumentAttachmentFile } from '../../tools/document-attachments/download.js';
import { loadDownloadMeta, getDownloadFilePath } from '../../utils/download-store.js';

const mockAttachment = {
  attachmentId: 'a0000000-0000-0000-0000-000000000001',
  workspaceId: 'w0000000-0000-0000-0000-000000000001',
  createdBy: { id: 'u1', displayName: 'Jane Doe', username: 'jane.doe', email: 'jane@example.com' },
  fileId: 'f1',
  name: 'export.pdf',
  version: 1,
  type: 'application/pdf',
  size: 1234,
  createdAt: '2026-01-01T00:00:00Z',
  antivirusVerdict: 'NotDetected',
};

describe('TeamStormClient Document Attachments Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';
  const documentId = 'd0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listDocumentAttachments', () => {
    it('lists attachments of a document', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments`)
        .reply(200, { items: [mockAttachment] });

      const result = await client.listDocumentAttachments(documentId, workspace);

      expect(result.items).toEqual([mockAttachment]);
      expect(nock.isDone()).toBe(true);
    });

    it('throws a descriptive error on 404', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/missing/attachments`)
        .reply(404, { message: 'Document not found' });

      await expect(client.listDocumentAttachments('missing', workspace)).rejects.toThrow(
        /Document not found/
      );
    });
  });

  describe('teamstorm_document_attachments_list tool', () => {
    it('returns attachments as structuredContent', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments`)
        .reply(200, { items: [mockAttachment] });

      const result = await listDocumentAttachments(client, { workspace, documentId });

      expect(result.isError).toBeUndefined();
      expect((result.structuredContent as { items: unknown[] }).items).toEqual([mockAttachment]);
    });

    it('reports no attachments cleanly', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments`)
        .reply(200, { items: [] });

      const result = await listDocumentAttachments(client, { workspace, documentId });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('нет вложений');
    });

    it('returns isError on API failure', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments`)
        .reply(403, { message: 'Forbidden' });

      const result = await listDocumentAttachments(client, { workspace, documentId });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Forbidden');
    });
  });

  describe('teamstorm_document_attachments_download tool', () => {
    let downloadDir: string;
    const attachmentId = mockAttachment.attachmentId;
    const fileBytes = Buffer.from('%PDF-1.4 fake pdf content');

    beforeEach(() => {
      downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-doc-tool-test-'));
    });

    afterEach(() => {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    });

    it('saves the downloaded file to disk and returns a downloadId', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments/${attachmentId}/download`)
        .reply(200, fileBytes, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="export.pdf"',
        });

      const result = await getDocumentAttachmentFile(
        client,
        { workspace, documentId, attachmentId },
        downloadDir
      );

      expect(result.isError).toBeUndefined();
      const downloadId = result.structuredContent?.downloadId as string;
      expect(downloadId).toMatch(/^[0-9a-f-]{36}$/);
      expect(loadDownloadMeta(downloadDir, downloadId)).toEqual({
        fileName: 'export.pdf',
        contentType: 'application/pdf',
        size: fileBytes.length,
      });
      expect(fs.readFileSync(getDownloadFilePath(downloadDir, downloadId))).toEqual(fileBytes);
    });

    it('returns isError when the underlying download fails', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/${documentId}/attachments/${attachmentId}/download`)
        .reply(404, { message: 'Attachment not found' });

      const result = await getDocumentAttachmentFile(
        client,
        { workspace, documentId, attachmentId },
        downloadDir
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Attachment not found');
    });
  });
});
