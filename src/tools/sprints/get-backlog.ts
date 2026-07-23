import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { computeSprintCapacity, formatSprintDetailMarkdown } from './get.js';

export const getBacklogSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    folderId: z.string().describe('UUID папки (folder), беклог которой нужно получить'),
  })
  .strict();

export async function getBacklog(
  client: TeamStormClient,
  params: z.infer<typeof getBacklogSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, folderId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_sprints_get_backlog', { workspace, folderId });
    const result = await client.listSprints(workspace, { folderId });
    const duration = Date.now() - startTime;
    logResponse('teamstorm_sprints_get_backlog', true, duration);

    const matches = result.items.filter((s) => s.isBacklog);

    if (matches.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text:
              `❌ Беклог для папки ${folderId} не найден. У папки нет Agile-борда — ` +
              `создайте его через teamstorm_agile_boards_create.`,
          },
        ],
        isError: true,
      };
    }

    if (matches.length > 1) {
      const candidates = matches.map((s) => `  - ${s.name} (\`${s.id}\`)`).join('\n');
      return {
        content: [
          {
            type: 'text',
            text: `❌ Найдено несколько беклогов для папки ${folderId}:\n${candidates}`,
          },
        ],
        isError: true,
      };
    }

    const backlog = matches[0];
    const { totalHours, perMember } = computeSprintCapacity(backlog);

    return {
      content: [{ type: 'text', text: formatSprintDetailMarkdown(backlog) }],
      structuredContent: {
        ...backlog,
        capacity: { totalHours, perMember },
      } as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, folderId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении беклога: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetBacklogTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_sprints_get_backlog',
    {
      title: 'Получить беклог папки',
      description:
        'Получить беклог TeamStorm для папки (folderId) — специальный спринт с флагом isBacklog=true. В API нет отдельного REST-ресурса «беклог»: инструмент фильтрует список спринтов папки. Если у папки ещё нет Agile-борда, вернёт ошибку с указанием создать его через teamstorm_agile_boards_create.',
      inputSchema: getBacklogSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getBacklogSchema>) => getBacklog(client, params)
  );
}
