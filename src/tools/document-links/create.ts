import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const linkDocumentToTaskSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства документа (workspace)'),
    documentId: z.string().describe('Ключ или идентификатор документа (UUID)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
    taskWorkspace: z
      .string()
      .optional()
      .describe(
        'Пространство задачи, если оно отличается от пространства документа. По умолчанию — workspace.'
      ),
  })
  .strict();

export async function linkDocumentToTask(
  client: TeamStormClient,
  params: z.infer<typeof linkDocumentToTaskSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId, taskId, taskWorkspace } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_link_document_to_task', { workspace, documentId, taskId });
    await client.createDocumentWorkitemLink(
      documentId,
      { workitemWorkspace: taskWorkspace ?? workspace, workitem: taskId },
      workspace
    );
    const duration = Date.now() - startTime;
    logResponse('teamstorm_link_document_to_task', true, duration);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Документ \`${documentId}\` связан с задачей ${taskId}`,
        },
      ],
      structuredContent: { documentId, taskId, linked: true },
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId, taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при связывании документа с задачей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerLinkDocumentToTaskTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_link_document_to_task',
    {
      title: 'Связать документ с задачей',
      description:
        'Создать связь между документом и задачей TeamStorm. Задача может находиться в другом пространстве (параметр taskWorkspace).',
      inputSchema: linkDocumentToTaskSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => linkDocumentToTask(client, params)
  );
}
