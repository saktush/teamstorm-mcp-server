import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioModel } from './format.js';

export const updatePortfolioSchema = z
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
    name: z
      .string()
      .max(255)
      .describe(
        'Новое название портфеля (до 255 символов). Обязательно — API портфелей позволяет менять через PATCH только название, поле обязательно даже при "точечном" переименовании.'
      ),
  })
  .strict();

export async function updatePortfolio(
  client: TeamStormClient,
  params: z.infer<typeof updatePortfolioSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, portfolioId, ...body } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_portfolios_update', { workspace, portfolioId, ...body });
    const portfolio = await client.patchPortfolio(portfolioId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_portfolios_update', true, duration);

    return {
      content: [
        { type: 'text', text: `✅ Портфель обновлён\n\n${formatPortfolioModel(portfolio)}` },
      ],
      structuredContent: portfolio as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, portfolioId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при обновлении портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdatePortfolioTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_portfolios_update',
    {
      title: 'Переименовать портфель',
      description:
        'Изменить название существующего портфеля TeamStorm. API поддерживает через PATCH только переименование (name обязателен).',
      inputSchema: updatePortfolioSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updatePortfolio(client, params)
  );
}
