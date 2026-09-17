import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import nock from 'nock';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { registerToolsets, resolveToolsets } from '../../tools/toolsets.js';
import { MAX_PAYLOAD_BYTES } from '../../utils/output.js';

const host = 'http://teamstorm.test';
const path = '/cwm/public/api/v1/workspaces/time-tracking-entries';
const toolName = 'teamstorm_time_entries_list_by_period';
const startDate = '2026-09-01T00:00:00Z';
const user = { id: 'u1', displayName: 'Jane', username: 'jane', email: 'jane@test.com' };
const entry = {
  id: 'e1',
  date: '2026-09-02T10:00:00Z',
  spentTime: 123,
  description: null,
  createdAt: '2026-09-02T10:01:00Z',
  updatedAt: '2026-09-02T10:02:00Z',
  deletedAt: null,
  deleteUserId: null,
  deleteUser: null,
  author: user,
  workitem: {
    id: 't1',
    key: 'TS-1',
    name: 'Task',
    author: user,
    folder: { id: 'f1', name: 'Folder' },
    parent: { id: 'f1', nodeType: 'Folder' },
    workspace: { id: 'ws1', key: 'TS', name: 'Space', author: user },
    attributes: [],
    portfolios: [],
    description: '<p>FULL-TASK-SECRET</p>'.repeat(100_000),
  },
};

