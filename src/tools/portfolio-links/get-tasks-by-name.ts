import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getTasksByPortfolioElementNameSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    portfolioElementName: z.string().describe('Название элемента портфеля для поиска задач'),
    portfolioId: z
      .string()
      .optional()
      .describe('UUID портфеля — сужает поиск, если название неоднозначно'),
    folderId: z
      .string()
      .optional()
      .describe('UUID папки портфеля — сужает поиск, если название неоднозначно'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe('Максимальное количество задач на странице для каждого найденного элемента (по умолчанию: 50)'),
  })
  .strict();

export async function getTasksByPortfolioElementName(
  client: TeamStormClient,
  params: z.infer<typeof getTasksByPortfolioElementNameSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, portfolioElementName, portfolioId, folderId, maxItemsCount } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_tasks_by_portfolio_element_name', {
      workspace,
      portfolioElementName,
      portfolioId,
      folderId,
    });

    const elementsResult = await client.listPortfolioElements({
      workspace,
      name: portfolioElementName,
      portfolioId,
      folderId,
    });

    const exactMatches = elementsResult.items.filter((e) => e.name === portfolioElementName);
    const matches = exactMatches.length > 0 ? exactMatches : elementsResult.items;

    if (matches.length === 0) {
      const duration = Date.now() - startTime;
      logResponse('teamstorm_get_tasks_by_portfolio_element_name', true, duration);
      return {
        content: [
          {
            type: 'text',
            text: `Элементы портфеля с названием «${portfolioElementName}» не найдены.`,
          },
        ],
        structuredContent: { matches: [], count: 0 },
      };
    }

    const groups = await Promise.all(
      matches.map(async (element) => {
        const tasksResult = await client.listTasks({
          workspace,
          portfolioElementId: element.id,
          maxItemsCount,
        });
        return { element, tasks: tasksResult.items };
      })
    );

    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_tasks_by_portfolio_element_name', true, duration);

    const lines: string[] = [];
    lines.push(
      `# Задачи по элементам портфеля «${portfolioElementName}» (найдено элементов: ${groups.length})\n`
    );

    for (const group of groups) {
      lines.push(
        `## ${group.element.name} (портфель: ${group.element.portfolio.name}, \`${group.element.id}\`)\n`
      );
      if (group.tasks.length === 0) {
        lines.push('_Задач не найдено._\n');
      } else {
        for (const task of group.tasks) {
          const status = task.status ? task.status.name : 'без статуса';
          lines.push(`- **${task.key}: ${task.name}** — статус: ${status}`);
        }
        lines.push('');
      }
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        matches: groups.map((g) => ({ element: g.element, tasks: g.tasks })),
        count: groups.length,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace, portfolioElementName, portfolioId, folderId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при поиске задач по элементу портфеля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetTasksByPortfolioElementNameTool(
  server: McpServer,
  client: TeamStormClient
) {
  server.registerTool(
    'teamstorm_get_tasks_by_portfolio_element_name',
    {
      title: 'Получить задачи по названию элемента портфеля',
      description:
        'Найти элемент(ы) портфеля по названию и получить список задач, закреплённых за каждым найденным элементом. Если название соответствует нескольким элементам (в разных портфелях/папках), результаты группируются по каждому найденному элементу — используйте portfolioId/folderId, чтобы сузить поиск.',
      inputSchema: getTasksByPortfolioElementNameSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params) => getTasksByPortfolioElementName(client, params)
  );
}
