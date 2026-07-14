import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getTaskDocumentLinksSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
  })
  .strict();

export async function getTaskDocumentLinks(
  client: TeamStormClient,
  params: z.infer<typeof getTaskDocumentLinksSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, taskId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_task_document_links', { workspace, taskId });
    const documents = await client.getWorkitemDocumentLinks(taskId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_task_document_links', true, duration);

    if (documents.length === 0) {
      return {
        content: [{ type: 'text', text: 'Связанные документы не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Документы, связанные с задачей ${taskId} (${documents.length})\n`);
    for (const doc of documents) {
      lines.push(`- **${doc.key}**: ${doc.name} (ID: \`${doc.id}\`)`);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { items: documents, count: documents.length },
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении документов задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetTaskDocumentLinksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task_document_links',
    {
      title: 'Документы, связанные с задачей',
      description: 'Получить список документов, связанных с задачей TeamStorm.',
      inputSchema: getTaskDocumentLinksSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getTaskDocumentLinks(client, params)
  );
}
