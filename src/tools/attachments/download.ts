import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as os from 'os';
import * as path from 'path';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import { saveDownloadFile } from '../../utils/download-store.js';
import { getPort } from '../../config.js';

// Mirrors UPLOAD_DIR in index.ts / oob-upload.ts — same os.tmpdir()-based, locally-defined
// constant pattern already used for the upload side of this OOB flow.
export const DOWNLOAD_DIR = path.join(os.tmpdir(), 'teamstorm-downloads');

export const getTaskAttachmentFileSchema = z
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

export async function getTaskAttachmentFile(
  client: TeamStormClient,
  args: z.infer<typeof getTaskAttachmentFileSchema>,
  downloadDir: string = DOWNLOAD_DIR
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
    logRequest('teamstorm_get_task_attachment_file', { workspace, taskId, attachmentId });
    const file = await client.downloadTaskAttachmentBuffer(taskId, attachmentId, workspace);
    const fileName = file.fileName ?? `attachment-${attachmentId}`;
    const contentType = file.contentType ?? 'application/octet-stream';

    const { downloadId } = await saveDownloadFile(downloadDir, file.buffer, {
      fileName,
      contentType,
      size: file.buffer.length,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_task_attachment_file', true, duration);

    const text =
      `✅ Файл готов к скачиванию: **${fileName}** (${formatBytes(file.buffer.length)})\n\n` +
      `Выполните HTTP GET на MCP-сервере, чтобы получить содержимое файла:\n\n` +
      `  curl -H "Authorization: PrivateToken <TEAMSTORM_API_TOKEN>" \\\n` +
      `    -o "${fileName}" \\\n` +
      `    http://<mcp-server-host>:${getPort()}/download/${downloadId}\n\n` +
      `downloadId: ${downloadId}\n` +
      `Ограничения: файл живёт на сервере 1 час, rate limit 10 скачиваний в минуту.`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: { downloadId, fileName, contentType, size: file.buffer.length },
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId, attachmentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при скачивании вложения: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetTaskAttachmentFileTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task_attachment_file',
    {
      title: 'Скачать файл вложения задачи',
      description:
        'Скачать содержимое вложения задачи. Файл сохраняется на сервере MCP и становится доступен по временной ссылке GET /download/:id (см. текст ответа для точной команды). Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getTaskAttachmentFileSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getTaskAttachmentFileSchema>) => getTaskAttachmentFile(client, params)
  );
}
