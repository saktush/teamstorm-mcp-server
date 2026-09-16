import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';

const mockUser = { id: 'u1', displayName: 'User', username: 'user', email: 'user@test.com' };

function attachmentFixture(overrides: Record<string, unknown> = {}) {
  return {
    attachmentId: 'placeholder',
    workspaceId: 'ws-1',
    createdBy: mockUser,
    fileId: 'server-file-id',
    name: 'report.pdf',
    version: 1,
    type: 'application/pdf',
    size: 1234,
    createdAt: '2024-01-01T00:00:00Z',
    antivirusVerdict: 'NotDetected',
    ...overrides,
  };
}

// Regression for F5 (task-2a-brief.md): the follow-up list match used to be
// `a.name === uploadFileName || a.fileId === attachmentId`. `attachmentId` here is
// the UUID the client generates and POSTs as the upload path's {attachmentId} — the
// server round-trips it back as the response's own `attachmentId`, never as
// `fileId` (a distinct, server-assigned storage id). So the `fileId` half of the OR
// was dead, and for a task that already has an attachment with the same filename,
// the name-based match could resolve to that OLD record instead of the just-
// uploaded one.
describe('TeamStormClient Attachment Upload Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';
  const taskId = 'TS-100';

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('uploadTaskAttachmentBuffer', () => {
    it('correlates on attachmentId, not on filename, when an older attachment shares the name', async () => {
      let capturedAttachmentId: string | undefined;

      nock(baseUrl)
        .post(
          new RegExp(
            `/workspaces/${workspace}/workitems/${taskId}/attachments/([0-9a-f-]+)/upload`
          )
        )
        .reply(function (uri) {
          const match = uri.match(/attachments\/([0-9a-f-]+)\/upload/);
          capturedAttachmentId = match?.[1];
          return [200, {}];
        });

      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments`)
        .reply(200, () => ({
          items: [
            // A pre-existing, unrelated attachment that happens to share the name.
            // The old `a.name === uploadFileName` match would return THIS one.
            attachmentFixture({
              attachmentId: 'old-attachment-id',
              fileId: 'old-file-id',
              name: 'report.pdf',
              version: 1,
            }),
            // The just-uploaded attachment: its attachmentId is the client's
            // generated UUID round-tripped by the server; its fileId is an
            // unrelated, server-assigned storage id.
            attachmentFixture({
              attachmentId: capturedAttachmentId,
              fileId: 'new-file-id',
              name: 'report.pdf',
              version: 2,
            }),
          ],
        }));

      const result = await client.uploadTaskAttachmentBuffer(
        taskId,
        workspace,
        Buffer.from('%PDF-1.4 fake'),
        'report.pdf'
      );

      expect(result.attachmentId).toBe(capturedAttachmentId);
      expect(result.version).toBe(2);
      expect(result.fileId).toBe('new-file-id');
    });

    it('throws a readable error when the uploaded attachmentId truly is not in the list', async () => {
      nock(baseUrl)
        .post(
          new RegExp(
            `/workspaces/${workspace}/workitems/${taskId}/attachments/([0-9a-f-]+)/upload`
          )
        )
        .reply(200, {});

      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/attachments`)
        .reply(200, { items: [] });

      await expect(
        client.uploadTaskAttachmentBuffer(
          taskId,
          workspace,
          Buffer.from('data'),
          'orphan.txt'
        )
      ).rejects.toThrow(/не найден в списке вложений/);
    });
  });
});
