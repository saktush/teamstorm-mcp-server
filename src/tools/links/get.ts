import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormLinkListResponse, TeamStormLink } from '../../client/types.js';

export const getTaskLinksSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
  })
  .strict();

export function registerGetTaskLinksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task_links',
    {
      title: 'Получить связи задачи',
      description:
        'Получить связи задачи (связанные задачи). Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getTaskLinksSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getTaskLinksSchema>) => getTaskLinks(client, params)
  );
}

export async function getTaskLinks(
  client: TeamStormClient,
  args: z.infer<typeof getTaskLinksSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_task_links', { workspace, taskId });
    const response: TeamStormLinkListResponse = await client.getTaskLinks(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_task_links', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У задачи ${args.taskId} нет связей.`,
          },
        ],
      };
    }

    const linksText = response.items
      .map(
        (link: TeamStormLink, index: number) =>
          `**${index + 1}. ${link.linkType.name}**\n` +
          `   🔗 Тип связи: ${link.linkType.name} (${link.linkType.id})\n` +
          `   📤 От: ${link.source.name} (${link.source.key})\n` +
          `   📥 К: ${link.target.name} (${link.target.key})`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `🔗 Связи задачи ${args.taskId} (${response.items.length} шт.):\n\n${linksText}`,
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении связей: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
