import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getDocumentStatusSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    statusId: z.string().describe('Идентификатор статуса документа (UUID)'),
  })
  .strict();

export async function getDocumentStatus(
  client: TeamStormClient,
  params: z.infer<typeof getDocumentStatusSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, statusId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_document_status', { workspace, statusId });
    const status = await client.getDocumentStatus(statusId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_document_status', true, duration);

    const text = `# Статус документа\n\n- Название: **${status.name}**\n- ID: \`${status.id}\``;

    return {
      content: [{ type: 'text', text }],
      structuredContent: status as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, statusId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении статуса документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetDocumentStatusTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_document_status',
    {
      title: 'Получить статус документа',
      description: 'Получить статус документа TeamStorm по идентификатору.',
      inputSchema: getDocumentStatusSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getDocumentStatus(client, params)
  );
}
