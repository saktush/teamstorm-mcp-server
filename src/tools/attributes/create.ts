import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { formatAttributeModel } from './format.js';

export const createAttributeSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().describe('Название атрибута'),
    type: z
      .enum(['UniString', 'Number', 'Date', 'UniSelect', 'Tag', 'User', 'TimeDuration'])
      .describe(
        'Тип атрибута. Опции (options) имеют смысл только для типов UniSelect и Tag (выбор из списка значений).'
      ),
    description: z.string().optional().describe('Описание атрибута'),
    options: z
      .array(z.object({ name: z.string().describe('Название опции') }).strict())
      .optional()
      .describe(
        'Список опций для атрибутов типа UniSelect/Tag. Каждая опция задаётся названием; ID генерируется сервером.'
      ),
  })
  .strict();

export async function createAttribute(
  client: TeamStormClient,
  params: z.infer<typeof createAttributeSchema>
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
    logRequest('teamstorm_attributes_create', { workspace, name: body.name, type: body.type });
    const attribute = await client.createAttribute(body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_attributes_create', true, duration);

    return {
      content: [{ type: 'text', text: `✅ Атрибут создан\n\n${formatAttributeModel(attribute)}` }],
      structuredContent: attribute as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, name: body.name });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании атрибута: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateAttributeTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_attributes_create',
    {
      title: 'Создать атрибут',
      description:
        'Создать новый пользовательский атрибут в пространстве TeamStorm. Для типов UniSelect/Tag можно сразу передать список опций.',
      inputSchema: createAttributeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => createAttribute(client, params)
  );
}
