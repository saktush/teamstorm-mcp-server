import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { resolveAgileId } from './resolve-agile.js';

export const createSprintSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    folderId: z
      .string()
      .optional()
      .describe(
        'UUID папки — Agile-борд для неё будет найден автоматически. Укажите это ИЛИ agileId.'
      ),
    agileId: z
      .string()
      .optional()
      .describe('UUID Agile-борда напрямую. Укажите это ИЛИ folderId.'),
    name: z.string().describe('Название спринта'),
    description: z.string().optional().describe('Цель/описание спринта'),
    startDate: z.string().describe('Дата начала спринта (ISO 8601, например "2026-08-01T00:00:00Z")'),
    endDate: z.string().describe('Дата окончания спринта (ISO 8601)'),
    workdays: z.number().int().describe('Количество рабочих дней в спринте'),
    estimatedStoryPoints: z.number().int().describe('Планируемое количество story points на спринт'),
    copyViewsFromSprint: z
      .string()
      .optional()
      .describe('UUID спринта, из которого нужно скопировать настройки представлений (views)'),
    team: z
      .array(
        z.object({
          userId: z.string().describe('UUID пользователя'),
          daysOff: z.number().int().optional().describe('Дни отсутствия участника в спринте'),
          hoursPerDay: z.number().int().optional().describe('Часов в день у участника'),
        })
      )
      .describe('Команда спринта (может быть пустым массивом [])'),
  })
  .strict();
// Note: "exactly one of folderId/agileId" validated at runtime inside createSprint()
// below, not via .superRefine() on the schema — see the documented MCP-SDK gotcha in
// AGENTS.md (superRefine strips .shape, breaking inputSchema generation).

export async function createSprint(
  client: TeamStormClient,
  params: z.infer<typeof createSprintSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const {
    apiUrl,
    workspace,
    folderId,
    agileId,
    name,
    description,
    startDate,
    endDate,
    workdays,
    estimatedStoryPoints,
    copyViewsFromSprint,
    team,
  } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  if (!folderId && !agileId) {
    return {
      content: [{ type: 'text', text: '❌ Укажите folderId или agileId.' }],
      isError: true,
    };
  }

  try {
    logRequest('teamstorm_sprints_create', { workspace, folderId, agileId, name });
    const resolvedAgileId = await resolveAgileId(client, { workspace, folderId, agileId });

    const sprint = await client.createSprint(
      {
        agileId: resolvedAgileId,
        name,
        description,
        startDate,
        endDate,
        workdays,
        estimatedStoryPoints,
        copyViewsFromSprint,
        team,
      },
      workspace
    );
    const duration = Date.now() - startTime;
    logResponse('teamstorm_sprints_create', true, duration);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Спринт «${sprint.name}» создан (ID: \`${sprint.id}\`)`,
        },
      ],
      structuredContent: sprint as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, folderId, agileId, name });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании спринта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateSprintTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_sprints_create',
    {
      title: 'Создать спринт',
      description:
        'Создать спринт в TeamStorm. Требуется Agile-борд для папки — укажите folderId (борд найдётся автоматически) либо agileId напрямую. Если у папки ещё нет Agile-борда, вернётся ошибка с указанием создать его через teamstorm_agile_boards_create.',
      inputSchema: createSprintSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof createSprintSchema>) => createSprint(client, params)
  );
}
