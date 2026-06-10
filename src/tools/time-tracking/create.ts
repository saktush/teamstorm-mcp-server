import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatDuration } from '../../utils/formatters.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const createTimeEntrySchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или ID задачи (например, "TS-1007")'),
    duration: z
      .number()
      .int()
      .positive()
      .describe('Затраченное время в секундах (например, 3600 = 1 час)'),
    startDate: z
      .string()
      .describe('Дата и время списания в ISO 8601 (например, "2026-06-06T12:00:00Z")'),
    description: z.string().optional().describe('Комментарий к списанию (опционально)'),
    entryTypeId: z
      .string()
      .optional()
      .describe('ID типа работ (опционально). Оставьте пустым если тип не требуется.'),
  })
  .strict();

export function registerCreateTimeEntryTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_create_time_entry',
    {
      title: 'Добавить списание времени',
      description:
        'Добавить списание времени (трудозатраты) к задаче. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: createTimeEntrySchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params: z.infer<typeof createTimeEntrySchema>) => createTimeEntry(client, params)
  );
}

export async function createTimeEntry(
  client: TeamStormClient,
  args: z.infer<typeof createTimeEntrySchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, apiUrl, ...restArgs } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_create_time_entry', { workspace, taskId, ...restArgs });
    const result = await client.createTimeEntry({
      taskId,
      duration: args.duration,
      startDate: args.startDate,
      description: args.description,
      entryTypeId: args.entryTypeId,
      workspace,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_create_time_entry', true, duration);

    console.error(`✅ Time entry created for ${taskId} in ${duration}ms`);

    const timeStr = formatDuration(args.duration);

    const text =
      `✅ Списание времени добавлено к задаче ${taskId}\n\n` +
      `🆔 ID списания: ${result.entryId}\n` +
      `⏱️ Время: ${timeStr} (${args.duration} сек)\n` +
      `📅 Дата: ${new Date(args.startDate).toLocaleString('ru-RU')}` +
      (args.description ? `\n💬 Комментарий: ${args.description}` : '');

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при добавлении списания времени: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}
