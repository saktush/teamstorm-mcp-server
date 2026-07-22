import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listPortfolioElementsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().optional().describe('Поиск по названию элемента портфеля (вхождение подстроки)'),
    folderId: z.string().optional().describe('Фильтр по UUID папки портфеля'),
    portfolioId: z.string().optional().describe('Фильтр по UUID портфеля'),
    status: z.string().optional().describe('Фильтр по статусу (название или ID)'),
  })
  .strict();

export async function listPortfolioElements(
  client: TeamStormClient,
  params: z.infer<typeof listPortfolioElementsSchema>
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
    logRequest('teamstorm_portfolio_elements_list', { workspace, ...filters });
    const result = await client.listPortfolioElements({ ...filters, workspace });
    const duration = Date.now() - startTime;
    logResponse('teamstorm_portfolio_elements_list', true, duration);

    const lines: string[] = [];
    lines.push(`# Список элементов портфеля (${result.items.length})\n`);
    if (result.items.length === 0) {
      lines.push('Элементы портфеля не найдены.');
    } else {
      for (const e of result.items) {
        lines.push(
          `- **${e.name}** (\`${e.id}\`) — портфель: ${e.portfolio.name}, статус: ${e.status.name}`
        );
      }
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { portfolioElements: result.items },
    };
  } catch (error) {
    logError(error as Error, { workspace, ...filters });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка элементов портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListPortfolioElementsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_portfolio_elements_list',
    {
      title: 'Получить список элементов портфеля',
      description:
        'Получить список элементов портфелей пространства TeamStorm с фильтрацией по названию, папке, портфелю и статусу. Пагинация не поддерживается API — возвращаются все найденные записи.',
      inputSchema: listPortfolioElementsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params) => listPortfolioElements(client, params)
  );
}
