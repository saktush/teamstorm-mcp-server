import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormTask } from '../../client/types.js';

export const listTasksByParentSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe('URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    parent: z.string().describe('Ключ или идентификатор родительского элемента (папки или задачи)'),
    withSubItems: z
      .boolean()
      .optional()
      .default(false)
      .describe('Включить подзадачи (по умолчанию: false)'),
  })
  .strict();

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
    logRequest('teamstorm_list_tasks_by_parent', { workspace, parent });
    const tasks: TeamStormTask[] = await client.listTasksByParent({
      workspace: args.workspace,
      parent: args.parent,
      withSubItems: args.withSubItems,
    });
    const duration = Date.now() - startTime;

    logResponse('teamstorm_list_tasks_by_parent', true, duration);

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

    const tasksText = tasks
      .map(
        (task, index) =>
          `**${index + 1}. ${task.key}: ${task.name}**\n` +
          `   📊 Статус: ${task.status.name}\n` +
          `   👤 Исполнитель: ${task.assignee?.displayName || 'Не назначен'}\n` +
          `   📂 Папка: ${task.folder?.name || '—'}\n` +
          `   🏷️ Тип: ${task.type.name}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `📋 Задачи в элементе ${args.parent} (${tasks.length} шт.):\n\n${tasksText}`,
        },
      ],
      structuredContent: { items: tasks },
    };
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
    'teamstorm_list_tasks_by_parent',
    {
      title: 'Получить задачи по родительскому элементу',
      description:
        'Получить список задач по родительскому элементу (папке или задаче). Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: listTasksByParentSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof listTasksByParentSchema>) => listTasksByParent(client, params)
  );
}
