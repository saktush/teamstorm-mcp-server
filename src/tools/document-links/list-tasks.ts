import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getDocumentTaskLinksSchema = z
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

export async function getDocumentTaskLinks(
  client: TeamStormClient,
  params: z.infer<typeof getDocumentTaskLinksSchema>
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
    logRequest('teamstorm_get_document_task_links', { workspace, documentId });
    const tasks = await client.getDocumentWorkitemLinks(documentId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_document_task_links', true, duration);

    if (tasks.length === 0) {
      return {
        content: [{ type: 'text', text: 'Связанные задачи не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Задачи, связанные с документом (${tasks.length})\n`);
    for (const task of tasks) {
      lines.push(`- **${task.key}**: ${task.name} (статус: ${task.status?.name ?? '—'})`);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { items: tasks, count: tasks.length },
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении связей документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetDocumentTaskLinksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_document_task_links',
    {
      title: 'Задачи, связанные с документом',
      description: 'Получить список задач (workitems), связанных с документом TeamStorm.',
      inputSchema: getDocumentTaskLinksSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getDocumentTaskLinks(client, params)
  );
}
