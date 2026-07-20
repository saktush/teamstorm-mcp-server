import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import type { TeamStormAttachmentListResponse, TeamStormAttachment } from '../../client/types.js';

export const listDocumentAttachmentsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    documentId: z.string().describe('Ключ или идентификатор документа (страницы)'),
  })
  .strict();

export async function listDocumentAttachments(
  client: TeamStormClient,
  args: z.infer<typeof listDocumentAttachmentsSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, documentId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_document_attachments', { workspace, documentId });
    const response: TeamStormAttachmentListResponse = await client.listDocumentAttachments(
      documentId,
      workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_document_attachments', true, duration);

    if (response.items.length === 0) {
      return {
        content: [{ type: 'text', text: `У документа ${documentId} нет вложений.` }],
      };
    }

    const attachmentsText = response.items
      .map(
        (att: TeamStormAttachment, index: number) =>
          `**${index + 1}. ${att.name}**\n` +
          `   🆔 Attachment ID: ${att.attachmentId}\n` +
          `   📁 File ID: ${att.fileId}\n` +
          `   🏷️ Тип: ${att.type}\n` +
          `   📦 Размер: ${formatBytes(att.size)}\n` +
          `   👤 Добавил: ${att.createdBy.displayName}\n` +
          `   📅 Дата: ${new Date(att.createdAt).toLocaleString('ru-RU')}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `📎 Вложения документа ${documentId} (${response.items.length} шт.):\n\n${attachmentsText}`,
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении вложений: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListDocumentAttachmentsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_document_attachments',
    {
      title: 'Получить вложения документа',
      description:
        'Получить список вложений документа (страницы). Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listDocumentAttachmentsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listDocumentAttachmentsSchema>) =>
      listDocumentAttachments(client, params)
  );
}
