import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { TeamStormFolderModel } from '../../client/types.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

export const getFolderTreeSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

export interface FolderTreeNode extends TeamStormFolderModel {
  children: FolderTreeNode[];
}

export function buildTree(folders: TeamStormFolderModel[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  const roots: FolderTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function renderTree(nodes: FolderTreeNode[], indent = 0): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);
  for (const node of nodes) {
    lines.push(`${prefix}📁 **${node.name}** \`${node.id}\``);
    if (node.children.length > 0) {
      lines.push(...renderTree(node.children, indent + 1));
    }
  }
  return lines;
}

export async function getFolderTree(
  client: TeamStormClient,
  params: z.infer<typeof getFolderTreeSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_folder_tree', { workspace });

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

    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_folder_tree', true, duration);
    logger.info({ total: allFolders.length, durationMs: duration }, 'Folder tree fetched');

    if (allFolders.length === 0) {
      return {
        content: [{ type: 'text', text: 'Папки не найдены.' }],
        structuredContent: { tree: [], totalCount: 0 },
      };
    }

    const tree = buildTree(allFolders);
    const lines: string[] = [];
    lines.push(`# Дерево папок TeamStorm (всего: ${allFolders.length})\n`);
    lines.push(...renderTree(tree));

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { tree, totalCount: allFolders.length },
    };
  } catch (error) {
    logError(error as Error, { workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при построении дерева папок: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetFolderTreeTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_folder_tree',
    {
      title: 'Дерево папок пространства',
      description:
        'Получить полную иерархию папок пространства TeamStorm в виде дерева за один запрос. Автоматически обходит все страницы пагинации.',
      inputSchema: getFolderTreeSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getFolderTree(client, params)
  );
}
