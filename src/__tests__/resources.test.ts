import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { registerTaskResource } from '../resources/task.js';
import { registerDocumentResource } from '../resources/document.js';
import { registerFolderTreeResource } from '../resources/folder-tree.js';
import { formatTaskMarkdown, formatDocumentMarkdown } from '../utils/formatters.js';
import type { TeamStormClient } from '../client/teamstorm.js';
import type { TeamStormTask, TeamStormDocument, TeamStormFolderModel } from '../client/types.js';

type ReadCallback = (
  uri: URL,
  variables: Record<string, string | string[]>,
  extra: unknown
) => Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }>;

/**
 * Minimal McpServer stub that records the registerResource(name, template, config, cb) call so
 * tests can invoke the read callback directly.
 */
function captureResource(
  register: (server: McpServer, client: TeamStormClient) => void,
  client: TeamStormClient
): { name: string; config: { mimeType?: string }; cb: ReadCallback } {
  let captured: { name: string; config: { mimeType?: string }; cb: ReadCallback } | undefined;
  const stub = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerResource: (name: string, _template: any, config: any, cb: any) => {
      captured = { name, config, cb };
    },
  } as unknown as McpServer;
  register(stub, client);
  if (!captured) throw new Error('registerResource was not called');
  return captured;
}

const user = { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' };

function buildTask(): TeamStormTask {
  return {
    id: 't1',
    key: 'TS-1',
    name: 'Test task',
    description: '',
    type: { id: 'type1', name: 'Task' },
    workflow: { id: 'wf1', name: 'Default' },
    status: { id: 's1', name: 'Open', category: { id: 'c1', name: 'Todo' } },
    createdDate: '2024-01-01T00:00:00Z',
    author: user,
    changedBy: user,
    originalEstimate: 0,
    timeSpent: 0,
    remainingEstimate: 0,
    storyPoints: 0,
    attributes: [],
    portfolios: [],
    workspace: {
      id: 'ws1',
      key: 'test-workspace',
      name: 'Test Workspace',
      description: '',
      author: user,
    },
  } as unknown as TeamStormTask;
}

function buildDocument(): TeamStormDocument {
  return {
    workspaceId: 'ws1',
    id: 'd1',
    key: 'DOC-1',
    name: 'Spec',
    documentUrl: 'http://example/doc',
    content: 'Hello content',
    createdAt: '2024-01-01T00:00:00Z',
    author: user,
    updatedAt: '2024-01-02T00:00:00Z',
    version: 3,
    versionUrl: 'http://example/doc/v3',
    labels: [],
    isBlocked: false,
    status: null,
  };
}

describe('teamstorm-task resource', () => {
  it('returns markdown identical to formatTaskMarkdown with text/markdown mimeType', async () => {
    const task = buildTask();
    const client = { getTask: vi.fn().mockResolvedValue(task) } as unknown as TeamStormClient;
    const { name, config, cb } = captureResource(registerTaskResource, client);

    expect(name).toBe('teamstorm-task');
    expect(config.mimeType).toBe('text/markdown');

    const result = await cb(
      new URL('teamstorm://TS/tasks/TS-1'),
      { workspace: 'TS', taskId: 'TS-1' },
      {}
    );
    expect(client.getTask).toHaveBeenCalledWith('TS-1', 'TS');
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toBe(formatTaskMarkdown(task));
  });

  it('throws (not empty result) when the client call rejects', async () => {
    const client = {
      getTask: vi.fn().mockRejectedValue(new Error('TeamStorm API error 404 at /tasks/x')),
    } as unknown as TeamStormClient;
    const { cb } = captureResource(registerTaskResource, client);

    await expect(
      cb(new URL('teamstorm://TS/tasks/nope'), { workspace: 'TS', taskId: 'nope' }, {})
    ).rejects.toBeInstanceOf(McpError);
  });
});

describe('teamstorm-document resource', () => {
  it('returns markdown identical to formatDocumentMarkdown(doc, true)', async () => {
    const doc = buildDocument();
    const client = { getDocument: vi.fn().mockResolvedValue(doc) } as unknown as TeamStormClient;
    const { name, config, cb } = captureResource(registerDocumentResource, client);

    expect(name).toBe('teamstorm-document');
    expect(config.mimeType).toBe('text/markdown');

    const result = await cb(
      new URL('teamstorm://TS/documents/DOC-1'),
      { workspace: 'TS', documentId: 'DOC-1' },
      {}
    );
    expect(client.getDocument).toHaveBeenCalledWith('DOC-1', 'TS');
    expect(result.contents[0].text).toBe(formatDocumentMarkdown(doc, true));
    expect(result.contents[0].text).toContain('Hello content'); // includeContent=true
  });

  it('throws when the client call rejects', async () => {
    const client = {
      getDocument: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as TeamStormClient;
    const { cb } = captureResource(registerDocumentResource, client);

    await expect(
      cb(new URL('teamstorm://TS/documents/nope'), { workspace: 'TS', documentId: 'nope' }, {})
    ).rejects.toBeInstanceOf(McpError);
  });
});

describe('teamstorm-folder-tree resource', () => {
  const folders: TeamStormFolderModel[] = [
    { id: 'root', name: 'Root', parentId: null },
    { id: 'child', name: 'Child', parentId: 'root' },
    { id: 'grandchild', name: 'Grandchild', parentId: 'child' },
    { id: 'other', name: 'Other', parentId: null },
  ];

  function clientWithFolders() {
    return {
      listFolders: vi.fn().mockResolvedValue({ items: folders, nextToken: null }),
    } as unknown as TeamStormClient;
  }

  it('renders only the subtree rooted at folderId', async () => {
    const client = clientWithFolders();
    const { name, config, cb } = captureResource(registerFolderTreeResource, client);

    expect(name).toBe('teamstorm-folder-tree');
    expect(config.mimeType).toBe('text/markdown');

    const result = await cb(
      new URL('teamstorm://TS/folders/child/tree'),
      { workspace: 'TS', folderId: 'child' },
      {}
    );
    const text = result.contents[0].text;
    expect(text).toContain('Child');
    expect(text).toContain('Grandchild');
    expect(text).not.toContain('Root');
    expect(text).not.toContain('Other');
  });

  it('throws McpError when the folderId is not present in the workspace', async () => {
    const client = clientWithFolders();
    const { cb } = captureResource(registerFolderTreeResource, client);

    await expect(
      cb(
        new URL('teamstorm://TS/folders/missing/tree'),
        { workspace: 'TS', folderId: 'missing' },
        {}
      )
    ).rejects.toBeInstanceOf(McpError);
  });

  it('throws when listFolders rejects', async () => {
    const client = {
      listFolders: vi.fn().mockRejectedValue(new Error('network')),
    } as unknown as TeamStormClient;
    const { cb } = captureResource(registerFolderTreeResource, client);

    await expect(
      cb(new URL('teamstorm://TS/folders/root/tree'), { workspace: 'TS', folderId: 'root' }, {})
    ).rejects.toBeInstanceOf(McpError);
  });
});
