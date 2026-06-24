import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatTaskMarkdown } from '../../utils/formatters.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

const GetTaskSchema = z
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
  })
  .strict();

export async function getTask(
  client: TeamStormClient,
  params: z.infer<typeof GetTaskSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, apiUrl } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  if (!client.hasBaseUrl()) {
    logRequest('teamstorm_get_task', params);
    return {
      content: [
        {
          type: 'text',
          text:
            '❌ TeamStorm API URL не задан.\n' +
            '💡 Установите TEAMSTORM_API_URL в переменной окружения.\n' +
            '   Формат: http://<teamstorm-host>/cwm/public/api/v1',
        },
      ],
      isError: true,
    };
  }

  try {
    logRequest('teamstorm_get_task', params);
    const task = await client.getTask(params.taskId, params.workspace);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_task', true, duration);
    console.error(`✅ Retrieved task ${params.taskId} in ${duration}ms`);

    const markdown = formatTaskMarkdown(task);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      structuredContent: task as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { taskId: params.taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { GetTaskSchema as getTaskSchema };

export function registerGetTaskTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task',
    {
      title: 'Получить задачу по ID',
      description:
        'Получить полную информацию о конкретной задаче по её ID. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: GetTaskSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof GetTaskSchema>) => getTask(client, params)
  );
}
