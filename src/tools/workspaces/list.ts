import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

export const listWorkspacesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
  })
  .strict();

export function registerListWorkspacesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_workspaces',
    {
      title: 'Получить список пространств',
      description:
        'Получить список всех доступных пространств (workspaces) TeamStorm. Используйте, чтобы узнать правильные ключи workspace для других инструментов.',
      inputSchema: listWorkspacesSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params: z.infer<typeof listWorkspacesSchema>) => listWorkspaces(client, params)
  );
}

export async function listWorkspaces(
  client: TeamStormClient,
  params: z.infer<typeof listWorkspacesSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl } = params;

  if (apiUrl) {
    client.setBaseUrlRaw(apiUrl);
  }

  const startTime = Date.now();

  try {
    logRequest('teamstorm_list_workspaces', {});

    const allWorkspaces: Array<{ id: string; key: string; name: string }> = [];
    let nextToken: string | null | undefined = undefined;

    do {
      const page = await client.listWorkspaces({
        maxItemsCount: 1000,
        fromToken: nextToken ?? undefined,
      });
      allWorkspaces.push(...page.items);
      nextToken = page.nextToken;
    } while (nextToken);

    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_workspaces', true, duration);

    logger.info(`Retrieved ${allWorkspaces.length} workspaces in ${duration}ms`);

    if (allWorkspaces.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Пространства TeamStorm не найдены.',
          },
        ],
      };
    }

    const lines: string[] = [];
    lines.push(`# Доступные пространства TeamStorm (${allWorkspaces.length})\n`);

    for (const ws of allWorkspaces) {
      lines.push(`**${ws.name}**\n`);
      lines.push(`- Ключ: \`${ws.key}\``);
      lines.push(`- ID: \`${ws.id}\``);
      lines.push('');
    }

    lines.push(
      '💡 Используйте `key` (например, "get") или `id` как значение параметра `workspace` в других инструментах.'
    );

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n'),
        },
      ],
      structuredContent: {
        workspaces: allWorkspaces,
        count: allWorkspaces.length,
      },
    };
  } catch (error) {
    logError(error as Error, {});
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка пространств: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}