describe('Task 3 public period time entries through MCP', () => {
  let api: TeamStormClient;
  let server: McpServer;
  let mcp: Client;

  beforeEach(async () => {
    nock.cleanAll();
    api = new TeamStormClient('test-token', `${host}/cwm/public/api/v1`);
    server = new McpServer({ name: 'test', version: '1' });
    registerToolsets(server, api, resolveToolsets('tasks'));
    mcp = new Client({ name: 'test', version: '1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await mcp.connect(clientTransport);
  });

  afterEach(async () => {
    await mcp.close();
    await server.close();
    vi.restoreAllMocks();
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
  });

  const call = (args: Record<string, unknown>) => mcp.callTool({ name: toolName, arguments: args });

  it('registers the public tool alongside both private tools without a workspace input', async () => {
    const { tools } = await mcp.listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        toolName,
        'teamstorm_time_entries_list',
        'teamstorm_time_entries_create',
      ])
    );
    const tool = tools.find((t) => t.name === toolName)!;
    expect(tool.inputSchema.properties).not.toHaveProperty('workspace');
    expect(tool.inputSchema.required).toContain('startDate');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.annotations?.readOnlyHint).toBe(true);
  });

  it('forwards only the five public query fields, uses session auth and honors apiUrl', async () => {
    api.setToken('refreshed-token');
    nock('http://other.test', { reqheaders: { authorization: 'PrivateToken refreshed-token' } })
      .get(path)
      .query({
        startDate,
        endDate: '2026-09-17T23:59:59+03:00',
        users: 'jane,bob',
        fromToken: 'page1',
        maxItemsCount: '1000',
      })
      .reply(200, { items: [entry], nextToken: 'page2' });
    const result = await call({
      apiUrl: 'http://other.test',
      startDate,
      endDate: '2026-09-17T23:59:59+03:00',
      users: 'jane,bob',
      fromToken: 'page1',
      maxItemsCount: 1000,
      format: 'json',
      fields: ['id', 'spentTime', 'workitem'],
      maxItems: 1,
      descriptionMaxChars: 10,
    });
    expect(result.isError, JSON.stringify(result.content)).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      items: [
        {
          id: 'e1',
          spentTime: 123,
          workitem: {
            id: 't1',
            key: 'TS-1',
            name: 'Task',
            workspace: { id: 'ws1', key: 'TS', name: 'Space' },
          },
        },
      ],
      nextToken: 'page2',
      hasMore: true,
    });
  });

  it('preserves null deletion metadata and raw spentTime in a compact default response', async () => {
    nock(host)
      .get(path)
      .query({ startDate, maxItemsCount: '50' })
      .reply(200, { items: [entry], fromToken: null, maxItemsCount: null, nextToken: null });
    const result = await call({ startDate });
    expect(result.structuredContent).toMatchObject({
      items: [
        {
          id: 'e1',
          date: entry.date,
          spentTime: 123,
          description: null,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          deletedAt: null,
          deleteUserId: null,
          deleteUser: null,
          author: { id: 'u1', displayName: 'Jane', username: 'jane' },
        },
      ],
      hasMore: false,
      nextToken: null,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('FULL-TASK-SECRET');
    expect(serialized).not.toContain('jane@test.com');
    expect(serialized).toContain('123');
    expect(serialized).toContain('не указана');
    expect(Buffer.byteLength(serialized)).toBeLessThan(5000);
  });

  it('retains deleted users and absent/null/named type metadata', async () => {
    const deleted = {
      ...entry,
      id: 'e2',
      deletedAt: entry.updatedAt,
      deleteUserId: 'u1',
      deleteUser: user,
      type: null,
    };
    nock(host)
      .get(path)
      .query({ startDate, maxItemsCount: '50' })
      .reply(200, {
        items: [entry, deleted, { ...entry, id: 'e3', type: { id: 'type1', name: 'Development' } }],
      });
    const result = await call({ startDate, format: 'json' });
    expect(result.structuredContent).toMatchObject({
      items: [
        { id: 'e1' },
        {
          id: 'e2',
          deletedAt: entry.updatedAt,
          deleteUserId: 'u1',
          deleteUser: { id: 'u1', displayName: 'Jane', username: 'jane' },
          type: null,
        },
        { id: 'e3', type: { id: 'type1', name: 'Development' } },
      ],
    });
  });

  it('keeps empty-page pagination and forwards the next cursor on the next call', async () => {
    nock(host)
      .get(path)
      .query({ startDate, maxItemsCount: '50' })
      .reply(200, { items: [], nextToken: 'next' });
    const first = await call({ startDate });
    expect(first.structuredContent).toMatchObject({
      items: [],
      returned: 0,
      hasMore: true,
      nextToken: 'next',
    });
    nock(host)
      .get(path)
      .query({ startDate, fromToken: 'next', maxItemsCount: '50' })
      .reply(200, { items: [] });
    const last = await call({ startDate, fromToken: 'next', format: 'json' });
    expect(last.structuredContent).toMatchObject({ items: [], hasMore: false, nextToken: null });
  });

  it('applies the output cap separately from API page size', async () => {
    nock(host)
      .get(path)
      .query({ startDate, maxItemsCount: '1000' })
      .reply(200, { items: Array.from({ length: 201 }, (_, i) => ({
        ...entry,
        id: `e${i}`,
        workitem: { ...entry.workitem, description: '' },
      })) });
    const result = await call({
      startDate,
      maxItemsCount: 1000,
      maxItems: 200,
      format: 'json',
      fields: ['id'],
    });
    expect(result.structuredContent).toMatchObject({
      returned: 200,
      requested: 201,
      hasMore: true,
      truncatedByCap: true,
    });
  });

  it('bounds descriptions and bulky nested references within the shared byte budget', async () => {
    const big = {
      ...entry,
      description: '<p>' + 'x'.repeat(8000) + '</p>',
      workitem: { ...entry.workitem, description: 'FULL-TASK-SECRET', name: 'y'.repeat(1000) },
    };
    nock(host)
      .get(path)
      .query({ startDate, maxItemsCount: '200' })
      .reply(200, { items: Array.from({ length: 200 }, (_, i) => ({ ...big, id: `e${i}` })) });
    const result = await call({
      startDate,
      maxItemsCount: 200,
      maxItems: 200,
      format: 'json',
      descriptionMaxChars: 1_000_000,
    });
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    expect(result.structuredContent).toMatchObject({ truncatedByBytes: true, hasMore: true });
  });

  it.each([
    {},
    { startDate: '' },
    { startDate: 'nonsense' },
    { startDate: '2026-02-30T00:00:00Z' },
    { startDate: '2026-09-01T00:00:00' },
    { startDate, endDate: 'bad' },
    { startDate, workspace: 'WS' },
    { startDate, taskId: 'TS-1' },
    { startDate, withDeleted: true },
    { startDate, maxItemsCount: 0 },
    { startDate, maxItemsCount: 1001 },
    { startDate, maxItemsCount: 1.5 },
    { startDate: '2026-09-01T00:00:00+99:00' },
    { startDate: '2026-09-01T00:00:00+03:99' },
    { startDate: entry.date, endDate: '2026-09-01T00:00:00-99:00' },
    { startDate: entry.date, endDate: '2026-09-01T00:00:00-03:99' },
  ])('rejects unsupported scope or invalid required/date/page inputs: %j', async (args) => {
    const request = vi.spyOn(api, 'listTimeEntriesByPeriod').mockResolvedValue({ items: [] });
    expect((await call(args)).isError).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['2026-09-01T00:00:00Z', '2026-09-01T00:00:00.123Z', '2026-09-01T00:00:00+03:00'])(
    'accepts supported date-time input unchanged: %s',
    async (date) => {
      nock(host)
        .get(path)
        .query({ startDate: date, maxItemsCount: '50' })
        .reply(200, { items: [] });
      expect((await call({ startDate: date })).isError).toBeUndefined();
    }
  );

  it.each([400, 401, 403, 500])(
    'surfaces public API error %i as an MCP tool error',
    async (status) => {
      nock(host)
        .get(path)
        .query({ startDate, maxItemsCount: '50' })
        .reply(status, { message: 'Rejected' });
      const result = await call({ startDate });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain('Ошибка');
      expect(result.structuredContent).toBeUndefined();
    }
  );
});
