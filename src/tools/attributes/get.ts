import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type {
  TeamStormAttributeListResponse,
  TeamStormAttributeValue,
} from '../../client/types.js';

export const getTaskAttributesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или идентификатор задачи (например, "TS-671" или UUID)'),
  })
  .strict();

export function registerGetTaskAttributesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_task_attributes',
    {
      title: 'Получить атрибуты задачи',
      description:
        'Получить значения атрибутов задачи. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: getTaskAttributesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getTaskAttributesSchema>) => getTaskAttributes(client, params)
  );
}

export async function getTaskAttributes(
  client: TeamStormClient,
  args: z.infer<typeof getTaskAttributesSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, taskId, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_task_attributes', { workspace, taskId });
    const response: TeamStormAttributeListResponse = await client.getTaskAttributes(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_get_task_attributes', true, duration);

    if (response.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У задачи ${args.taskId} нет заполненных атрибутов.`,
          },
        ],
      };
    }

    const attributesText = response.items
      .map((attr: TeamStormAttributeValue, index: number) => {
        let valueDisplay: string;

        if (attr.value === null || attr.value === undefined) {
          valueDisplay = '— (не заполнено)';
        } else if (typeof attr.value === 'object' && 'name' in attr.value) {
          valueDisplay = String(attr.value.name);
        } else if (Array.isArray(attr.value)) {
          valueDisplay = attr.value.join(', ');
        } else {
          valueDisplay = String(attr.value);
        }

        return (
          `**${index + 1}. ${attr.name}**\n` +
          `   📌 Тип: ${attr.type}\n` +
          `   🆔 ID: ${attr.id}\n` +
          `   📝 Описание: ${attr.description || '—'}\n` +
          `   💾 Значение: ${valueDisplay}`
        );
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `🏷️ Атрибуты задачи ${args.taskId} (${response.items.length} шт.):\n\n${attributesText}`,
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении атрибутов: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
