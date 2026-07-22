import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

const GetTaskCountSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

export async function getTaskCount(
  client: TeamStormClient,
  params: z.infer<typeof GetTaskCountSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  try {
    logRequest('teamstorm_tasks_count', params);
    const { workspace, apiUrl } = params;

    if (apiUrl) {
      client.setBaseUrl(apiUrl);
    }

    const count = await client.getTaskCount(workspace);

    logResponse('teamstorm_tasks_count', true);
    logger.info({ count }, 'Task count retrieved');

    return {
      content: [
        {
          type: 'text',
          text: `📊 **Общее количество задач в пространстве**: ${count}`,
        },
      ],
      structuredContent: {
        workspace: params.workspace,
        taskCount: count,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace: params.workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении количества задач: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { GetTaskCountSchema as getTaskCountSchema };

export function registerGetTaskCountTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_tasks_count',
    {
      title: 'Получить количество задач',
      description:
        'Получить общее количество задач в пространстве TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: GetTaskCountSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof GetTaskCountSchema>) => getTaskCount(client, params)
  );
}
