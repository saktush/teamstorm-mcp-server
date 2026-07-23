import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { resolveLinkTypeId } from './resolve-link-type.js';

export const createTaskLinkSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    taskId: z.string().describe('Ключ или ID задачи-источника связи (например, TS-13 или UUID)'),
    linkedWorkitem: z
      .string()
      .describe('Ключ или ID задачи, с которой создаётся связь (например, TS-42 или UUID)'),
    linkTypeId: z
      .string()
      .optional()
      .describe('UUID типа связи. Укажите это ИЛИ linkTypeName.'),
    linkTypeName: z
      .string()
      .optional()
      .describe(
        'Название или ключ типа связи (например, «Связана» или «Relates») — будет найден автоматически через teamstorm_link_types_list. Укажите это ИЛИ linkTypeId.'
      ),
  })
  .strict();
// Note: "exactly one of linkTypeId/linkTypeName" is validated at runtime inside
// createTaskLink() below, not via .superRefine() on the schema — see the documented
// MCP-SDK gotcha in AGENTS.md (superRefine strips .shape, breaking inputSchema generation).

export async function createTaskLink(
  client: TeamStormClient,
  params: z.infer<typeof createTaskLinkSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, taskId, linkedWorkitem, linkTypeId, linkTypeName } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  if (linkTypeId && linkTypeName) {
    return {
      content: [
        {
          type: 'text',
          text: '❌ Укажите только один из параметров: linkTypeId или linkTypeName.',
        },
      ],
      isError: true,
    };
  }

  try {
    logRequest('teamstorm_task_links_create', {
      workspace,
      taskId,
      linkedWorkitem,
      linkTypeId,
      linkTypeName,
    });
    const resolvedTypeId = await resolveLinkTypeId(client, { workspace, linkTypeId, linkTypeName });
    const link = await client.createTaskLink(
      taskId,
      { type: resolvedTypeId, linkedWorkitem },
      workspace
    );
    const duration = Date.now() - startTime;
    logResponse('teamstorm_task_links_create', true, duration);

    return {
      content: [
        {
          type: 'text',
          text:
            `✅ Задача ${taskId} связана с ${link.linkedWorkitem.key}: ${link.linkedWorkitem.name}\n` +
            `   🔗 Тип связи: ${link.type.name}${link.type.key ? ` (${link.type.key})` : ''}`,
        },
      ],
      structuredContent: link as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, taskId, linkedWorkitem, linkTypeId, linkTypeName });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании связи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateTaskLinkTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_task_links_create',
    {
      title: 'Создать связь между задачами',
      description:
        'Создать связь между задачей и другой задачей. Тип связи можно указать напрямую через linkTypeId (UUID) или по названию/ключу через linkTypeName (например, «Связана»/«Relates») — он будет найден автоматически. Создание одной и той же связи дважды создаёт две отдельные связи (не идемпотентно).',
      inputSchema: createTaskLinkSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof createTaskLinkSchema>) => createTaskLink(client, params)
  );
}
