import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormWorkflowListResponse } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

const ListWorkflowsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

export function formatWorkflowsMarkdown(data: TeamStormWorkflowListResponse): string {
  const lines: string[] = [];

  lines.push(`# Доступные процессы (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Процессы не найдены.');
    return lines.join('\n');
  }

  for (const workflow of data.items) {
    lines.push(`## ${workflow.name}`);
    lines.push('');
    lines.push(`**ID**: ${workflow.id}`);

    if (workflow.description) {
      lines.push(`**Описание**: ${workflow.description}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

export async function listWorkflows(
  client: TeamStormClient,
  params: z.infer<typeof ListWorkflowsSchema>
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
    logRequest('teamstorm_list_workflows', params);
    const result = await client.listWorkflows(params.workspace);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_workflows', true, duration);
    console.error(`✅ Retrieved ${result.items.length} workflows in ${duration}ms`);

    const markdown = formatWorkflowsMarkdown(result);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      structuredContent: {
        workflows: result.items,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace: params.workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка процессов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { ListWorkflowsSchema as listWorkflowsSchema };

export function registerListWorkflowsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_workflows',
    {
      title: 'Получить список процессов',
      description:
        'Получить список доступных процессов (workflows) в пространстве TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: ListWorkflowsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListWorkflowsSchema>) => listWorkflows(client, params)
  );
}
