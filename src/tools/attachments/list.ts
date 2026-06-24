import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import type { TeamStormAttachmentListResponse, TeamStormAttachment } from '../../client/types.js';

export const ListTaskAttachmentsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
  })
  .strict();

export function registerListTaskAttachmentsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_task_attachments',
    {
      title: 'Получить вложения задачи',
      description:
        'Получить список вложений задачи. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: ListTaskAttachmentsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListTaskAttachmentsSchema>) => listTaskAttachments(client, params)
  );
}

export async function listTaskAttachments(
  client: TeamStormClient,
  args: z.infer<typeof ListTaskAttachmentsSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_task_attachments', { workspace, taskId });
    const response: TeamStormAttachmentListResponse = await client.listTaskAttachments(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_task_attachments', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У задачи ${args.taskId} нет вложений.`,
          },
        ],
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
          text: `📎 Вложения задачи ${args.taskId} (${response.items.length} шт.):\n\n${attachmentsText}`,
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId });
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
