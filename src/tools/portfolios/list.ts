import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listPortfoliosSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().optional().describe('Поиск по названию портфеля (вхождение подстроки)'),
    folderId: z.string().optional().describe('Фильтр по UUID папки, в которой лежит портфель'),
  })
  .strict();

export async function listPortfolios(
  client: TeamStormClient,
  params: z.infer<typeof listPortfoliosSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, ...filters } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_portfolios_list', { workspace, ...filters });
    const result = await client.listPortfolios({ ...filters, workspace });
    const duration = Date.now() - startTime;
    logResponse('teamstorm_portfolios_list', true, duration);

    const lines: string[] = [];
    lines.push(`# Список портфелей (${result.items.length})\n`);
    if (result.items.length === 0) {
      lines.push('Портфели не найдены.');
    } else {
      for (const p of result.items) {
        lines.push(`- **${p.name}** (\`${p.id}\`) — папка: ${p.folder.name}, элементов: ${p.elements.length}`);
      }
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { portfolios: result.items },
    };
  } catch (error) {
    logError(error as Error, { workspace, ...filters });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка портфелей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListPortfoliosTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_portfolios_list',
    {
      title: 'Получить список портфелей',
      description:
        'Получить список портфелей пространства TeamStorm с фильтрацией по названию и папке. Пагинация не поддерживается API — возвращаются все найденные записи.',
      inputSchema: listPortfoliosSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params) => listPortfolios(client, params)
  );
}
