import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormUserListResponse } from '../../client/types.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

const ListUsersSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    search: z.string().optional().describe('Поиск по имени или email (вхождение подстроки)'),
    maxItemsCount: z
      .number()
      .optional()
      .default(100)
      .describe('Максимальное количество пользователей (по умолчанию: 100)'),
  })
  .strict();

export function formatUsersMarkdown(data: TeamStormUserListResponse): string {
  const lines: string[] = [];

  lines.push(`# Список пользователей (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Пользователи не найдены.');
    return lines.join('\n');
  }

  for (const user of data.items) {
    lines.push(`## ${user.displayName} (@${user.username})`);
    lines.push('');
    lines.push(`**Email**: ${user.email}`);
    lines.push(`**ID**: ${user.id}`);
    lines.push('');
  }

  return lines.join('\n');
}

export async function listUsers(
  client: TeamStormClient,
  params: z.infer<typeof ListUsersSchema>
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
    logRequest('teamstorm_list_users', params);
    const result = await client.listUsers(params.workspace);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_users', true, duration);

    // Apply client-side search filter if provided
    let filteredUsers = result.items;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredUsers = result.items.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply maxItemsCount limit
    const limitedUsers = filteredUsers.slice(0, params.maxItemsCount);

    logger.info({ count: limitedUsers.length, durationMs: duration }, 'Users retrieved');

    const markdown = formatUsersMarkdown({
      ...result,
      items: limitedUsers,
    });

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      structuredContent: {
        users: limitedUsers,
        total: filteredUsers.length,
        displayed: limitedUsers.length,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace: params.workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка пользователей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { ListUsersSchema as listUsersSchema };

export function registerListUsersTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_users',
    {
      title: 'Получить список пользователей',
      description:
        'Получить список пользователей в пространстве TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: ListUsersSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListUsersSchema>) => listUsers(client, params)
  );
}
