import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormComment } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const createTaskCommentSchema = z
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
    text: z.string().describe('Текст комментария (поддерживает HTML-разметку)'),
  })
  .strict();

export function registerCreateTaskCommentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_comments_create',
    {
      title: 'Добавить комментарий к задаче',
      description:
        'Добавить новый комментарий к задаче. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: createTaskCommentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof createTaskCommentSchema>) => createTaskComment(client, params)
  );
}

export async function createTaskComment(
  client: TeamStormClient,
  args: z.infer<typeof createTaskCommentSchema>
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
    logRequest('teamstorm_comments_create', { workspace, taskId });
    const comment: TeamStormComment = await client.createTaskComment(
      args.taskId,
      args.text,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_comments_create', true, duration);

    const text =
      `✅ Комментарий успешно добавлен к задаче ${args.taskId}\n\n` +
      `🆔 ID комментария: ${comment.id}\n` +
      `👤 Автор: ${comment.author.displayName} (${comment.author.username})\n` +
      `📅 Создан: ${new Date(comment.createdAt).toLocaleString('ru-RU')}`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      structuredContent: comment as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при добавлении комментария: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
