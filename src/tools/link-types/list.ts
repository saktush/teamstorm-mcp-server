import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormLinkTypeListResponse } from '../../client/types.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

export const listLinkTypesSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

export function formatLinkTypesMarkdown(data: TeamStormLinkTypeListResponse): string {
  const lines: string[] = [];

  lines.push(`# Типы связей (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Типы связей не найдены.');
    return lines.join('\n');
  }

  for (const type of data.items) {
    lines.push(`- **${type.name}**${type.key ? ` (${type.key})` : ''} — \`${type.id}\``);
  }

  return lines.join('\n');
}

export async function listLinkTypes(
  client: TeamStormClient,
  params: z.infer<typeof listLinkTypesSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, apiUrl } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_link_types', params);
    const result = await client.listLinkTypes(params.workspace);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_link_types', true, duration);
    logger.info({ count: result.items.length, durationMs: duration }, 'Link types retrieved');

    return {
      content: [
        {
          type: 'text',
          text: formatLinkTypesMarkdown(result),
        },
      ],
      structuredContent: {
        linkTypes: result.items,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка типов связей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListLinkTypesTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_link_types',
    {
      title: 'Получить список типов связей',
      description:
        'Получить список типов связей между задачами (например, «Связана», «Блокирует») в пространстве TeamStorm. Используется для определения linkTypeId при создании связи через teamstorm_create_task_link. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listLinkTypesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listLinkTypesSchema>) => listLinkTypes(client, params)
  );
}
