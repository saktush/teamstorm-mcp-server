import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatPortfolioElementModel } from '../portfolio-elements/format.js';
import { resolvePortfolioElementId } from './resolve.js';

export const setTaskPortfolioElementSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или ID задачи (например, TS-13 или UUID)'),
    portfolioElementId: z
      .string()
      .optional()
      .describe('UUID элемента портфеля. Укажите это ИЛИ portfolioElementName.'),
    portfolioElementName: z
      .string()
      .optional()
      .describe(
        'Название элемента портфеля — будет найден автоматически. Укажите это ИЛИ portfolioElementId.'
      ),
    portfolioId: z
      .string()
      .optional()
      .describe('UUID портфеля — сужает поиск по названию, если оно неоднозначно'),
    folderId: z
      .string()
      .optional()
      .describe('UUID папки портфеля — сужает поиск по названию, если оно неоднозначно'),
  })
  .strict();
// Note: "exactly one of portfolioElementId/portfolioElementName" is validated at runtime
// inside setTaskPortfolioElement() below, not via .superRefine() on the schema — chaining
// .superRefine() turns this into a ZodEffects instance without a `.shape`, which breaks the
// MCP SDK's JSON Schema generation for the tool (it silently advertises an empty {} schema
// to callers, see zod-compat.js normalizeObjectSchema/getObjectShape). Keep this a plain
// z.object(...).strict() so the exposed inputSchema stays accurate.

export async function setTaskPortfolioElement(
  client: TeamStormClient,
  params: z.infer<typeof setTaskPortfolioElementSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, taskId, portfolioElementId, portfolioElementName, portfolioId, folderId } =
    params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  if (portfolioElementId && portfolioElementName) {
    return {
      content: [
        {
          type: 'text',
          text: '❌ Укажите только один из параметров: portfolioElementId или portfolioElementName.',
        },
      ],
      isError: true,
    };
  }

  try {
    logRequest('teamstorm_portfolio_links_set', {
      workspace,
      taskId,
      portfolioElementId,
      portfolioElementName,
    });
    const resolvedId = await resolvePortfolioElementId(client, {
      workspace,
      portfolioElementId,
      portfolioElementName,
      portfolioId,
      folderId,
    });
    const element = await client.assignWorkitemToPortfolioElement(resolvedId, taskId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_portfolio_links_set', true, duration);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Задача ${taskId} закреплена за элементом портфеля\n\n${formatPortfolioElementModel(element)}`,
        },
      ],
      structuredContent: element as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId, portfolioElementId, portfolioElementName });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при закреплении задачи за элементом портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerSetTaskPortfolioElementTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_portfolio_links_set',
    {
      title: 'Закрепить задачу за элементом портфеля',
      description:
        'Закрепить (pin) задачу за элементом портфеля, не затрагивая остальные закрепления задачи. Укажите portfolioElementId напрямую или portfolioElementName для автоматического поиска (при неоднозначности уточните portfolioId/folderId).',
      inputSchema: setTaskPortfolioElementSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => setTaskPortfolioElement(client, params)
  );
}
