import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { TeamStormFolderModel } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const findFolderSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z
      .string()
      .optional()
      .describe('Поиск по названию папки (вхождение подстроки, любой уровень вложенности)'),
    id: z.string().optional().describe('Найти папку по точному UUID'),
  })
  .strict();

async function resolveParentPath(
  client: TeamStormClient,
  folder: TeamStormFolderModel,
  workspace: string
): Promise<string> {
  const parts: string[] = [folder.name];
  let current = folder;

  while (current.parentId) {
    try {
      current = await client.getFolder(current.parentId, workspace);
      parts.unshift(current.name);
    } catch {
      parts.unshift('…');
      break;
    }
  }

  return parts.join(' / ');
}

export async function findFolder(
  client: TeamStormClient,
  params: z.infer<typeof findFolderSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, name, id } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  if (!name && !id) {
    return {
      content: [{ type: 'text', text: '❌ Укажите хотя бы один параметр: `name` или `id`.' }],
      isError: true,
    };
  }

  try {
    logRequest('teamstorm_folders_find', { workspace, name, id });

    let matches: TeamStormFolderModel[] = [];

    if (id) {
      const folder = await client.getFolder(id, workspace);
      matches = [folder];
    } else {
      const result = await client.listFolders({ workspace, name });
      matches = result.items;
    }

    const duration = Date.now() - startTime;
    logResponse('teamstorm_folders_find', true, duration);

    if (matches.length === 0) {
      return {
        content: [{ type: 'text', text: `Папки с ${id ? `ID \`${id}\`` : `названием «${name}»`} не найдены.` }],
        structuredContent: { matches: [], count: 0 },
      };
    }

    const resolved = await Promise.all(
      matches.map(async (folder) => ({
        ...folder,
        path: await resolveParentPath(client, folder, workspace),
      }))
    );

    const lines: string[] = [];
    lines.push(`# Найдено папок: ${resolved.length}\n`);

    for (const folder of resolved) {
      lines.push(`**${folder.path}**`);
      lines.push(`- ID: \`${folder.id}\``);
      if (folder.description) lines.push(`- Описание: ${folder.description}`);
      lines.push('');
      lines.push(
        `  💡 Задачи в папке: \`teamstorm_tasks_list\` с \`parent=${folder.id}\``
      );
      lines.push('');
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { matches: resolved, count: resolved.length },
    };
  } catch (error) {
    logError(error as Error, { workspace, name, id });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при поиске папки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerFindFolderTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_folders_find',
    {
      title: 'Найти папку по названию или ID',
      description:
        'Найти папку TeamStorm по названию (вхождение подстроки, любой уровень вложенности) или по точному UUID. Возвращает полный путь (breadcrumb) для каждой найденной папки и подсказку для получения задач.',
      inputSchema: findFolderSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => findFolder(client, params)
  );
}
