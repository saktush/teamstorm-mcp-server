import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormCommentListResponse, TeamStormComment } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listTaskCommentsSchema = z
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

export function registerListTaskCommentsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_task_comments',
    {
      title: 'Получить комментарии задачи',
      description:
        'Получить все комментарии к задаче. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listTaskCommentsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listTaskCommentsSchema>) => listTaskComments(client, params)
  );
}

export async function listTaskComments(
  client: TeamStormClient,
  args: z.infer<typeof listTaskCommentsSchema>
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
    logRequest('teamstorm_list_task_comments', { workspace, taskId });
    const response: TeamStormCommentListResponse = await client.listTaskComments(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_task_comments', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Комментарии к задаче ${args.taskId} отсутствуют.`,
          },
        ],
      };
    }

    const commentsText = response.items
      .map(
        (comment: TeamStormComment, index: number) =>
          `**Комментарий #${index + 1}** (ID: ${comment.id})\n` +
          `👤 Автор: ${comment.author.displayName} (${comment.author.username})\n` +
          `📅 Создан: ${new Date(comment.createdAt).toLocaleString('ru-RU')}\n` +
          `✏️ Изменен: ${new Date(comment.updatedAt).toLocaleString('ru-RU')}\n` +
          `💬 Текст:\n${comment.text}\n`
      )
      .join('\n---\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `📝 Комментарии к задаче ${args.taskId} (${response.items.length} шт.):\n\n${commentsText}`,
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
          text: `❌ Ошибка при получении комментариев: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
