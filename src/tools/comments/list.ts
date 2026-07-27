import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormCommentListResponse, TeamStormComment } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { OUTPUT_PARAMS_SHAPE, buildListResult, stripHtml, truncate } from '../../utils/output.js';
import { formatDateTime } from '../../utils/dates.js';

const COMMENT_FIELD_NAMES = ['id', 'text', 'author', 'createdAt', 'updatedAt'] as const;
const COMMENT_DEFAULT_FIELDS = ['id', 'author', 'createdAt', 'text'] as const;
const COMMENT_IDENTITY_FIELDS = ['id', 'author', 'createdAt'] as const;

function projectComment(
  comment: TeamStormComment,
  fields: Set<string>,
  opts: { descriptionMaxChars: number }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields.has('id')) out.id = comment.id;
  if (fields.has('author')) {
    out.author = comment.author
      ? { id: comment.author.id, displayName: comment.author.displayName }
      : null;
  }
  if (fields.has('createdAt')) out.createdAt = comment.createdAt;
  if (fields.has('updatedAt')) out.updatedAt = comment.updatedAt;
  // Тело комментария — HTML, это основной источник веса ответа.
  if (fields.has('text')) {
    out.text = comment.text ? truncate(stripHtml(comment.text), opts.descriptionMaxChars) : '';
  }
  return out;
}

const baseListTaskCommentsSchema = z
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

export const listTaskCommentsSchema = baseListTaskCommentsSchema.extend(OUTPUT_PARAMS_SHAPE);

export function registerListTaskCommentsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_comments_list',
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
    logRequest('teamstorm_comments_list', { workspace, taskId });
    const response: TeamStormCommentListResponse = await client.listTaskComments(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_comments_list', true, duration);

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

    return buildListResult<TeamStormComment>({
      items: response.items,
      format: args.format,
      fields: args.fields,
      maxItems: args.maxItems,
      descriptionMaxChars: args.descriptionMaxChars,
      allowedFields: COMMENT_FIELD_NAMES,
      defaultFields: COMMENT_DEFAULT_FIELDS,
      identityFields: COMMENT_IDENTITY_FIELDS,
      project: projectComment,
      renderMarkdown: (rows, meta) => {
        const commentsText = rows
          .map(
            (comment, index) =>
              `**Комментарий #${index + 1}** (ID: ${comment.id})\n` +
              `👤 Автор: ${comment.author.displayName} (${comment.author.username})\n` +
              `📅 Создан: ${formatDateTime(comment.createdAt)}\n` +
              `✏️ Изменен: ${formatDateTime(comment.updatedAt)}\n` +
              `💬 Текст:\n${comment.text}\n`
          )
          .join('\n---\n\n');
        return `📝 Комментарии к задаче ${args.taskId} (${meta.returned} шт.):\n\n${commentsText}`;
      },
    });
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
