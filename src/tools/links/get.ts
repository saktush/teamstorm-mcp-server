import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormLinkListResponse, TeamStormLink } from '../../client/types.js';
import { OUTPUT_PARAMS_SHAPE, buildListResult } from '../../utils/output.js';
import { projectTask, TASK_FIELD_NAMES } from '../../utils/task-projection.js';

// Каждая связь несёт ЦЕЛУЮ задачу в linkedWorkitem — то есть по HTML-описанию на связь.
const LINK_FIELD_NAMES = ['id', 'type', ...TASK_FIELD_NAMES] as const;
const LINK_DEFAULT_FIELDS = ['id', 'type', 'key', 'name', 'status', 'assignee'] as const;
const LINK_IDENTITY_FIELDS = ['id', 'type', 'key', 'name'] as const;

function projectLink(
  link: TeamStormLink,
  fields: Set<string>,
  opts: { descriptionMaxChars: number }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields.has('id')) out.id = link.id;
  if (fields.has('type')) {
    out.type = link.type ? { id: link.type.id, name: link.type.name, key: link.type.key } : null;
  }
  return { ...out, ...projectTask(link.linkedWorkitem, fields, opts) };
}

const baseGetTaskLinksSchema = z
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

export const getTaskLinksSchema = baseGetTaskLinksSchema.extend(OUTPUT_PARAMS_SHAPE);

export function registerGetTaskLinksTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_task_links_list',
    {
      title: 'Получить связанные задачи',
      description:
        'Получить связи задачи вместе с полной информацией о каждой связанной задаче (статус, исполнитель, папка, спринт и т.д.). Параметр workspace обязателен: передайте ключ или ID пространства.',
      inputSchema: getTaskLinksSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getTaskLinksSchema>) => getTaskLinks(client, params)
  );
}

export async function getTaskLinks(
  client: TeamStormClient,
  args: z.infer<typeof getTaskLinksSchema>
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
    logRequest('teamstorm_task_links_list', { workspace, taskId });
    const links: TeamStormLinkListResponse = await client.getTaskLinks(
      args.taskId,
      args.workspace
    );
    const duration = Date.now() - startTime;

    logResponse('teamstorm_task_links_list', true, duration);

    if (links.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У задачи ${args.taskId} нет связей.`,
          },
        ],
      };
    }

    return buildListResult<TeamStormLink>({
      items: links,
      format: args.format,
      fields: args.fields,
      maxItems: args.maxItems,
      descriptionMaxChars: args.descriptionMaxChars,
      allowedFields: LINK_FIELD_NAMES,
      defaultFields: LINK_DEFAULT_FIELDS,
      identityFields: LINK_IDENTITY_FIELDS,
      project: projectLink,
      renderMarkdown: (rows, meta) => {
        const linksText = rows
          .map((link, index) => {
            const t = link.linkedWorkitem;
            const status = t.status
              ? `${t.status.name} (${t.status.category?.name ?? 'Без категории'})`
              : 'Без статуса';
            const assignee = t.assignee ? t.assignee.displayName : 'Не назначен';
            return (
              `**${index + 1}. ${link.type.name}${link.type.key ? ` (${link.type.key})` : ''}**\n` +
              `   🔗 ${t.key}: ${t.name}\n` +
              `   📌 Статус: ${status}\n` +
              `   👤 Исполнитель: ${assignee}` +
              (t.folder ? `\n   📁 Папка: ${t.folder.name}` : '')
            );
          })
          .join('\n\n');
        return `🔗 Связи задачи ${args.taskId} (${meta.returned} шт.):\n\n${linksText}`;
      },
    });
  } catch (error) {
    logError(error as Error, { workspace, taskId: args.taskId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении связей: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
