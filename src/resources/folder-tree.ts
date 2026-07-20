import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TeamStormClient } from '../client/teamstorm.js';
import { TeamStormFolderModel } from '../client/types.js';
import { buildTree, renderTree, FolderTreeNode } from '../tools/folders/get-tree.js';
import { logRequest, logResponse, logError } from '../utils/logger.js';
import { toMcpError } from './to-mcp-error.js';

const RESOURCE_NAME = 'teamstorm-folder-tree';
const URI_TEMPLATE = 'teamstorm://{workspace}/folders/{folderId}/tree';

/** Поиск узла дерева по ID (DFS). Нужен, чтобы отдать поддерево, начинающееся с folderId. */
function findNode(nodes: FolderTreeNode[], id: string): FolderTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

export function registerFolderTreeResource(server: McpServer, client: TeamStormClient) {
  server.registerResource(
    RESOURCE_NAME,
    new ResourceTemplate(URI_TEMPLATE, { list: undefined }),
    {
      title: 'Дерево папок TeamStorm',
      description:
        'Поддерево папок (Markdown), начинающееся с folderId, по URI teamstorm://{workspace}/folders/{folderId}/tree',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const workspace = String(variables.workspace);
      const folderId = String(variables.folderId);
      const startTime = Date.now();
      try {
        logRequest(`resource:${RESOURCE_NAME}`, { workspace, folderId });

        const allFolders: TeamStormFolderModel[] = [];
        let nextToken: string | null | undefined = undefined;
        do {
          const page = await client.listFolders({
            workspace,
            maxItemsCount: 1000,
            fromToken: nextToken ?? undefined,
          });
          allFolders.push(...page.items);
          nextToken = page.nextToken;
        } while (nextToken);

        const root = findNode(buildTree(allFolders), folderId);
        if (!root) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Папка ${folderId} не найдена в пространстве ${workspace}`
          );
        }

        logResponse(`resource:${RESOURCE_NAME}`, true, Date.now() - startTime);
        const lines = [`# Дерево папок: ${root.name}\n`, ...renderTree([root])];
        return {
          contents: [{ uri: uri.href, mimeType: 'text/markdown', text: lines.join('\n') }],
        };
      } catch (error) {
        logError(error as Error, { workspace, folderId });
        throw toMcpError(error, `Не удалось построить дерево папки ${folderId}`);
      }
    }
  );
}
