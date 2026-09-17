import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatTaskListMarkdown } from '../../utils/formatters.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';
import { OUTPUT_PARAMS_SHAPE, buildListResult } from '../../utils/output.js';
import {
  projectTask,
  TASK_FIELD_NAMES,
  TASK_DEFAULT_FIELDS,
  TASK_IDENTITY_FIELDS,
} from '../../utils/task-projection.js';
import type { TeamStormTask } from '../../client/types.js';

const BaseListTasksSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    type: z.string().optional().describe('Фильтр по типу задачи (название или ID)'),
    parent: z.string().optional().describe('Фильтр по родительской задаче или папке (ключ или ID)'),
    sprintId: z.string().optional().describe('Фильтр по ID спринта'),
    name: z.string().optional().describe('Поиск по названию (вхождение подстроки)'),
    assignee: z.string().optional().describe('Фильтр по исполнителю (логин или ID)'),
    author: z.string().optional().describe('Фильтр по автору (логин или ID)'),
    status: z.string().optional().describe('Фильтр по статусу (название или ID)'),
    statusCategory: z
      .string()
      .optional()
      .describe('Фильтр по категории статуса (см. teamstorm_status_categories_list)'),
    fromToken: z
      .string()
      .optional()
      .describe('Токен пагинации из nextToken предыдущего ответа для получения следующей страницы'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe(
        'Максимальное количество задач на странице (по умолчанию: 50; API допускает от 1 до 1000)'
      ),
  })
  .strict();

const ListTasksSchema = BaseListTasksSchema.extend(OUTPUT_PARAMS_SHAPE);

export async function listTasks(
  client: TeamStormClient,
  params: z.infer<typeof ListTasksSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  // format/fields/maxItems/descriptionMaxChars — параметры вывода, а не фильтры API.
  // Их обязательно нужно снять здесь, иначе они уедут в query-строку запроса.
  const {
    workspace,
    apiUrl,
    format,
    fields,
    maxItems,
    descriptionMaxChars,
    ...filteredParams
  } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_tasks_list', { workspace, ...filteredParams });
    const result = await client.listTasks({ ...filteredParams, workspace });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_tasks_list', true, duration);
    logger.info({ count: result.items.length, durationMs: duration }, 'Tasks retrieved');

    return buildListResult<TeamStormTask>({
      items: result.items,
      nextToken: result.nextToken,
      format,
      fields,
      maxItems,
      descriptionMaxChars,
      allowedFields: TASK_FIELD_NAMES,
      defaultFields: TASK_DEFAULT_FIELDS,
      identityFields: TASK_IDENTITY_FIELDS,
      project: projectTask,
      renderMarkdown: (rows) =>
        formatTaskListMarkdown({ ...result, items: rows, nextToken: result.nextToken }),
    });
  } catch (error) {
    logError(error as Error, { params: { workspace, ...filteredParams } });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка задач: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { ListTasksSchema as listTasksSchema };

export function registerListTasksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_tasks_list',
    {
      title: 'Получить список задач',
      description:
        'Получить список задач в пространстве TeamStorm с фильтрацией и пагинацией. Параметр workspace обязателен: передайте ключ или ID пространства.',
      inputSchema: ListTasksSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListTasksSchema>) => listTasks(client, params)
  );
}
