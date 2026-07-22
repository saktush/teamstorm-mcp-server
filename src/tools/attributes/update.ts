import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatAttributeModel } from './format.js';

export const updateAttributeSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    attributeId: z.string().describe('UUID атрибута'),
    name: z.string().optional().describe('Новое название атрибута'),
    description: z.string().optional().describe('Новое описание атрибута'),
    options: z
      .array(
        z
          .object({
            id: z
              .string()
              .optional()
              .describe('UUID существующей опции. Не указывайте, чтобы добавить новую опцию.'),
            name: z.string().describe('Название опции'),
          })
          .strict()
      )
      .optional()
      .describe(
        'Полный список опций атрибута (для UniSelect/Tag). Опции без id создаются, с id — обновляются; отсутствующие в списке удаляются.'
      ),
  })
  .strict();

export async function updateAttribute(
  client: TeamStormClient,
  params: z.infer<typeof updateAttributeSchema>
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
    logRequest('teamstorm_attributes_update', { workspace, attributeId, ...body });
    const attribute = await client.patchAttribute(attributeId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_attributes_update', true, duration);

    return {
      content: [
        { type: 'text', text: `✅ Атрибут обновлён\n\n${formatAttributeModel(attribute)}` },
      ],
      structuredContent: attribute as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, attributeId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при обновлении атрибута: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdateAttributeTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_attributes_update',
    {
      title: 'Обновить атрибут',
      description:
        'Изменить название, описание или набор опций существующего атрибута TeamStorm. Передавайте только изменяемые поля. Для точечного добавления/переименования одной опции используйте teamstorm_attributes_add_option / teamstorm_attributes_update_option.',
      inputSchema: updateAttributeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updateAttribute(client, params)
  );
}
