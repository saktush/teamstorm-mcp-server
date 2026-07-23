import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import type { TeamStormAttachmentVersion } from '../../client/types.js';

export const getAttachmentVersionSchema = z
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
    version: z.number().describe('Номер версии вложения'),
  })
  .strict();

export function registerGetAttachmentVersionTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_attachments_get_version',
    {
      title: 'Получить версию вложения',
      description:
        'Получить метаданные конкретной версии вложения. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getAttachmentVersionSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getAttachmentVersionSchema>) =>
      getAttachmentVersion(client, params)
  );
}

export async function getAttachmentVersion(
  client: TeamStormClient,
  args: z.infer<typeof getAttachmentVersionSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, attachmentId, version: versionNum, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_attachments_get_version', {
      workspace,
      taskId,
      attachmentId,
      version: versionNum,
    });
    const version: TeamStormAttachmentVersion = await client.getAttachmentVersion(
      args.taskId,
      args.attachmentId,
      args.version,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_attachments_get_version', true, duration);

    const text =
      `📄 **${version.name}** (версия ${version.version})\n\n` +
      `🆔 Attachment ID: ${version.attachmentId}\n` +
      `📁 File ID: ${version.fileId}\n` +
      `🏷️ MIME-тип: ${version.type}\n` +
      `📦 Размер: ${formatBytes(version.size)}\n` +
      `👤 Автор: ${version.createdBy.displayName}\n` +
      `📅 Дата: ${new Date(version.createdAt).toLocaleString('ru-RU')}`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      structuredContent: version as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId, attachmentId: args.attachmentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении версии вложения: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
