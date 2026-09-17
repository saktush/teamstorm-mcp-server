import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormUpdatedTaskListResponse, TeamStormUpdatedTask } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatDateTime } from '../../utils/dates.js';
import { OUTPUT_PARAMS_SHAPE, buildListResult } from '../../utils/output.js';
import {
  projectTask,
  TASK_FIELD_NAMES,
  TASK_DEFAULT_FIELDS,
  TASK_IDENTITY_FIELDS,
} from '../../utils/task-projection.js';

const baseListUpdatedTasksSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    changedFromDate: z
      .string()
      .describe(
        'Начальная дата диапазона изменений задач в формате ISO 8601 (например, "2025-01-01")'
      ),
    changedToDate: z
      .string()
      .optional()
      .describe(
        'Конечная дата диапазона изменений задач в формате ISO 8601 (например, "2025-12-31T23:59:59")'
      ),
    fromToken: z
      .string()
      .optional()
      .describe(
        'Курсор страницы API: передайте nextToken предыдущего ответа для получения следующей страницы'
      ),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe(
        'Максимальное количество задач на странице (по умолчанию: 50; API допускает от 1 до 1000)'
      ),
  })
  .strict();

export const listUpdatedTasksSchema = baseListUpdatedTasksSchema.extend(OUTPUT_PARAMS_SHAPE);

export function registerListUpdatedTasksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_tasks_list_updated',
    {
      title: 'Получить изменённые задачи',
      description:
        'Получить список задач, изменённых за указанный период. Параметр workspace обязателен: передайте ключ или ID пространства.',
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
    logRequest('teamstorm_tasks_list_updated', args);
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
    logResponse('teamstorm_tasks_list_updated', true, duration);

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

    return buildListResult<TeamStormUpdatedTask>({
      items: response.items,
      nextToken: response.nextToken,
      format: args.format,
      fields: args.fields,
      maxItems: args.maxItems,
      descriptionMaxChars: args.descriptionMaxChars,
      allowedFields: TASK_FIELD_NAMES,
      defaultFields: TASK_DEFAULT_FIELDS,
      identityFields: TASK_IDENTITY_FIELDS,
      project: projectTask,
      renderMarkdown: (rows, meta) => {
        const tasksText = rows
          .map((task, index) => {
            // API отдаёт `changeDate` (без "d"). Терпимо читаем и старое имя на случай,
            // если инстанс окажется другой версии.
            const changed = task.changeDate ?? (task as { changedDate?: string }).changedDate;
            return (
              `**${index + 1}. ${task.key}: ${task.name}**\n` +
              `   📊 Статус: ${task.status?.name || 'Без статуса'}\n` +
              `   🕐 Дата изменения: ${formatDateTime(changed)}`
            );
          })
          .join('\n\n');
        const period = `с ${args.changedFromDate}${args.changedToDate ? ` по ${args.changedToDate}` : ''}`;
        return `🔄 Измененные задачи ${period} (${meta.returned} шт.):\n\n${tasksText}`;
      },
    });
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
