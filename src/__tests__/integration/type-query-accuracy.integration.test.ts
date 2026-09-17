import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormType, TeamStormWorkflow } from '../../client/types.js';
import { listWorkflows, listWorkflowsSchema } from '../../tools/workflows/list.js';
import { listWorkspaces, listWorkspacesSchema } from '../../tools/workspaces/list.js';
import { listUsersSchema } from '../../tools/users/list.js';
import { listAttributes, listAttributesSchema } from '../../tools/attributes/list.js';
import { listTaskTypes } from '../../tools/types/list.js';
import { createTaskSchema } from '../../tools/tasks/create.js';

const status = { id: 's1', name: 'Open', category: { id: 'c1', name: 'New' } };
const workflow: TeamStormWorkflow = {
  id: 'wf1',
  name: 'Default',
  type: 'Workitem',
  description: null,
  statuses: [{ ...status, positionX: 10, positionY: 20 }],
  transitions: [
    {
      transitionId: 'tr1',
      fromStatus: null,
      nextStatus: status,
      fromAllStatuses: false,
      isInitial: true,
    },
  ],
};
const taskType: TeamStormType = {
  id: 't1',
  name: 'Task',
  color: 'Sky',
  icon: 'Task',
  workflow: { id: 'wf1', name: 'Default' },
  attributes: [
    { id: 'a1', name: 'Priority', type: 'UniSelect', workitemTypes: [{ id: 't1', name: 'Task' }] },
  ],
  progressType: 'ByStatus',
  estimatesInTime: true,
  estimatesInStoryPoints: false,
  showTimeTracking: true,
};

describe('Task 2b response metadata and query forwarding', () => {
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'WS';
  let client: TeamStormClient;

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient('test-token', baseUrl, workspace);
  });
  afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
  });

  it('B13/B19: client sends workflow name and returns statuses/transitions/type', async () => {
    nock(baseUrl)
      .get('/workspaces/WS/workflows')
      .query({ name: 'Default' })
      .reply(200, { items: [workflow] });
    const result = await client.listWorkflows(workspace, { name: 'Default' });
    expect(result.items[0].type).toBe('Workitem');
    expect(result.items[0].statuses[0].positionX).toBe(10);
    expect(result.items[0].transitions[0].fromStatus).toBeNull();
    expect(result.items[0].transitions[0].nextStatus.id).toBe('s1');
  });

  it('B13/B19: tool forwards workflow name and preserves metadata', async () => {
    nock(baseUrl)
      .get('/workspaces/WS/workflows')
      .query({ name: 'Default' })
      .reply(200, { items: [workflow] });
    const result = await listWorkflows(
      client,
      listWorkflowsSchema.parse({ workspace, name: 'Default' })
    );
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.workflows).toEqual([workflow]);
  });

  it('B14: client returns the full TypeModel metadata', async () => {
    nock(baseUrl)
      .get('/workspaces/WS/types')
      .reply(200, { items: [taskType] });
    const result = await client.listTaskTypes(workspace);
    expect(result.items[0].color).toBe('Sky');
    expect(result.items[0].workflow.id).toBe('wf1');
    expect(result.items[0].attributes[0].workitemTypes[0].id).toBe('t1');
    expect(result.items[0].estimatesInTime).toBe(true);
    expect(result.items[0].estimatesInStoryPoints).toBe(false);
    expect(result.items[0].showTimeTracking).toBe(true);
  });

  it('B14: tool preserves the full TypeModel metadata in structuredContent', async () => {
    nock(baseUrl)
      .get('/workspaces/WS/types')
      .reply(200, { items: [taskType] });
    const result = await listTaskTypes(client, { workspace });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.taskTypes).toEqual([taskType]);
  });

  it('B8/B18: client sends key/name and retains description/author', async () => {
    nock(baseUrl)
      .get('/workspaces')
      .query({ key: 'WS', name: 'Space' })
      .reply(200, {
        items: [{ id: 'ws1', key: 'WS', name: 'Space', description: 'Details', author: null }],
      });
    const result = await client.listWorkspaces({ key: 'WS', name: 'Space' });
    expect(result.items[0].description).toBe('Details');
    expect(result.items[0].author).toBeNull();
  });

  it('B18: workspace tool sends key/name on every page', async () => {
    nock(baseUrl)
      .get('/workspaces')
      .query({ key: 'WS', name: 'Space', maxItemsCount: '1000' })
      .reply(200, { items: [{ id: 'ws1', key: 'WS', name: 'Space' }], nextToken: 'page2' });
    nock(baseUrl)
      .get('/workspaces')
      .query({ key: 'WS', name: 'Space', maxItemsCount: '1000', fromToken: 'page2' })
      .reply(200, { items: [{ id: 'ws2', key: 'WS2', name: 'Space2' }] });
    const result = await listWorkspaces(
      client,
      listWorkspacesSchema.parse({ key: 'WS', name: 'Space' })
    );
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.count).toBe(2);
  });

  it('B20: false exact matching is forwarded along with pagination', async () => {
    nock(baseUrl)
      .get('/workspaces/WS/attributes')
      .query({ type: 'Tag', isFullNameMatching: 'false', fromToken: 'page2', maxItemsCount: '25' })
      .reply(200, { items: [] });
    const result = await listAttributes(
      client,
      listAttributesSchema.parse({
        workspace,
        type: 'Tag',
        isFullNameMatching: false,
        fromToken: 'page2',
        maxItemsCount: 25,
      })
    );
    expect(result.isError).toBeUndefined();
  });

  it('B15/B17/B20: schemas expose new options and reject unsupported attribute types', () => {
    expect(
      createTaskSchema.parse({
        workspace,
        name: 'Task',
        type: 'Task',
        parentId: 'folder',
        startDate: '2026-09-20',
      }).startDate
    ).toBe('2026-09-20');
    expect(
      listUsersSchema.parse({ workspace, displayName: 'Jane', roleId: 'role1', fromToken: 'page2' })
    ).toMatchObject({ displayName: 'Jane', roleId: 'role1', fromToken: 'page2' });
    expect(listAttributesSchema.safeParse({ workspace, type: 'Boolean' }).success).toBe(false);
  });
});
