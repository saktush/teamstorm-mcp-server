import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormSprint, TeamStormCreateTaskRequest } from '../../client/types.js';
import { formatTaskMarkdown } from '../../utils/formatters.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

async function resolveFolderId(
  client: TeamStormClient,
  workspaceId: string,
  folderName: string
): Promise<string | undefined> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(folderName)) {
    return folderName;
  }

  const seen = new Map<string, string>();
  const lower = folderName.toLowerCase();
  let fromToken: string | undefined;

  for (let i = 0; i < 20; i++) {
    const page = await client.listTasks({
      workspace: workspaceId,
      maxItemsCount: 100,
      fromToken: fromToken,
    });

    for (const task of page.items) {
      if (task.folder && !seen.has(task.folder.id)) {
        seen.set(task.folder.id, task.folder.name);
        if (task.folder.name.toLowerCase().includes(lower)) {
          return task.folder.id;
        }
      }
    }

    if (!page.nextToken) break;
    fromToken = page.nextToken;
  }

  if (seen.size > 0) {
    logger.warn(
      { folderName, available: [...seen.entries()].map(([id, name]) => ({ id, name })) },
      'Folder not found'
    );
  } else {
    logger.warn({ workspaceId }, 'No folders found in workspace');
  }

  return undefined;
}

function isSprintActive(sprint: TeamStormSprint): boolean {
  if (!sprint.startDate || !sprint.endDate) return false;
  const now = new Date();
  return now >= new Date(sprint.startDate) && now <= new Date(sprint.endDate);
}

async function resolveSprintId(
  client: TeamStormClient,
  workspaceId: string,
  sprintInput: string | undefined
): Promise<string | undefined> {
  if (!sprintInput) {
    return undefined;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(sprintInput)) {
    return sprintInput;
  }

  const lower = sprintInput.toLowerCase();

  if (lower === 'текущий' || lower === 'активный') {
    const sprints = await client.listSprints(workspaceId);
    const active = sprints.items.filter(isSprintActive);
    if (active.length > 0) {
      return active[active.length - 1].id;
    }
    logger.warn({ workspaceId }, 'No active sprint found');
    return undefined;
  }

  const sprints = await client.listSprints(workspaceId);
  const match = sprints.items.find((s) => s.name.toLowerCase().includes(lower));
  if (match) {
    return match.id;
  }

  const available = sprints.items.map((s) => s.name).join(', ') || 'нет спринтов';
  throw new Error(`Sprint "${sprintInput}" not found. Available: ${available}`);
}

const CreateTaskSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().min(1).max(255).describe('Название задачи (обязательно, до 255 символов)'),
    description: z.string().optional().describe('Описание задачи в формате HTML'),
    type: z.string().describe('Тип задачи (название или ID, например "Дефект" или "User Story")'),
    workflow: z.string().optional().describe('Название или ID процесса'),
    status: z.string().optional().describe('Начальный статус задачи (название или ID)'),
    assignee: z.string().optional().describe('Исполнитель (логин пользователя или ID)'),
    parentId: z.string().describe('Папка (название, например "разработка"). Обязательно.'),
    sprintId: z
      .string()
      .optional()
      .describe(
        'Спринт (название, например "Спринт 26-10", или "текущий"/"активный" для последнего активного спринта). Если не указан — задача создаётся без спринта'
      ),
    originalEstimate: z.number().optional().describe('Оценка задачи в секундах'),
    storyPoints: z.number().optional().describe('Оценка задачи в Story Points'),
    attributes: z
      .array(
        z.object({
          type: z.string(),
          id: z.string(),
          value: z.unknown(),
        } as const)
      )
      .optional()
      .describe('Атрибуты задачи'),
    portfolioElementIds: z.array(z.string()).optional().describe('Список ID элементов портфеля'),
  })
  .strict();

export async function createTask(
  client: TeamStormClient,
  params: z.infer<typeof CreateTaskSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const startTime = Date.now();
  const { apiUrl } = params;

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  const { workspace, parentId: parentIdInput, sprintId: sprintIdInput, apiUrl: _apiUrl, ...taskData } = params;

  try {
    const workspaceId = workspace;

    const resolvedFolderId = await resolveFolderId(client, workspaceId, parentIdInput);
    if (!resolvedFolderId) {
      const topLevel = await client.listTasksByParent({
        workspace: workspaceId,
        parent: workspaceId,
        withSubItems: false,
      });
      const folders = topLevel.filter((item) => item.folder);

      if (folders.length > 0) {
        const list = folders.map((f, i) => `${i + 1}. **${f.name}** (ID: \`${f.id}\`)`).join('\n');
        return {
          content: [
            {
              type: 'text',
              text:
                `⚠️ Папка "${parentIdInput}" не найдена.\n\n` +
                `Доступные папки на верхнем уровне:\n${list}\n\n` +
                `Укажите \`parentId\` — ID нужной папки из списка выше.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Папка "${parentIdInput}" не найдена и нет доступных папок в workspace.`,
          },
        ],
        isError: true,
      };
    }

    const createPayload = {
      ...taskData,
      workspace: workspaceId,
      parentId: resolvedFolderId,
    } as TeamStormCreateTaskRequest & { workspace: string };

    if (sprintIdInput !== undefined) {
      const resolvedSprintId = await resolveSprintId(client, workspaceId, sprintIdInput);
      if (resolvedSprintId) {
        createPayload.sprintId = resolvedSprintId;
      }
    }

    logRequest('teamstorm_create_task', { ...createPayload });

    const result = await client.createTask(createPayload);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_create_task', true, duration);
    logger.info({ taskKey: result.key, durationMs: duration }, 'Task created');

    const markdown = formatTaskMarkdown(result);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Задача создана!\n\n${markdown}`,
        },
      ],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, {
      workspace,
      taskName: (params as z.infer<typeof CreateTaskSchema>).name,
    });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export { CreateTaskSchema as createTaskSchema };

export function registerCreateTaskTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_create_task',
    {
      title: 'Создать новую задачу',
      description:
        'Создать новую задачу в TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: CreateTaskSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof CreateTaskSchema>) => createTask(client, params)
  );
}
