import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormWorkspaceUserListResponse } from '../../client/types.js';
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
    search: z
      .string()
      .optional()
      .describe(
        'Поиск по отображаемому имени, логину или email без учёта регистра (вхождение подстроки). Применяется на стороне MCP только к текущей странице после фильтров displayName/roleId; остальные страницы не просматриваются автоматически'
      ),
    displayName: z
      .string()
      .optional()
      .describe('Фильтр по отображаемому имени пользователя на стороне TeamStorm до пагинации.'),
    roleId: z
      .string()
      .optional()
      .describe(
        'Фильтр по UUID роли пользователя в пространстве на стороне TeamStorm до пагинации.'
      ),
    fromToken: z
      .string()
      .optional()
      .describe(
        'Курсор страницы API: передайте nextToken предыдущего ответа для получения следующей страницы'
      ),
    maxItemsCount: z
      .number()
      .optional()
      .default(100)
      .describe(
        'Максимальное количество пользователей на странице API и предел вывода после локального search (по умолчанию в инструменте: 100; API допускает от 1 до 1000)'
      ),
  })
  .strict();

export function formatUsersMarkdown(data: TeamStormWorkspaceUserListResponse): string {
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
    logRequest('teamstorm_users_list', params);
    const result = await client.listUsers(params.workspace, {
      displayName: params.displayName,
      roleId: params.roleId,
      fromToken: params.fromToken,
      maxItemsCount: params.maxItemsCount,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_users_list', true, duration);

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
        fromToken: result.fromToken,
        maxItemsCount: result.maxItemsCount,
        nextToken: result.nextToken,
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
    'teamstorm_users_list',
    {
      title: 'Получить список пользователей',
      description:
        'Получить одну страницу участников пространства TeamStorm. displayName и roleId фильтруют на стороне TeamStorm; search ищет только среди пользователей полученной страницы. Для следующей страницы передайте nextToken как fromToken, даже если локальный search не нашёл совпадений. Параметр workspace обязателен: передайте ключ или ID пространства.',
      inputSchema: ListUsersSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListUsersSchema>) => listUsers(client, params)
  );
}
