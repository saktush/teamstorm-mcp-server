import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatDocumentMarkdown } from '../../utils/formatters.js';

export const updateDocumentSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    documentId: z.string().describe('Ключ или идентификатор документа (UUID)'),
    status: z
      .string()
      .nullable()
      .describe(
        'ID нового статуса документа (см. teamstorm_document_statuses_list). Передайте null, чтобы снять статус.'
      ),
  })
  .strict();

export async function updateDocument(
  client: TeamStormClient,
  params: z.infer<typeof updateDocumentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId, status } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_documents_update', { workspace, documentId, status });
    const doc = await client.patchDocument(documentId, { status }, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_documents_update', true, duration);

    const text = `✅ Документ обновлён\n\n${formatDocumentMarkdown(doc)}`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: doc as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при обновлении документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdateDocumentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_documents_update',
    {
      title: 'Обновить статус документа',
      description:
        'Изменить статус документа TeamStorm. Публичный API поддерживает изменение только поля status — название, содержимое и метки через этот метод менять нельзя.',
      inputSchema: updateDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updateDocument(client, params)
  );
}
