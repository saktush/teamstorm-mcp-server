import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormStatusCategoryListResponse } from '../../client/types.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

export const listStatusCategoriesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
  })
  .strict();
// Примечание: без параметра workspace — GET /status-categories глобальный эндпоинт,
// не привязанный к конкретному пространству (единственный такой в API).

export function formatStatusCategoriesMarkdown(data: TeamStormStatusCategoryListResponse): string {
  const lines: string[] = [];

  lines.push(`# Категории статусов (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Категории статусов не найдены.');
    return lines.join('\n');
  }

  for (const category of data.items) {
    lines.push(`- **${category.name}** — \`${category.id}\``);
  }

  return lines.join('\n');
}

export async function listStatusCategories(
  client: TeamStormClient,
  params: z.infer<typeof listStatusCategoriesSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { apiUrl } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_status_categories_list', params);
    const result = await client.listStatusCategories();
    const duration = Date.now() - startTime;

    logResponse('teamstorm_status_categories_list', true, duration);
    logger.info(
      { count: result.items.length, durationMs: duration },
      'Status categories retrieved'
    );

    return {
      content: [
        {
          type: 'text',
          text: formatStatusCategoriesMarkdown(result),
        },
      ],
      structuredContent: {
        statusCategories: result.items,
      },
    };
  } catch (error) {
    logError(error as Error, {});
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка категорий статусов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListStatusCategoriesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_status_categories_list',
    {
      title: 'Получить список категорий статусов',
      description:
        'Получить глобальный список категорий статусов (например, «К выполнению», «В работе», «Выполнено») — не привязан к конкретному пространству, в отличие от большинства других справочников.',
      inputSchema: listStatusCategoriesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listStatusCategoriesSchema>) =>
      listStatusCategories(client, params)
  );
}
