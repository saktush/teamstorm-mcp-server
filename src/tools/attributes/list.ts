import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type {
  TeamStormAttributeListResponse,
  TeamStormAttributeValue,
} from '../../client/types.js';

export const listAttributesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или идентификатор пространства'),
    name: z.string().optional().describe('Фильтр по названию (поиск по вхождению подстроки)'),
    type: z
      .string()
      .optional()
      .describe('Фильтр по типу: UniString, Number, Date, UniSelect, Tag, User, TimeDuration'),
    fromToken: z.string().optional().describe('Токен для пагинации'),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe('Максимальное количество (по умолчанию: 50)'),
  })
  .strict();

export function registerListAttributesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_attributes',
    {
      title: 'Получить список атрибутов пространства',
      description:
        'Получить список пользовательских атрибутов пространства TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listAttributesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listAttributesSchema>) => listAttributes(client, params)
  );
}

export async function listAttributes(
  client: TeamStormClient,
  args: z.infer<typeof listAttributesSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_attributes', { workspace: args.workspace, name: args.name, type: args.type, fromToken: args.fromToken, maxItemsCount: args.maxItemsCount });
    const response: TeamStormAttributeListResponse = await client.listAttributes({
      workspace: args.workspace,
      name: args.name,
      type: args.type,
      fromToken: args.fromToken,
      maxItemsCount: args.maxItemsCount,
    });

    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_attributes', true, duration);

    if (!response.items || response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Атрибуты пространства ${args.workspace} не найдены.`,
          },
        ],
      };
    }

    const attributesText = response.items
      .map(
        (attr: TeamStormAttributeValue, index: number) =>
          `**${index + 1}. ${attr.name}**\n` +
          `   🆔 ID: ${attr.id}\n` +
          `   📝 Описание: ${attr.description || '—'}\n` +
          `   🏷️ Тип: ${attr.type}\n` +
          `   🔧 Используется в типах задач: ${(attr as TeamStormAttributeValue & { workitemTypes?: Array<{ name: string }> }).workitemTypes?.map((t) => t.name).join(', ') || '—'}`
      )
      .join('\n\n');

    let paginationInfo = '';
    if (response.nextToken) {
      paginationInfo = `\n\n⚠️ Есть ещё атрибуты. Используйте fromToken="${response.nextToken}" для загрузки следующей страницы.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `🏷️ Атрибуты пространства ${args.workspace} (${response.items.length} шт.):\n\n${attributesText}${paginationInfo}`,
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace: args.workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении атрибутов пространства: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
