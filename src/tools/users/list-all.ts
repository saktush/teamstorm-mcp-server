import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatUsersMarkdown } from './list.js';

// GET /users has no {workspace} segment and no pagination tokens (UsersModelList = { items }) —
// instance-wide, server-side filtered search, unlike teamstorm_list_users (workspace-scoped,
// fetches everything then filters client-side).
export const listAllUsersSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    displayName: z.string().optional().describe('Фильтр по отображаемому имени'),
    email: z.string().optional().describe('Фильтр по email'),
    username: z.string().optional().describe('Фильтр по username'),
    providerId: z.string().uuid().optional().describe('Фильтр по ID провайдера аутентификации'),
  })
  .strict();

export async function listAllUsers(
  client: TeamStormClient,
  args: z.infer<typeof listAllUsersSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { apiUrl, ...params } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_all_users', params);
    const result = await client.listAllUsers(params);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_all_users', true, duration);

    const markdown = formatUsersMarkdown(result);

    return {
      content: [{ type: 'text', text: markdown }],
      structuredContent: {
        users: result.items,
        total: result.items.length,
      },
    };
  } catch (error) {
    logError(error as Error, params);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка пользователей: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListAllUsersTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_all_users',
    {
      title: 'Поиск пользователей (глобально)',
      description:
        'Найти пользователей по всему инстансу TeamStorm (не ограничено одним workspace). Фильтрация происходит на стороне сервера. Для списка участников конкретного пространства используйте teamstorm_list_users.',
      inputSchema: listAllUsersSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listAllUsersSchema>) => listAllUsers(client, params)
  );
}
