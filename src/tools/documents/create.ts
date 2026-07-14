import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatDocumentMarkdown } from '../../utils/formatters.js';

export const createDocumentSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().describe('Название документа'),
    content: z.string().optional().describe('Содержимое документа (поддерживает HTML-разметку)'),
    parentId: z.string().optional().describe('ID родительской папки или документа (UUID)'),
    labels: z.array(z.string()).optional().describe('Метки документа'),
  })
  .strict();

export async function createDocument(
  client: TeamStormClient,
  params: z.infer<typeof createDocumentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl: _apiUrl, workspace, ...body } = params;
  const startTime = Date.now();

  if (_apiUrl) {
    client.setBaseUrl(_apiUrl);
  }

  try {
    logRequest('teamstorm_create_document', { workspace, name: body.name });
    const doc = await client.createDocument(body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_create_document', true, duration);

    const text = `✅ Документ создан\n\n${formatDocumentMarkdown(doc)}`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: doc as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, name: body.name });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateDocumentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_create_document',
    {
      title: 'Создать документ',
      description:
        'Создать новый документ в пространстве TeamStorm. Можно указать содержимое, родительскую папку и метки.',
      inputSchema: createDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => createDocument(client, params)
  );
}
