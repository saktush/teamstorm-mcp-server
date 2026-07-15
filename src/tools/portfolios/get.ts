import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioModel } from './format.js';

export const getPortfolioSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    portfolioId: z.string().describe('UUID портфеля'),
  })
  .strict();

export async function getPortfolio(
  client: TeamStormClient,
  params: z.infer<typeof getPortfolioSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, portfolioId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_portfolio', { workspace, portfolioId });
    const portfolio = await client.getPortfolio(portfolioId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_portfolio', true, duration);

    return {
      content: [{ type: 'text', text: formatPortfolioModel(portfolio) }],
      structuredContent: portfolio as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, portfolioId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetPortfolioTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_portfolio',
    {
      title: 'Получить портфель по ID',
      description: 'Получить портфель TeamStorm по его UUID вместе со списком его элементов.',
      inputSchema: getPortfolioSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params) => getPortfolio(client, params)
  );
}
