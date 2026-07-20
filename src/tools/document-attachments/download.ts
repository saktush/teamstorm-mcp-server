import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import { saveDownloadFile } from '../../utils/download-store.js';
import { getPort } from '../../config.js';
import { DOWNLOAD_DIR } from '../attachments/download.js';

export const getDocumentAttachmentFileSchema = z
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
    attachmentId: z.string().describe('Идентификатор вложения'),
  })
  .strict();

export async function getDocumentAttachmentFile(
  client: TeamStormClient,
  args: z.infer<typeof getDocumentAttachmentFileSchema>,
  downloadDir: string = DOWNLOAD_DIR
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, documentId, attachmentId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_document_attachment_file', { workspace, documentId, attachmentId });
    const file = await client.downloadDocumentAttachmentBuffer(documentId, attachmentId, workspace);
    const fileName = file.fileName ?? `attachment-${attachmentId}`;
    const contentType = file.contentType ?? 'application/octet-stream';

    const { downloadId } = await saveDownloadFile(downloadDir, file.buffer, {
      fileName,
      contentType,
      size: file.buffer.length,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_document_attachment_file', true, duration);

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
    logError(error as Error, { workspace, documentId, attachmentId });
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

export function registerGetDocumentAttachmentFileTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_document_attachment_file',
    {
      title: 'Скачать файл вложения документа',
      description:
        'Скачать содержимое вложения документа (страницы). Файл сохраняется на сервере MCP и становится доступен по временной ссылке GET /download/:id (см. текст ответа для точной команды). Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getDocumentAttachmentFileSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getDocumentAttachmentFileSchema>) =>
      getDocumentAttachmentFile(client, params)
  );
}
