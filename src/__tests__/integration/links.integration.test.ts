import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { createTaskLink } from '../../tools/links/create.js';

// F3 (task-2a-brief.md) + RULING R2: CreateWorkitemLinkRequestBody requires
// `linkedWorkspace` per spec, but the client omitted it entirely and link
// creation works today without it, so the server must default it. Added as an
// OPTIONAL field — additive test only, no TDD red/green needed.
describe('TeamStormClient Links Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';
  const taskId = 'TS-13';

  const mockLinkType = { id: 'lt-1', name: 'Relates', key: 'relates' };
  const mockLink = {
    id: 'link-1',
    type: mockLinkType,
    linkedWorkitem: {
      id: 't2',
      key: 'OTHER-42',
      name: 'Cross-workspace task',
      status: { id: 's1', name: 'Open', category: { id: 'c1', name: 'Open' } },
    },
  };

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createTaskLink (client)', () => {
    it('sends linkedWorkspace in the request body when provided', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/workitems/${taskId}/links`, {
          type: 'lt-1',
          linkedWorkitem: 'OTHER-42',
          linkedWorkspace: 'other-ws',
        })
        .reply(200, mockLink);

      const result = await client.createTaskLink(
        taskId,
        { type: 'lt-1', linkedWorkitem: 'OTHER-42', linkedWorkspace: 'other-ws' },
        workspace
      );

      expect(result.id).toBe('link-1');
      expect(nock.isDone()).toBe(true);
    });

    it('omits linkedWorkspace entirely when not provided (unchanged same-workspace behaviour)', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/workitems/${taskId}/links`, {
          type: 'lt-1',
          linkedWorkitem: 'TS-42',
        })
        .reply(200, mockLink);

      const result = await client.createTaskLink(
        taskId,
        { type: 'lt-1', linkedWorkitem: 'TS-42' },
        workspace
      );

      expect(result.id).toBe('link-1');
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('teamstorm_task_links_create (tool)', () => {
    it('threads linkedWorkspace through to the client call', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/workitems/${taskId}/links`, {
          type: 'lt-1',
          linkedWorkitem: 'OTHER-42',
          linkedWorkspace: 'other-ws',
        })
        .reply(200, mockLink);

      const result = await createTaskLink(client, {
        workspace,
        taskId,
        linkedWorkitem: 'OTHER-42',
        linkTypeId: 'lt-1',
        linkedWorkspace: 'other-ws',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });
  });
});
