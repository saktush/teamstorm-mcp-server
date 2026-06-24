import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormPermissionListResponse, TeamStormPermission } from '../../client/types.js';

export const getTaskPermissionsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
  })
  .strict();

export function registerGetTaskPermissionsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task_permissions',
    {
      title: 'Получить правила доступа к задаче',
      description:
        'Получить список правил доступа к задаче. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getTaskPermissionsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getTaskPermissionsSchema>) => getTaskPermissions(client, params)
  );
}

export async function getTaskPermissions(
  client: TeamStormClient,
  args: z.infer<typeof getTaskPermissionsSchema>
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
    logRequest('teamstorm_get_task_permissions', { workspace, taskId });
    const response: TeamStormPermissionListResponse = await client.getTaskPermissions(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_task_permissions', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У задачи ${args.taskId} нет особых правил доступа. Доступ определяется правами пространства.`,
          },
        ],
      };
    }

    const accessLevelMap: Record<string, string> = {
      Read: '👁️ Просмотр',
      Edit: '✏️ Редактирование',
      Comment: '💬 Комментирование',
    };

    const permissionsText = response.items
      .map((perm: TeamStormPermission, index: number) => {
        let who: string;
        if (perm.type === 'User' && perm.user) {
          who = `👤 ${perm.user.displayName} (${perm.user.username})`;
        } else if (perm.type === 'Group' && perm.group) {
          who = `👥 Группа: ${perm.group.name}`;
        } else {
          who = `🔒 ID: ${perm.permissionId}`;
        }

        return (
          `**${index + 1}. ${who}**\n` +
          `   🔐 Уровень доступа: ${accessLevelMap[perm.accessLevel] || perm.accessLevel}\n` +
          `   🆔 Permission ID: ${perm.permissionId}`
        );
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `🔐 Правила доступа к задаче ${args.taskId} (${response.items.length} шт.):\n\n${permissionsText}`,
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
          text: `❌ Ошибка при получении правил доступа: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
