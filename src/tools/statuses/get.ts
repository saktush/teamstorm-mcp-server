import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getWorkspaceStatusSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    statusId: z.string().describe('Идентификатор статуса задачи (UUID)'),
  })
  .strict();

export async function getWorkspaceStatus(
  client: TeamStormClient,
  params: z.infer<typeof getWorkspaceStatusSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, statusId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_workspace_statuses_get', { workspace, statusId });
    const status = await client.getWorkspaceStatus(statusId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_workspace_statuses_get', true, duration);

    const text =
      `# Статус задачи\n\n` +
      `- Название: **${status.name}**\n` +
      `- Категория: ${status.category.name}\n` +
      `- ID: \`${status.id}\``;

    return {
      content: [{ type: 'text', text }],
      structuredContent: status as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, statusId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении статуса задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetWorkspaceStatusTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_workspace_statuses_get',
    {
      title: 'Получить статус задачи',
      description: 'Получить статус задачи (workitem) TeamStorm по идентификатору.',
      inputSchema: getWorkspaceStatusSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getWorkspaceStatus(client, params)
  );
}
