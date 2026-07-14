import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

export const listFoldersSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().optional().describe('Фильтр по названию папки (вхождение подстроки)'),
    parentId: z
      .string()
      .optional()
      .describe('Фильтр по ID родительской папки (UUID). Не указывайте для корневых папок.'),
    fromToken: z.string().optional().describe('Токен пагинации для получения следующей страницы'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe('Максимальное количество папок на странице (по умолчанию: 50, макс: 1000)'),
  })
  .strict();

export async function listFolders(
  client: TeamStormClient,
  params: z.infer<typeof listFoldersSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, ...rest } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_folders', { workspace, ...rest });
    const result = await client.listFolders({ workspace, ...rest });
    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_folders', true, duration);
    logger.info({ count: result.items.length, durationMs: duration }, 'Folders retrieved');

    if (result.items.length === 0) {
      return {
        content: [{ type: 'text', text: 'Папки не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Папки TeamStorm (${result.items.length})\n`);

    for (const folder of result.items) {
      lines.push(`**${folder.name}**`);
      lines.push(`- ID: \`${folder.id}\``);
      if (folder.parentId) lines.push(`- Родитель: \`${folder.parentId}\``);
      if (folder.description) lines.push(`- Описание: ${folder.description}`);
      lines.push('');
    }

    if (result.nextToken) {
      lines.push(`📄 Следующая страница: \`fromToken=${result.nextToken}\``);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        items: result.items,
        count: result.items.length,
        nextToken: result.nextToken ?? null,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace, ...rest });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка папок: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListFoldersTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_folders',
    {
      title: 'Список папок пространства',
      description:
        'Получить список папок в пространстве TeamStorm. Поддерживает фильтрацию по названию и родительской папке, а также пагинацию.',
      inputSchema: listFoldersSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => listFolders(client, params)
  );
}
