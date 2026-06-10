import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import type {
  TeamStormAttachmentVersionListResponse,
  TeamStormAttachmentVersion,
} from '../../client/types.js';

export const listAttachmentVersionsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
  })
  .strict();

export function registerListAttachmentVersionsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_attachment_versions',
    {
      title: 'Получить версии вложений',
      description:
        'Получить список всех версий вложений задачи. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listAttachmentVersionsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listAttachmentVersionsSchema>) =>
      listAttachmentVersions(client, params)
  );
}

export async function listAttachmentVersions(
  client: TeamStormClient,
  args: z.infer<typeof listAttachmentVersionsSchema>
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
    logRequest('teamstorm_list_attachment_versions', { workspace, taskId });
    const response: TeamStormAttachmentVersionListResponse = await client.listAttachmentVersions(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_attachment_versions', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У вложений задачи ${args.taskId} нет версий.`,
          },
        ],
      };
    }

    const versionsText = response.items
      .map(
        (ver: TeamStormAttachmentVersion, _index: number) =>
          `**Версия ${ver.version}** — ${ver.name}\n` +
          `   🆔 Attachment ID: ${ver.attachmentId}\n` +
          `   📁 File ID: ${ver.fileId}\n` +
          `   🏷️ Тип: ${ver.type}\n` +
          `   📦 Размер: ${formatBytes(ver.size)}\n` +
          `   👤 Автор: ${ver.createdBy.displayName}\n` +
          `   📅 Дата: ${new Date(ver.createdAt).toLocaleString('ru-RU')}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `🔄 Версии вложений задачи ${args.taskId} (${response.items.length} шт.):\n\n${versionsText}`,
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
          text: `❌ Ошибка при получении версий вложений: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
