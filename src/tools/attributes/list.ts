import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type {
  TeamStormAttributeModelListResponse,
  TeamStormAttributeModel,
} from '../../client/types.js';

export const listAttributesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или идентификатор пространства'),
    name: z
      .string()
      .optional()
      .describe(
        'Фильтр по названию на стороне TeamStorm (поиск по вхождению подстроки; при isFullNameMatching=true — полное совпадение)'
      ),
    type: z
      .enum(['UniString', 'Number', 'Date', 'UniSelect', 'Tag', 'User', 'TimeDuration'])
      .optional()
      .describe('Фильтр по типу пользовательского атрибута на стороне TeamStorm.'),
    isFullNameMatching: z
      .boolean()
      .optional()
      .describe(
        'Если true, название атрибута должно полностью совпадать с name; фильтр применяется на стороне TeamStorm.'
      ),
    fromToken: z
      .string()
      .optional()
      .describe(
        'Курсор страницы API: передайте nextToken предыдущего ответа для получения следующей страницы'
      ),
    maxItemsCount: z
      .number()
      .optional()
      .default(50)
      .describe(
        'Максимальное количество атрибутов на странице (по умолчанию: 50; API допускает от 1 до 1000)'
      ),
  })
  .strict();

export function registerListAttributesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_attributes_list',
    {
      title: 'Получить список атрибутов пространства',
      description:
        'Получить список определений пользовательских атрибутов пространства TeamStorm с фильтрацией и пагинацией. Значения атрибутов конкретной задачи доступны через teamstorm_attributes_get. Параметр workspace обязателен: передайте ключ или ID пространства.',
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
    logRequest('teamstorm_attributes_list', {
      workspace: args.workspace,
      name: args.name,
      type: args.type,
      isFullNameMatching: args.isFullNameMatching,
      fromToken: args.fromToken,
      maxItemsCount: args.maxItemsCount,
    });
    const response: TeamStormAttributeModelListResponse = await client.listAttributes({
      workspace: args.workspace,
      name: args.name,
      type: args.type,
      isFullNameMatching: args.isFullNameMatching,
      fromToken: args.fromToken,
      maxItemsCount: args.maxItemsCount,
    });

    const duration = Date.now() - startTime;
    logResponse('teamstorm_attributes_list', true, duration);

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
        (attr: TeamStormAttributeModel, index: number) =>
          `**${index + 1}. ${attr.name}**\n` +
          `   🆔 ID: ${attr.id}\n` +
          `   📝 Описание: ${attr.description || '—'}\n` +
          `   🏷️ Тип: ${attr.type}\n` +
          // `workitemTypes` is required per AttributeModel, but keep the optional
          // chain as a defensive guard against the API omitting it anyway — F4
          // deleted the unsafe CAST, not this GUARD. Without it, one attribute
          // missing the field would throw mid-`.map()` and fail the whole list.
          `   🔧 Используется в типах задач: ${attr.workitemTypes?.map((t) => t.name).join(', ') || '—'}`
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
