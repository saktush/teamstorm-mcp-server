import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormComment } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const createDocumentCommentSchema = z
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
    text: z
      .string()
      .max(65000)
      .describe('Текст комментария (поддерживает HTML-разметку, макс. 65000 символов)'),
  })
  .strict();

export async function createDocumentComment(
  client: TeamStormClient,
  params: z.infer<typeof createDocumentCommentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId, text } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_create_document_comment', { workspace, documentId });
    const comment: TeamStormComment = await client.createDocumentComment(
      documentId,
      text,
      workspace
    );
    const duration = Date.now() - startTime;
    logResponse('teamstorm_create_document_comment', true, duration);

    const message =
      `✅ Комментарий добавлен к документу \`${documentId}\`\n\n` +
      `🆔 ID комментария: ${comment.id}\n` +
      `👤 Автор: ${comment.author.displayName} (${comment.author.username})\n` +
      `📅 Создан: ${new Date(comment.createdAt).toLocaleString('ru-RU')}`;

    return {
      content: [{ type: 'text', text: message }],
      structuredContent: comment as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при добавлении комментария к документу: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateDocumentCommentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_create_document_comment',
    {
      title: 'Добавить комментарий к документу',
      description: 'Добавить новый комментарий к документу TeamStorm.',
      inputSchema: createDocumentCommentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => createDocumentComment(client, params)
  );
}
