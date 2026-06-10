import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormUpdatedTaskListResponse, TeamStormUpdatedTask } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listUpdatedTasksSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    changedFromDate: z
      .string()
      .describe('Начальная дата в формате ISO 8601 (например, "2025-01-01")'),
    changedToDate: z
      .string()
      .optional()
      .describe('Конечная дата в формате ISO 8601 (например, "2025-12-31T23:59:59")'),
    fromToken: z.string().optional().describe('Токен для пагинации'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe('Максимальное количество задач на странице (по умолчанию: 50)'),
  })
  .strict();

export function registerListUpdatedTasksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_updated_tasks',
    {
      title: 'Получить изменённые задачи',
      description:
        'Получить список задач, изменённых за указанный период. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listUpdatedTasksSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listUpdatedTasksSchema>) => listUpdatedTasks(client, params)
  );
}

export async function listUpdatedTasks(
  client: TeamStormClient,
  args: z.infer<typeof listUpdatedTasksSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  try {
    logRequest('teamstorm_list_updated_tasks', args);
    const { workspace, apiUrl } = args;

    if (apiUrl) {
      client.setBaseUrl(apiUrl);
    }

    const response: TeamStormUpdatedTaskListResponse = await client.listUpdatedTasks({
      changedFromDate: args.changedFromDate,
      changedToDate: args.changedToDate,
      fromToken: args.fromToken,
      maxItemsCount: args.maxItemsCount,
      workspace: args.workspace,
    });
    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_updated_tasks', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `За указанный период с ${args.changedFromDate}${args.changedToDate ? ` по ${args.changedToDate}` : ''} изменений не найдено.`,
          },
        ],
      };
    }

    const tasksText = response.items
      .map(
        (task: TeamStormUpdatedTask, index: number) =>
          `**${index + 1}. ${task.key}: ${task.name}**\n` +
          `   📊 Статус: ${task.status.name}\n` +
          `   🕐 Дата изменения: ${new Date(task.changedDate).toLocaleString('ru-RU')}`
      )
      .join('\n\n');

    let paginationInfo = '';
    if (response.nextToken) {
      paginationInfo = `\n\n⚠️ Есть ещё результаты. Используйте параметр fromToken="${response.nextToken}" для загрузки следующей страницы.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔄 Измененные задачи с ${args.changedFromDate}${args.changedToDate ? ` по ${args.changedToDate}` : ''} (${response.items.length} шт.):\n\n${tasksText}${paginationInfo}`,
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace: args.workspace, changedFromDate: args.changedFromDate });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении изменённых задач: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
