import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatTaskMarkdown } from '../../utils/formatters.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

const UpdateTaskSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или ID задачи (например, TS-13 или UUID)'),
    name: z.string().optional().describe('Новое название задачи'),
    description: z.string().optional().describe('Новое описание задачи'),
    type: z.string().optional().describe('Тип задачи (название или ID)'),
    workflowId: z.string().optional().describe('ID процесса'),
    status: z.string().optional().describe('Новый статус задачи (название или ID)'),
    startDate: z.string().optional().describe('Новая дата начала в формате ISO 8601'),
    dueDate: z.string().optional().describe('Новая дата выполнения в формате ISO 8601'),
    assignee: z.string().optional().describe('Новый исполнитель (логин или ID)'),
    sprintId: z.string().optional().describe('ID спринта'),
    originalEstimate: z.number().optional().describe('Новая оценка в секундах'),
    storyPoints: z.number().optional().describe('Новая оценка в Story Points'),
    parentId: z.string().optional().describe('ID родительской задачи или папки'),
    portfolioElementIds: z.array(z.string()).optional().describe('Список ID элементов портфеля'),
  })
  .strict();

export async function updateTask(
  client: TeamStormClient,
  params: z.infer<typeof UpdateTaskSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, apiUrl, ...updateData } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_tasks_update', { workspace, taskId, ...updateData });
    const result = await client.updateTask(taskId, { ...updateData, workspace: params.workspace });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_tasks_update', true, duration);
    logger.info({ taskId, durationMs: duration }, 'Task updated');

    const markdown = formatTaskMarkdown(result);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Задача обновлена!\n\n${markdown}`,
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
          text: `❌ Ошибка при обновлении задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
    };
  }
}

export { UpdateTaskSchema as updateTaskSchema };

export function registerUpdateTaskTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_tasks_update',
    {
      title: 'Обновить задачу',
      description:
        'Обновить параметры существующей задачи. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: UpdateTaskSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof UpdateTaskSchema>) => updateTask(client, params)
  );
}
