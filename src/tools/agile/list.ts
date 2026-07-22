import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormAgile } from '../../client/types.js';

const ESTIMATES_TYPE_LABELS: Record<string, string> = {
  EstimatesInTime: 'в часах',
  EstimatesInStoryPoints: 'в story points',
};

export const listAgileBoardsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    folderId: z
      .string()
      .optional()
      .describe('UUID папки — фильтр по конкретной папке. Без него вернутся все Agile-борды пространства.'),
  })
  .strict();

function formatAgileBoardsMarkdown(boards: TeamStormAgile[]): string {
  if (boards.length === 0) {
    return 'Agile-борды не найдены.';
  }
  const lines: string[] = [`# Agile-борды (${boards.length})`, ''];
  for (const board of boards) {
    lines.push(`## ${board.name}`);
    lines.push(`**ID**: \`${board.id}\``);
    lines.push(`**Папка**: \`${board.folderId}\``);
    lines.push(`**Оценки**: ${ESTIMATES_TYPE_LABELS[board.estimatesType] ?? board.estimatesType}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function listAgileBoards(
  client: TeamStormClient,
  params: z.infer<typeof listAgileBoardsSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, folderId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_agile_boards_list', { workspace, folderId });
    const boards = await client.listAgile(workspace, folderId);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_agile_boards_list', true, duration);

    return {
      content: [{ type: 'text', text: formatAgileBoardsMarkdown(boards) }],
      structuredContent: { items: boards },
    };
  } catch (error) {
    logError(error as Error, { workspace, folderId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка Agile-бордов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListAgileBoardsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_agile_boards_list',
    {
      title: 'Получить список Agile-бордов',
      description:
        'Получить список Agile-бордов пространства TeamStorm (настройки agile для папки: тип оценки — время/story points). Опционально фильтруется по folderId.',
      inputSchema: listAgileBoardsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listAgileBoardsSchema>) => listAgileBoards(client, params)
  );
}
