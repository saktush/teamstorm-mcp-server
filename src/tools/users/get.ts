import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormUser } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

// GET /users/{user} has no {workspace} segment — this is a genuinely global lookup
// (same reasoning as teamstorm_list_status_categories), do not add a workspace param here.
export const getUserSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    user: z.string().describe('ID или username пользователя'),
    providerId: z.string().uuid().optional().describe('ID провайдера аутентификации (опционально)'),
  })
  .strict();

export async function getUser(
  client: TeamStormClient,
  args: z.infer<typeof getUserSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { user, providerId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_user', { user, providerId });
    const result: TeamStormUser = await client.getUser(user, providerId);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_user', true, duration);

    const text =
      `👤 **${result.displayName}** (@${result.username})\n\n` +
      `**Email**: ${result.email}\n` +
      `**ID**: ${result.id}` +
      (result.providerId ? `\n**Provider ID**: ${result.providerId}` : '');

    return {
      content: [{ type: 'text', text }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { user });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении пользователя: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetUserTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_user',
    {
      title: 'Получить пользователя (глобально)',
      description:
        'Получить профиль пользователя по ID или username. Глобальный поиск — не зависит от workspace, работает даже если пользователь не является участником ни одного известного вам пространства.',
      inputSchema: getUserSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getUserSchema>) => getUser(client, params)
  );
}
