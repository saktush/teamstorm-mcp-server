import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { listTaskComments } from '../../tools/comments/list.js';

const mockUser = { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' };

// F7 (task-2a-brief.md): CommentModel requires author, createdAt, id, text AND
// visibilityType (enum CommentVisibilityType), but TeamStormComment was missing
// visibilityType entirely. Additive change — the field is now typed, and surfaced
// through the teamstorm_comments_list field-projection system (a contained,
// one-file addition; document-comments/list.ts and both create tools already pass
// the full raw object through as structuredContent, so they pick it up for free).
describe('TeamStormClient Comments Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';
  const taskId = 'TS-100';

  const mockComment = {
    id: 'c1',
    text: 'Looks good',
    author: mockUser,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    visibilityType: 'OnlySelected',
  };

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listTaskComments (client)', () => {
    it('parses visibilityType off the wire', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/comments`)
        .reply(200, { items: [mockComment] });

      const result = await client.listTaskComments(taskId, workspace);

      expect(result.items[0].visibilityType).toBe('OnlySelected');
    });
  });

  describe('teamstorm_comments_list (tool, json format)', () => {
    it('surfaces visibilityType when explicitly requested via fields', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/comments`)
        .reply(200, { items: [mockComment] });

      const result = await listTaskComments(client, {
        workspace,
        taskId,
        format: 'json',
        fields: ['id', 'visibilityType'],
      });

      expect(result.isError).toBeUndefined();
      const items = (result.structuredContent as { items: Array<Record<string, unknown>> }).items;
      expect(items[0].visibilityType).toBe('OnlySelected');
    });
  });
});
