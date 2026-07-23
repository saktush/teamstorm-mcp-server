import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormCommentVisibility, TeamStormUser } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getCommentVisibilitySchema = z
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
    commentId: z.string().describe('Идентификатор комментария'),
  })
  .strict();

export function registerGetCommentVisibilityTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_comments_get_visibility',
    {
      title: 'Получить видимость комментария',
      description:
        'Получить информацию о видимости комментария (кто может его видеть). Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getCommentVisibilitySchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getCommentVisibilitySchema>) =>
      getCommentVisibility(client, params)
  );
}

export async function getCommentVisibility(
  client: TeamStormClient,
  args: z.infer<typeof getCommentVisibilitySchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, commentId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_comments_get_visibility', { workspace, taskId, commentId });
    const visibility: TeamStormCommentVisibility = await client.getCommentVisibility(
      args.taskId,
      args.commentId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_comments_get_visibility', true, duration);

    const visibilityTypeMap: Record<string, string> = {
      All: '🌍 Доступен всем',
      Workspace: '🏢 Доступен пользователям пространства',
      OnlySelected: '👥 Доступен только выбранным пользователям',
      ExceptSelected: '🚫 Доступен всем, кроме выбранных',
    };

    let accessListText = '';
    if (visibility.accessList.length > 0) {
      accessListText =
        '\n\n**Список доступа:**\n' +
        visibility.accessList
          .map(
            (
              item: {
                id: string;
                type?: string;
                user?: TeamStormUser;
                group?: { id: string; name: string };
              },
              idx: number
            ) => {
              if (item.type === 'User' && item.user) {
                return `${idx + 1}. 👤 ${item.user.displayName} (${item.user.username})`;
              } else if (item.type === 'Group' && item.group) {
                return `${idx + 1}. 👥 Группа: ${item.group.name}`;
              } else {
                return `${idx + 1}. 🔒 ID: ${item.id}`;
              }
            }
          )
          .join('\n');
    } else {
      accessListText = '\n\nСписок доступа пуст';
    }

    return {
      content: [
        {
          type: 'text',
          text:
            `👁️ Видимость комментария ${args.commentId} в задаче ${args.taskId}:\n\n` +
            `**Тип доступа:** ${visibilityTypeMap[visibility.visibilityType] || visibility.visibilityType}` +
            accessListText,
        },
      ],
      structuredContent: visibility as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId, commentId: args.commentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении видимости комментария: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
