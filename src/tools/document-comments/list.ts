import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listDocumentCommentsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    documentId: z.string().describe('Ключ или идентификатор документа (UUID)'),
  })
  .strict();

export async function listDocumentComments(
  client: TeamStormClient,
  params: z.infer<typeof listDocumentCommentsSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_document_comments_list', { workspace, documentId });
    const result = await client.listDocumentComments(documentId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_document_comments_list', true, duration);

    if (result.items.length === 0) {
      return {
        content: [{ type: 'text', text: 'Комментарии к документу не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Комментарии к документу (${result.items.length})\n`);
    for (const comment of result.items) {
      lines.push(
        `**${comment.author.displayName}** — ${new Date(comment.createdAt).toLocaleString('ru-RU')}`
      );
      lines.push(comment.text);
      lines.push(`- ID: \`${comment.id}\``);
      lines.push('');
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { items: result.items, count: result.items.length },
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении комментариев документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListDocumentCommentsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_document_comments_list',
    {
      title: 'Комментарии к документу',
      description: 'Получить список комментариев к документу TeamStorm.',
      inputSchema: listDocumentCommentsSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => listDocumentComments(client, params)
  );
}
