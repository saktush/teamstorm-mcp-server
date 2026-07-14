import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listDocumentStatusesSchema = z
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

export async function listDocumentStatuses(
  client: TeamStormClient,
  params: z.infer<typeof listDocumentStatusesSchema>
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
    logRequest('teamstorm_list_document_statuses', { workspace });
    const result = await client.listDocumentStatuses(workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_document_statuses', true, duration);

    if (result.items.length === 0) {
      return {
        content: [{ type: 'text', text: 'Статусы документов не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Статусы документов (${result.items.length})\n`);
    for (const status of result.items) {
      lines.push(`- **${status.name}** — \`${status.id}\``);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { items: result.items, count: result.items.length },
    };
  } catch (error) {
    logError(error as Error, { workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении статусов документов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListDocumentStatusesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_document_statuses',
    {
      title: 'Статусы документов',
      description:
        'Получить список доступных статусов документов в пространстве TeamStorm. ID статуса используется в teamstorm_update_document.',
      inputSchema: listDocumentStatusesSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => listDocumentStatuses(client, params)
  );
}
