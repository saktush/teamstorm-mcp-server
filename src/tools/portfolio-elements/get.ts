import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioElementModel } from './format.js';

export const getPortfolioElementSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    portfolioElementId: z.string().describe('UUID элемента портфеля'),
  })
  .strict();

export async function getPortfolioElement(
  client: TeamStormClient,
  params: z.infer<typeof getPortfolioElementSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, portfolioElementId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_portfolio_elements_get', { workspace, portfolioElementId });
    const element = await client.getPortfolioElement(portfolioElementId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_portfolio_elements_get', true, duration);

    return {
      content: [{ type: 'text', text: formatPortfolioElementModel(element) }],
      structuredContent: element as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, portfolioElementId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении элемента портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetPortfolioElementTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_portfolio_elements_get',
    {
      title: 'Получить элемент портфеля по ID',
      description: 'Получить элемент портфеля TeamStorm по его UUID.',
      inputSchema: getPortfolioElementSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params) => getPortfolioElement(client, params)
  );
}
