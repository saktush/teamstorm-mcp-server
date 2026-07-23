import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatDocumentMarkdown } from '../../utils/formatters.js';

export const getDocumentSchema = z
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
  })
  .strict();

export async function getDocument(
  client: TeamStormClient,
  params: z.infer<typeof getDocumentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_documents_get', { workspace, documentId });
    const doc = await client.getDocument(documentId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_documents_get', true, duration);

    return {
      content: [{ type: 'text', text: formatDocumentMarkdown(doc, true) }],
      structuredContent: doc as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetDocumentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_documents_get',
    {
      title: 'Получить документ',
      description:
        'Получить документ TeamStorm по идентификатору, включая содержимое, статус, метки и информацию об авторе.',
      inputSchema: getDocumentSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getDocument(client, params)
  );
}
