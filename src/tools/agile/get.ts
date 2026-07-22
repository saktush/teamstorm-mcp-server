import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormAgile } from '../../client/types.js';

const ESTIMATES_TYPE_LABELS: Record<string, string> = {
  EstimatesInTime: 'в часах',
  EstimatesInStoryPoints: 'в story points',
};

export const getAgileBoardSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    agileId: z.string().describe('UUID Agile-борда'),
  })
  .strict();

function formatAgileBoardMarkdown(board: TeamStormAgile): string {
  const lines: string[] = [];
  lines.push(`# ${board.name}`);
  lines.push('');
  lines.push(`**ID**: \`${board.id}\``);
  lines.push(`**Папка**: \`${board.folderId}\``);
  lines.push(`**Оценки**: ${ESTIMATES_TYPE_LABELS[board.estimatesType] ?? board.estimatesType}`);
  return lines.join('\n');
}

export async function getAgileBoard(
  client: TeamStormClient,
  params: z.infer<typeof getAgileBoardSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, agileId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_agile_boards_get', { workspace, agileId });
    const board = await client.getAgile(agileId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_agile_boards_get', true, duration);

    return {
      content: [{ type: 'text', text: formatAgileBoardMarkdown(board) }],
      structuredContent: board as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, agileId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении Agile-борда: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetAgileBoardTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_agile_boards_get',
    {
      title: 'Получить Agile-борд',
      description: 'Получить Agile-борд TeamStorm по UUID: название, папка, тип оценки задач.',
      inputSchema: getAgileBoardSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getAgileBoardSchema>) => getAgileBoard(client, params)
  );
}
