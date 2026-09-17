import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormTask } from '../../client/types.js';
import { OUTPUT_PARAMS_SHAPE, buildListResult } from '../../utils/output.js';
import {
  projectTask,
  TASK_FIELD_NAMES,
  TASK_DEFAULT_FIELDS,
  TASK_IDENTITY_FIELDS,
} from '../../utils/task-projection.js';

const baseListTasksByParentSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    parent: z.string().describe('Ключ или идентификатор родительского элемента (папки или задачи)'),
    withSubItems: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Включить все уровни вложенных подзадач (по умолчанию: false — только непосредственные дочерние задачи)'
      ),
  })
  .strict();

// Намеренно НЕТ fromToken: эндпоинт `/workitems/by-parent/{id}` возвращает голый
// массив и молча игнорирует fromToken/maxItemsCount. Объявить их значило бы соврать —
// поэтому потолок применяется на нашей стороне, а факт обрезки виден в hasMore.
export const listTasksByParentSchema = baseListTasksByParentSchema.extend(OUTPUT_PARAMS_SHAPE);

export async function listTasksByParent(
  client: TeamStormClient,
  args: z.infer<typeof listTasksByParentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { workspace, parent, apiUrl } = args;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_tasks_list_by_parent', { workspace, parent });
    const tasks: TeamStormTask[] = await client.listTasksByParent({
      workspace: args.workspace,
      parent: args.parent,
      withSubItems: args.withSubItems,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_tasks_list_by_parent', true, duration);

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `У родительского элемента ${args.parent} нет задач.`,
          },
        ],
      };
    }

    return buildListResult<TeamStormTask>({
      items: tasks,
      format: args.format,
      fields: args.fields,
      maxItems: args.maxItems,
      descriptionMaxChars: args.descriptionMaxChars,
      allowedFields: TASK_FIELD_NAMES,
      defaultFields: TASK_DEFAULT_FIELDS,
      identityFields: TASK_IDENTITY_FIELDS,
      project: projectTask,
      renderMarkdown: (rows, meta) => {
        const tasksText = rows
          .map(
            (task, index) =>
              `**${index + 1}. ${task.key}: ${task.name}**\n` +
              `   📊 Статус: ${task.status?.name || 'Без статуса'}\n` +
              `   👤 Исполнитель: ${task.assignee?.displayName || 'Не назначен'}\n` +
              `   📂 Папка: ${task.folder?.name || '—'}\n` +
              `   🏷️ Тип: ${task.type?.name || '—'}`
          )
          .join('\n\n');
        return `📋 Задачи в элементе ${args.parent} (${meta.returned} шт.):\n\n${tasksText}`;
      },
    });
  } catch (error) {
    logError(error as Error, { workspace: args.workspace, parent: args.parent });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении задач по родителю: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListTasksByParentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_tasks_list_by_parent',
    {
      title: 'Получить задачи по родительскому элементу',
      description:
        'Получить список задач по родительскому элементу (папке или задаче). Параметр workspace обязателен: передайте ключ или ID пространства. ' +
        'ВАЖНО: API не поддерживает постраничность для этого метода — он всегда отдаёт весь список, поэтому ограничение применяется на стороне MCP-сервера. ' +
        'Если в ответе hasMore=true, сузьте выборку (другой parent) или запросите format="json" с нужными fields.',
      inputSchema: listTasksByParentSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listTasksByParentSchema>) => listTasksByParent(client, params)
  );
}
