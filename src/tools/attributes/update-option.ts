import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatAttributeModel } from './format.js';

export const updateAttributeOptionSchema = z
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
    id: z.string().uuid().describe('UUID изменяемой опции'),
    name: z.string().describe('Новое название опции'),
  })
  .strict();

export async function updateAttributeOption(
  client: TeamStormClient,
  params: z.infer<typeof updateAttributeOptionSchema>
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
    logRequest('teamstorm_attributes_update_option', {
      workspace,
      attributeId,
      id: body.id,
      name: body.name,
    });
    const attribute = await client.patchAttributeOption(attributeId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_attributes_update_option', true, duration);

    return {
      content: [{ type: 'text', text: `✅ Опция обновлена\n\n${formatAttributeModel(attribute)}` }],
      structuredContent: attribute as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, attributeId, id: body.id });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при обновлении опции: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdateAttributeOptionTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_attributes_update_option',
    {
      title: 'Обновить опцию атрибута',
      description:
        'Переименовать существующую опцию атрибута типа UniSelect или Tag по её UUID. Возвращает атрибут с обновлённым списком опций.',
      inputSchema: updateAttributeOptionSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updateAttributeOption(client, params)
  );
}
