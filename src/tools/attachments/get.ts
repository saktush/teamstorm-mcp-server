import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import type { TeamStormAttachment } from '../../client/types.js';

export const getTaskAttachmentSchema = z
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
    attachmentId: z.string().describe('Идентификатор вложения'),
  })
  .strict();

export function registerGetTaskAttachmentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task_attachment',
    {
      title: 'Получить информацию о вложении',
      description:
        'Получить метаданные конкретного вложения. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getTaskAttachmentSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getTaskAttachmentSchema>) => getTaskAttachment(client, params)
  );
}

export async function getTaskAttachment(
  client: TeamStormClient,
  args: z.infer<typeof getTaskAttachmentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, attachmentId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_task_attachment', { workspace, taskId, attachmentId });
    const attachment: TeamStormAttachment = await client.getTaskAttachment(
      args.taskId,
      args.attachmentId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_task_attachment', true, duration);

    const text =
      `📄 **${attachment.name}**\n\n` +
      `🆔 Attachment ID: ${attachment.attachmentId}\n` +
      `📁 File ID: ${attachment.fileId}\n` +
      `🏷️ MIME-тип: ${attachment.type}\n` +
      `📦 Размер: ${formatBytes(attachment.size)}\n` +
      `👤 Автор: ${attachment.createdBy.displayName} (${attachment.createdBy.username})\n` +
      `📅 Дата загрузки: ${new Date(attachment.createdAt).toLocaleString('ru-RU')}`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      structuredContent: attachment as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId, attachmentId: args.attachmentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении вложения: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
