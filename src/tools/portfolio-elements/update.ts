import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioElementModel } from './format.js';

export const updatePortfolioElementSchema = z
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
    name: z.string().max(255).optional().describe('Новое название элемента портфеля'),
    description: z.string().max(65000).optional().describe('Новое описание элемента портфеля'),
    startDate: z.string().optional().describe('Новая дата начала в формате ISO 8601'),
    endDate: z.string().optional().describe('Новая дата окончания в формате ISO 8601'),
    status: z.string().optional().describe('Новый статус элемента портфеля (название или ID)'),
    responsibles: z
      .array(z.string())
      .optional()
      .describe('Полный список ответственных (логин или ID пользователя), заменяет текущий'),
  })
  .strict();

export async function updatePortfolioElement(
  client: TeamStormClient,
  params: z.infer<typeof updatePortfolioElementSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, portfolioElementId, ...body } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_update_portfolio_element', { workspace, portfolioElementId, ...body });
    const element = await client.patchPortfolioElement(portfolioElementId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_update_portfolio_element', true, duration);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Элемент портфеля обновлён\n\n${formatPortfolioElementModel(element)}`,
        },
      ],
      structuredContent: element as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, portfolioElementId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при обновлении элемента портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdatePortfolioElementTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_update_portfolio_element',
    {
      title: 'Обновить элемент портфеля',
      description:
        'Изменить название, описание, даты, статус или список ответственных элемента портфеля. Передавайте только изменяемые поля.',
      inputSchema: updatePortfolioElementSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updatePortfolioElement(client, params)
  );
}
