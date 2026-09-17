import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { getTaskPermissions } from '../../tools/permissions/get.js';

// Regression for F1: GET .../sharing returns a BARE array (no `items` wrapper),
// same bug class already fixed for GET .../links (see AGENTS.md «Связи»). The old
// `TeamStormPermissionListResponse = { items: [] }` type made `.items` undefined
// at runtime for every real response.
describe('TeamStormClient Permissions Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';
  const taskId = 'TS-100';

  const mockPermission = {
    type: 'User',
    permissionId: 'perm-1',
    workspaceId: 'ws-1',
    workitemId: 'a0000000-0000-0000-0000-000000000001',
    accessLevel: 'Read',
    user: { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' },
  };

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getTaskPermissions (client)', () => {
    it('resolves to the bare array the API actually sends, not {items}', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/sharing`)
        .reply(200, [mockPermission]);

      const result = await client.getTaskPermissions(taskId, workspace);

      // Pre-fix, `result` was typed as `{items: TeamStormPermission[]}` while the
      // real payload was already a bare array — `result.items` was `undefined`.
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].permissionId).toBe('perm-1');
    });
  });

  describe('teamstorm_task_permissions_get (tool)', () => {
    it('renders permissions without throwing on the bare-array response', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/sharing`)
        .reply(200, [mockPermission]);

      const result = await getTaskPermissions(client, { workspace, taskId });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Jane Doe');
      expect(result.content[0].text).toContain('1 шт.');
      expect(result.structuredContent).toEqual({ items: [mockPermission], count: 1 });
    });

    it('reports "no special permissions" on an empty list, not a crash', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/${taskId}/sharing`)
        .reply(200, []);

      const result = await getTaskPermissions(client, { workspace, taskId });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('нет особых правил доступа');
    });
  });
});
