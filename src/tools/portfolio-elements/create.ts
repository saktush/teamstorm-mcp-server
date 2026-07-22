import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioElementModel } from './format.js';

export const createPortfolioElementSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    portfolioId: z.string().describe('UUID портфеля, в котором создаётся элемент'),
    name: z.string().max(255).describe('Название элемента портфеля (до 255 символов)'),
    description: z.string().max(65000).optional().describe('Описание элемента портфеля'),
    startDate: z.string().optional().describe('Дата начала в формате ISO 8601'),
    endDate: z.string().optional().describe('Дата окончания в формате ISO 8601'),
    responsibles: z
      .array(z.string())
      .optional()
      .describe('Список ответственных (логин или ID пользователя)'),
  })
  .strict();

export async function createPortfolioElement(
  client: TeamStormClient,
  params: z.infer<typeof createPortfolioElementSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, ...body } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_portfolio_elements_create', {
      workspace,
      portfolioId: body.portfolioId,
      name: body.name,
    });
    const element = await client.createPortfolioElement(body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_portfolio_elements_create', true, duration);

    return {
      content: [
        { type: 'text', text: `✅ Элемент портфеля создан\n\n${formatPortfolioElementModel(element)}` },
      ],
      structuredContent: element as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, portfolioId: body.portfolioId, name: body.name });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании элемента портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreatePortfolioElementTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_portfolio_elements_create',
    {
      title: 'Создать элемент портфеля',
      description: 'Создать новый элемент в указанном портфеле TeamStorm.',
      inputSchema: createPortfolioElementSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => createPortfolioElement(client, params)
  );
}
