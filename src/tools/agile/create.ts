import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const createAgileBoardSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    folderId: z.string().describe('UUID папки, для которой включается Agile (спринты/беклог)'),
    estimatesType: z
      .enum(['EstimatesInTime', 'EstimatesInStoryPoints'])
      .describe('Тип оценки задач в спринтах этого борда: время (EstimatesInTime) или story points (EstimatesInStoryPoints)'),
  })
  .strict();
// Примечание: API создания Agile-борда не принимает name (additionalProperties: false
// в CreateAgileRequestBody) — сервер выводит его сам (по всей видимости, из имени папки),
// хотя в ответе (AgileModel) name обязателен. Не добавляйте name в схему.

export async function createAgileBoard(
  client: TeamStormClient,
  params: z.infer<typeof createAgileBoardSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, folderId, estimatesType } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_agile_boards_create', { workspace, folderId, estimatesType });
    const board = await client.createAgile({ folderId, estimatesType }, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_agile_boards_create', true, duration);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Agile-борд «${board.name}» создан для папки \`${board.folderId}\` (ID: \`${board.id}\`)`,
        },
      ],
      structuredContent: board as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, folderId, estimatesType });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании Agile-борда: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateAgileBoardTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_agile_boards_create',
    {
      title: 'Создать Agile-борд',
      description:
        'Включить Agile (спринты и беклог) для папки TeamStorm: указывается folderId и тип оценки задач (время или story points). Название борда сервер назначает сам.',
      inputSchema: createAgileBoardSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof createAgileBoardSchema>) => createAgileBoard(client, params)
  );
}
