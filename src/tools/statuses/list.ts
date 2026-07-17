import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listWorkspaceStatusesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

export async function listWorkspaceStatuses(
  client: TeamStormClient,
  params: z.infer<typeof listWorkspaceStatusesSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_workspace_statuses', { workspace });
    const result = await client.listWorkspaceStatuses(workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_workspace_statuses', true, duration);

    if (result.items.length === 0) {
      return {
        content: [{ type: 'text', text: 'Статусы задач не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Статусы задач (${result.items.length})\n`);
    for (const status of result.items) {
      lines.push(`- **${status.name}** (категория: ${status.category.name}) — \`${status.id}\``);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { items: result.items, count: result.items.length },
    };
  } catch (error) {
    logError(error as Error, { workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении статусов задач: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListWorkspaceStatusesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_workspace_statuses',
    {
      title: 'Статусы задач пространства',
      description:
        'Получить список статусов задач (workitem), доступных в пространстве TeamStorm, вместе с их категориями. Не путать с teamstorm_list_document_statuses (статусы документов).',
      inputSchema: listWorkspaceStatusesSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => listWorkspaceStatuses(client, params)
  );
}
