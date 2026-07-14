import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatAttributeModel } from './format.js';

export const addAttributeOptionSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    attributeId: z.string().describe('UUID атрибута (тип UniSelect или Tag)'),
    name: z.string().describe('Название новой опции'),
    id: z
      .string()
      .uuid()
      .optional()
      .describe('UUID новой опции. Обычно не указывается — ID генерируется сервером.'),
  })
  .strict();

export async function addAttributeOption(
  client: TeamStormClient,
  params: z.infer<typeof addAttributeOptionSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, attributeId, ...body } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_add_attribute_option', { workspace, attributeId, name: body.name });
    const attribute = await client.addAttributeOption(attributeId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_add_attribute_option', true, duration);

    return {
      content: [{ type: 'text', text: `✅ Опция добавлена\n\n${formatAttributeModel(attribute)}` }],
      structuredContent: attribute as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, attributeId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при добавлении опции: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerAddAttributeOptionTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_add_attribute_option',
    {
      title: 'Добавить опцию атрибута',
      description:
        'Добавить новую опцию (значение из списка) к атрибуту типа UniSelect или Tag. Возвращает атрибут с обновлённым списком опций.',
      inputSchema: addAttributeOptionSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => addAttributeOption(client, params)
  );
}
