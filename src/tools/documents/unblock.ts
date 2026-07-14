import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatDocumentMarkdown } from '../../utils/formatters.js';

export const unblockDocumentSchema = z
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

export async function unblockDocument(
  client: TeamStormClient,
  params: z.infer<typeof unblockDocumentSchema>
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
    logRequest('teamstorm_unblock_document', { workspace, documentId });
    const doc = await client.unblockDocument(documentId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_unblock_document', true, duration);

    const text = `🔓 Документ разблокирован\n\n${formatDocumentMarkdown(doc)}`;

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
          text: `❌ Ошибка при разблокировке документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUnblockDocumentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_unblock_document',
    {
      title: 'Разблокировать документ',
      description: 'Снять блокировку редактирования с документа TeamStorm.',
      inputSchema: unblockDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => unblockDocument(client, params)
  );
}
