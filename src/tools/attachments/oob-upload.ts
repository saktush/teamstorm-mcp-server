import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormAttachment } from '../../client/types.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';
import { formatBytes } from '../../utils/formatters.js';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';

const UPLOAD_DIR = path.join(os.tmpdir(), 'teamstorm-uploads');

export const attachUploadedFileSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или ID задачи (например, "TS-1007")'),
    uploadId: z.string().describe('ID загруженного файла (получен от endpoint /upload)'),
    fileName: z
      .string()
      .optional()
      .describe(
        'Имя файла для вложения (переопределяет имя из загрузки). Используйте для файлов с не-ASCII символами.'
      ),
  })
  .strict();

export function registerAttachUploadedFileTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_attachments_attach_uploaded',
    {
      title: 'Загрузить файл и прикрепить к задаче',
      description: `Загрузить файл и прикрепить его к задаче TeamStorm.

Двухшаговый процесс:

ШАГ 1 — Загрузить файл на сервер через HTTP POST:
  curl -X POST http://<mcp-server-host>:<port>/upload \\
    -H "Authorization: PrivateToken <TEAMSTORM_API_TOKEN>" \\
    -F "file=@/путь/к/файлу.ext"

Или через любой HTTP-клиент с multipart/form-data (поле "file").
В ответе получите JSON с uploadId (UUID).

ШАГ 2 — Прикрепить файл к задаче:
  Вызовите этот инструмент с параметрами:
  - uploadId: ID из ответа шага 1
  - fileName: (опционально) переопределить имя файла

После успешного выполнения файл удаляется с диска сервера.
Ограничения: максимальный размер файла 50 MB, файл живёт на сервере 1 час.`,
      inputSchema: attachUploadedFileSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof attachUploadedFileSchema>) => attachUploadedFile(client, params)
  );
}

export async function attachUploadedFile(
  client: TeamStormClient,
  params: z.infer<typeof attachUploadedFileSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, uploadId, apiUrl } = params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uploadId)) {
    return { content: [{ type: 'text', text: '❌ Invalid uploadId format' }], isError: true };
  }

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    const metaPath = path.join(UPLOAD_DIR, uploadId + '.meta.json');
    logger.info({ metaPath, exists: fs.existsSync(metaPath) }, 'Looking for meta file');
    if (!fs.existsSync(metaPath)) {
      const allFiles = fs.readdirSync(UPLOAD_DIR);
      logger.error(
        { uploadId, allFiles, uploadDir: UPLOAD_DIR },
        'Meta file not found, listing directory'
      );
      return {
        content: [{ type: 'text', text: `❌ Загруженный файл не найден или истёк: ${uploadId}` }],
        isError: true,
      };
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    const entries = fs
      .readdirSync(UPLOAD_DIR)
      .filter((f) => f.startsWith(uploadId) && !f.endsWith('.meta.json'));
    if (entries.length === 0) {
      return {
        content: [{ type: 'text', text: `❌ Файл не найден на диске: ${uploadId}` }],
        isError: true,
      };
    }

    const filePath = path.join(UPLOAD_DIR, entries[0]);
    const buffer = await fsPromises.readFile(filePath);
    const name = params.fileName ?? meta.fileName;

    logRequest('teamstorm_attachments_attach_uploaded', {
      workspace,
      taskId,
      uploadId,
      fileName: name,
      fileSize: buffer.length,
    });

    const result = await client.uploadTaskAttachmentBuffer(taskId, workspace, buffer, name);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_attachments_attach_uploaded', true, duration);
    fs.unlinkSync(filePath);
    fs.unlinkSync(metaPath);

    const safeResult = {
      attachmentId: result.attachmentId,
      workspaceId: result.workspaceId,
      createdBy: typeof result.createdBy === 'object' ? result.createdBy : undefined,
      fileId: result.fileId,
      name: result.name,
      type: result.type,
      size: result.size,
      createdAt: result.createdAt,
    };

    return {
      content: [
        {
          type: 'text',
          text:
            `✅ Файл прикреплён к задаче ${taskId}!\n\n` +
            `📎 **${result.name}**\n` +
            `   🆔 Attachment ID: ${result.attachmentId}\n` +
            `   📁 File ID: ${result.fileId}\n` +
            `   🏷️ Тип: ${result.type}\n` +
            `   📦 Размер: ${formatBytes(result.size)}\n` +
            `   👤 Добавил: ${typeof result.createdBy === 'object' ? (result.createdBy?.displayName ?? 'N/A') : String(result.createdBy ?? 'N/A')}\n` +
            `   📅 Дата: ${new Date(result.createdAt).toLocaleString('ru-RU')}`,
        },
      ],
      structuredContent: safeResult as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId, uploadId });

    const metaPath2 = path.join(UPLOAD_DIR, uploadId + '.meta.json');
    const fileEntries = fs
      .readdirSync(UPLOAD_DIR)
      .filter((f) => f.startsWith(uploadId) && !f.endsWith('.meta.json'));
    for (const entry of fileEntries) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, entry));
      } catch {
        /* ignore */
      }
    }
    try {
      fs.unlinkSync(metaPath2);
    } catch {
      /* ignore */
    }

    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при загрузке файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}
