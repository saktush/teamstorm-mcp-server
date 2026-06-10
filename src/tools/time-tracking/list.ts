import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatDuration } from '../../utils/formatters.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listTimeEntriesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или ID задачи (например, "TS-1007")'),
  })
  .strict();

export function registerListTimeEntriesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_time_entries',
    {
      title: 'Получить списания времени задачи',
      description:
        'Получить список записей списания времени (трудозатрат) для задачи. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listTimeEntriesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listTimeEntriesSchema>) => listTimeEntries(client, params)
  );
}

export async function listTimeEntries(
  client: TeamStormClient,
  args: z.infer<typeof listTimeEntriesSchema>
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
    logRequest('teamstorm_list_time_entries', { workspace, taskId });
    const result = await client.listTimeEntries({
      taskId,
      workspace,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_time_entries', true, duration);

    console.error(`✅ Retrieved ${result.length} time entries for ${args.taskId} in ${duration}ms`);

    if (result.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У задачи ${args.taskId} нет записей списания времени.`,
          },
        ],
      };
    }

    const entriesText = result
      .map(
        (entry, index: number) =>
          `**${index + 1}. ${new Date(entry.startDate).toLocaleDateString('ru-RU')}**\n` +
          `⏱️ Время: ${formatDuration(entry.duration)}\n` +
          `📅 Создано: ${new Date(entry.creationDate).toLocaleString('ru-RU')}\n` +
          `👤 Автор: ${entry.user.displayName}\n` +
          (entry.description ? `💬 ${entry.description}\n` : '') +
          (entry.entryType ? `🏷️ Тип: ${entry.entryType.typeName}\n` : '') +
          `🆔 ID: ${entry.entryId}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `📝 Записи списания времени для ${args.taskId} (${result.length} шт.):\n\n${entriesText}`,
        },
      ],
      structuredContent: { entries: result, count: result.length },
    };
  } catch (error) {
    logError(error as Error, { workspace: args.workspace, taskId: args.taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении записей списания времени: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}
