import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

export const listDocumentsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    fromToken: z.string().optional().describe('Токен пагинации для получения следующей страницы'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe('Максимальное количество документов на странице (по умолчанию: 50, макс: 1000)'),
  })
  .strict();

export async function listDocuments(
  client: TeamStormClient,
  params: z.infer<typeof listDocumentsSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, ...rest } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_documents', { workspace, ...rest });
    const result = await client.listDocuments({ workspace, ...rest });
    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_documents', true, duration);
    logger.info({ count: result.items.length, durationMs: duration }, 'Documents retrieved');

    if (result.items.length === 0) {
      return {
        content: [{ type: 'text', text: 'Документы не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Документы TeamStorm (${result.items.length})\n`);

    for (const doc of result.items) {
      lines.push(`**${doc.key}: ${doc.name}**`);
      lines.push(`- ID: \`${doc.id}\``);
      lines.push(`- Статус: ${doc.status ? doc.status.name : 'Без статуса'}`);
      if (doc.isBlocked) lines.push('- 🔒 Заблокирован');
      if (doc.labels && doc.labels.length > 0) lines.push(`- Метки: ${doc.labels.join(', ')}`);
      lines.push('');
    }

    if (result.nextToken) {
      lines.push(`📄 Следующая страница: \`fromToken=${result.nextToken}\``);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        items: result.items,
        count: result.items.length,
        nextToken: result.nextToken ?? null,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace, ...rest });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка документов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListDocumentsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_documents',
    {
      title: 'Список документов пространства',
      description:
        'Получить список документов в пространстве TeamStorm. Поддерживает пагинацию через fromToken/maxItemsCount.',
      inputSchema: listDocumentsSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => listDocuments(client, params)
  );
}
