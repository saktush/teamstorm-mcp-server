import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioModel } from './format.js';

export const createPortfolioSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().max(255).describe('Название портфеля (до 255 символов)'),
    folderId: z.string().describe('UUID папки, в которой будет создан портфель'),
  })
  .strict();

export async function createPortfolio(
  client: TeamStormClient,
  params: z.infer<typeof createPortfolioSchema>
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
    logRequest('teamstorm_create_portfolio', { workspace, name: body.name, folderId: body.folderId });
    const portfolio = await client.createPortfolio(body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_create_portfolio', true, duration);

    return {
      content: [{ type: 'text', text: `✅ Портфель создан\n\n${formatPortfolioModel(portfolio)}` }],
      structuredContent: portfolio as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, name: body.name });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreatePortfolioTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_create_portfolio',
    {
      title: 'Создать портфель',
      description: 'Создать новый портфель в указанной папке пространства TeamStorm.',
      inputSchema: createPortfolioSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => createPortfolio(client, params)
  );
}
