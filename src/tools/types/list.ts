import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormTypeListResponse } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

const ListTaskTypesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

export function formatTaskTypesMarkdown(data: TeamStormTypeListResponse): string {
  const lines: string[] = [];

  lines.push(`# Типы задач (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Типы задач не найдены.');
    return lines.join('\n');
  }

  for (const type of data.items) {
    lines.push(`## ${type.name}`);
    lines.push('');
    lines.push(`**ID**: ${type.id}`);

    if (type.icon) {
      lines.push(`**Иконка**: ${type.icon}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

export async function listTaskTypes(
  client: TeamStormClient,
  params: z.infer<typeof ListTaskTypesSchema>
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

  try {
    logRequest('teamstorm_list_task_types', params);
    const result = await client.listTaskTypes(params.workspace);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_task_types', true, duration);
    console.error(`✅ Retrieved ${result.items.length} task types in ${duration}ms`);

    const markdown = formatTaskTypesMarkdown(result);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      structuredContent: {
        taskTypes: result.items,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace: params.workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка типов задач: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { ListTaskTypesSchema as listTaskTypesSchema };

export function registerListTaskTypesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_task_types',
    {
      title: 'Получить список типов задач',
      description:
        'Получить список типов задач в пространстве TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: ListTaskTypesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListTaskTypesSchema>) => listTaskTypes(client, params)
  );
}
