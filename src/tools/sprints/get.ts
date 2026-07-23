import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormSprint } from '../../client/types.js';

export const getSprintSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    sprintId: z.string().describe('UUID спринта'),
  })
  .strict();

const STATE_LABELS: Record<string, string> = {
  New: 'Новый',
  Active: 'Активный',
  Completed: 'Завершён',
};

/**
 * "Капасити" не отдаётся API отдельным полем — считается на клиенте из
 * workdays спринта и daysOff/hoursPerDay каждого участника команды
 * (стандартная agile-формула). Отрицательный остаток дней (daysOff > workdays)
 * не считается ошибкой участника, а даёт 0 часов для него.
 */
export function computeSprintCapacity(sprint: TeamStormSprint): {
  totalHours: number;
  perMember: Array<{ displayName: string; hours: number }>;
} {
  const workdays = sprint.workdays ?? 0;
  const perMember = (sprint.team ?? []).map((member) => {
    const availableDays = Math.max(0, workdays - member.daysOff);
    return {
      displayName: member.user.displayName,
      hours: availableDays * member.hoursPerDay,
    };
  });
  const totalHours = perMember.reduce((sum, m) => sum + m.hours, 0);
  return { totalHours, perMember };
}

export function formatSprintDetailMarkdown(sprint: TeamStormSprint): string {
  const lines: string[] = [];
  lines.push(`# ${sprint.name}${sprint.isBacklog ? ' (беклог)' : ''}`);
  lines.push('');
  lines.push(`**ID**: \`${sprint.id}\``);

  if (sprint.state) {
    lines.push(`**Статус**: ${STATE_LABELS[sprint.state] ?? sprint.state}`);
  }

  if (sprint.startDate) {
    lines.push(`**Начало**: ${new Date(sprint.startDate).toLocaleDateString('ru-RU')}`);
  }

  if (sprint.endDate) {
    lines.push(`**Конец**: ${new Date(sprint.endDate).toLocaleDateString('ru-RU')}`);
  }

  if (sprint.workdays != null) {
    lines.push(`**Рабочих дней**: ${sprint.workdays}`);
  }

  if (sprint.description) {
    lines.push(`**Цель**: ${sprint.description}`);
  }

  if (sprint.team && sprint.team.length > 0) {
    const { totalHours, perMember } = computeSprintCapacity(sprint);
    lines.push('');
    lines.push(
      `## Капасити команды (вычислено: (рабочих дней − отсутствий) × часов/день, не поле API)`
    );
    for (const m of perMember) {
      lines.push(`- ${m.displayName}: ${m.hours} ч`);
    }
    lines.push(`**Итого**: ${totalHours} ч`);
  }

  return lines.join('\n');
}

export async function getSprint(
  client: TeamStormClient,
  params: z.infer<typeof getSprintSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, sprintId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_sprints_get', { workspace, sprintId });
    const sprint = await client.getSprint(sprintId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_sprints_get', true, duration);

    const { totalHours, perMember } = computeSprintCapacity(sprint);

    return {
      content: [{ type: 'text', text: formatSprintDetailMarkdown(sprint) }],
      structuredContent: {
        ...sprint,
        capacity: { totalHours, perMember },
      } as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, sprintId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении спринта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetSprintTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_sprints_get',
    {
      title: 'Получить спринт',
      description:
        'Получить спринт TeamStorm по UUID: даты, статус, цель, команда и вычисленное капасити (сумма (рабочих дней − отсутствий) × часов/день по каждому участнику — не отдельное поле API).',
      inputSchema: getSprintSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getSprintSchema>) => getSprint(client, params)
  );
}
