import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatTaskListMarkdown } from '../../utils/formatters.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

const ListTasksSchema = z
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
    parent: z.string().optional().describe('Фильтр по родительскому элементу'),
    sprintId: z.string().optional().describe('Фильтр по ID спринта'),
    name: z.string().optional().describe('Поиск по названию (вхождение подстроки)'),
    assignee: z.string().optional().describe('Фильтр по исполнителю (логин или ID)'),
    author: z.string().optional().describe('Фильтр по автору (логин или ID)'),
    status: z.string().optional().describe('Фильтр по статусу (название или ID)'),
    statusCategory: z.string().optional().describe('Фильтр по категории статуса'),
    fromToken: z.string().optional().describe('Токен для пагинации'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe('Максимальное количество задач на странице (по умолчанию: 50)'),
  })
  .strict();

export async function listTasks(
  client: TeamStormClient,
  params: z.infer<typeof ListTasksSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, apiUrl, ...filteredParams } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_tasks', { workspace, ...filteredParams });
    const result = await client.listTasks({ ...filteredParams, workspace });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_tasks', true, duration);
    logger.info({ count: result.items.length, durationMs: duration }, 'Tasks retrieved');

    const markdown = formatTaskListMarkdown(result);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      structuredContent: {
        tasks: result.items,
        pagination: {
          fromToken: result.fromToken,
          nextToken: result.nextToken,
          maxItemsCount: result.maxItemsCount,
          hasMore: !!result.nextToken,
        },
      },
    };
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
    'teamstorm_list_tasks',
    {
      title: 'Получить список задач',
      description:
        'Получить список задач в пространстве TeamStorm с фильтрацией и пагинацией. Если workspace не указан, используется workspace по умолчанию из TEAMSTORM_WORKSPACE.',
      inputSchema: ListTasksSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListTasksSchema>) => listTasks(client, params)
  );
}
