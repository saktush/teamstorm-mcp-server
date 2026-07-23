import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormSprintListResponse } from '../../client/types.js';
import { logRequest, logResponse, logError, logger } from '../../utils/logger.js';

const ListSprintsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    status: z
      .enum(['active', 'completed', 'future'])
      .optional()
      .describe('Фильтр по статусу спринта'),
  })
  .strict();

export function formatSprintsMarkdown(data: TeamStormSprintListResponse): string {
  const lines: string[] = [];

  lines.push(`# Список спринтов (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Спринты не найдены.');
    return lines.join('\n');
  }

  for (const sprint of data.items) {
    lines.push(`## ${sprint.name}`);
    lines.push('');
    lines.push(`**ID**: ${sprint.id}`);

    if (sprint.startDate) {
      lines.push(`**Начало**: ${new Date(sprint.startDate).toLocaleDateString('ru-RU')}`);
    }

    if (sprint.endDate) {
      lines.push(`**Конец**: ${new Date(sprint.endDate).toLocaleDateString('ru-RU')}`);
    }

    if (sprint.description) {
      lines.push(`**Цель**: ${sprint.description}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

export async function listSprints(
  client: TeamStormClient,
  params: z.infer<typeof ListSprintsSchema>
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
    logRequest('teamstorm_sprints_list', params);
    const result = await client.listSprints(params.workspace);
    const duration = Date.now() - startTime;

    logResponse('teamstorm_sprints_list', true, duration);

    // Apply status filter if provided
    let filteredSprints = result.items;
    if (params.status) {
      const now = new Date();
      filteredSprints = result.items.filter((sprint) => {
        if (!sprint.startDate || !sprint.endDate) return false;
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);

        switch (params.status) {
          case 'active':
            return now >= start && now <= end;
          case 'completed':
            return now > end;
          case 'future':
            return now < start;
          default:
            return true;
        }
      });
    }

    logger.info({ count: filteredSprints.length, durationMs: duration }, 'Sprints retrieved');

    const markdown = formatSprintsMarkdown({
      ...result,
      items: filteredSprints,
    });

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      structuredContent: {
        sprints: filteredSprints,
      },
    };
  } catch (error) {
    logError(error as Error, { workspace: params.workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении списка спринтов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
    };
  }
}

export { ListSprintsSchema as listSprintsSchema };

export function registerListSprintsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_sprints_list',
    {
      title: 'Получить список спринтов',
      description:
        'Получить список спринтов в пространстве TeamStorm. Если workspace не указан, используется TEAMSTORM_WORKSPACE.',
      inputSchema: ListSprintsSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof ListSprintsSchema>) => listSprints(client, params)
  );
}
