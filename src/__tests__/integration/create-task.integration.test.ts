import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { createTask } from '../../tools/tasks/create.js';

const workspaceKey = 'TS';
const folderId = '1a675f44-07f0-4319-b89a-35608c37fa68';

const mockTask = {
  id: 'a0000000-0000-0000-0000-000000000001',
  key: 'TS-1',
  name: 'Test epic',
  description: '',
  type: { id: 't1', name: 'Эпик' },
  workflow: { id: 'w1', name: 'Default' },
  status: { id: 's1', name: 'Open', category: { id: 'c1', name: 'Open' } },
  createdDate: '2026-07-14T00:00:00Z',
  author: { id: 'u1', displayName: 'Author', username: 'author', email: 'a@x.com' },
  originalEstimate: 0,
  timeSpent: 0,
  remainingEstimate: 0,
  storyPoints: 0,
  changedBy: { id: 'u1', displayName: 'Author', username: 'author', email: 'a@x.com' },
  attributes: [],
  portfolios: [],
  workspace: { id: 'ws1', key: workspaceKey, name: 'Test space', description: '', author: {} },
};

describe('createTask tool (workspace/folder resolution)', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient('test-token', baseUrl, workspaceKey);
  });

  afterEach(() => {
    nock.cleanAll();
    expect(nock.isDone()).toBe(true);
  });

  it('creates a task without ever calling GET /workspaces, using a real folder GUID as-is', async () => {
    nock(baseUrl)
      .post(`/workspaces/${workspaceKey}/workitems`, {
        name: 'Test epic',
        type: 'Эпик',
        parentId: folderId,
      })
      .reply(201, mockTask);

    const result = await createTask(client, {
      workspace: workspaceKey,
      name: 'Test epic',
      type: 'Эпик',
      parentId: folderId,
    });

    expect(result.isError).toBeUndefined();
  });

  it('still resolves a folder by name via pagination when parentId is not a GUID', async () => {
    nock(baseUrl)
      .get(`/workspaces/${workspaceKey}/workitems`)
      .query({ maxItemsCount: '100' })
      .reply(200, {
        fromToken: '',
        maxItemsCount: 100,
        nextToken: '',
        items: [{ ...mockTask, folder: { id: folderId, name: 'Разработка', nodeType: 'Folder' } }],
      });

    nock(baseUrl)
      .post(`/workspaces/${workspaceKey}/workitems`, {
        name: 'Test epic',
        type: 'Эпик',
        parentId: folderId,
      })
      .reply(201, mockTask);

    const result = await createTask(client, {
      workspace: workspaceKey,
      name: 'Test epic',
      type: 'Эпик',
      parentId: 'разработка',
    });

    expect(result.isError).toBeUndefined();
  });
});
