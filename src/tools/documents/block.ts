import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatDocumentMarkdown } from '../../utils/formatters.js';

export const blockDocumentSchema = z
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

export async function blockDocument(
  client: TeamStormClient,
  params: z.infer<typeof blockDocumentSchema>
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
    logRequest('teamstorm_documents_block', { workspace, documentId });
    const doc = await client.blockDocument(documentId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_documents_block', true, duration);

    const text = `🔒 Документ заблокирован для редактирования\n\n${formatDocumentMarkdown(doc)}`;

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
          text: `❌ Ошибка при блокировке документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerBlockDocumentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_documents_block',
    {
      title: 'Заблокировать документ',
      description:
        'Заблокировать документ TeamStorm от редактирования. Разблокировка — teamstorm_documents_unblock.',
      inputSchema: blockDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => blockDocument(client, params)
  );
}
