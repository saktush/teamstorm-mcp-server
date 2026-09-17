import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { formatDateTime } from '../../utils/dates.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import { OUTPUT_PARAMS_SHAPE, buildListResult } from '../../utils/output.js';
import {
  projectTimeEntry,
  TIME_ENTRY_FIELD_NAMES,
  TIME_ENTRY_DEFAULT_FIELDS,
  TIME_ENTRY_IDENTITY_FIELDS,
} from '../../utils/time-entry-projection.js';

const dateTimeMessage =
  'Укажите корректную дату и время ISO 8601 с часовым поясом, например 2026-09-01T00:00:00Z';
const dateTime = z
  .string()
  .datetime({ offset: true, message: dateTimeMessage })
  .refine((value) => Number.isFinite(Date.parse(value)), { message: dateTimeMessage });

export const listTimeEntriesByPeriodSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    startDate: dateTime.describe(
      'Начало периода выборки (включительно). Дата и время ISO 8601 с часовым поясом; рекомендуется UTC, например 2026-09-01T00:00:00Z.'
    ),
    endDate: dateTime
      .optional()
      .describe(
        'Конец периода выборки (включительно). Дата и время ISO 8601, например 2026-09-17T23:59:59+03:00.'
      ),
    users: z
      .string()
      .optional()
      .describe('Список логинов пользователей через запятую для фильтрации.'),
    fromToken: z.string().optional().describe('Токен пагинации для получения следующей страницы.'),
    maxItemsCount: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .default(50)
      .describe('Максимальное количество записей на странице (по умолчанию: 50, макс: 1000).'),
    ...OUTPUT_PARAMS_SHAPE,
  })
  .strict();

export function registerListTimeEntriesByPeriodTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_time_entries_list_by_period',
    {
      title: 'Получить записи учёта времени за период',
      description:
        'Получить список записей учёта времени за период по всему инстансу в пределах доступа токена. Границы периода включительны. Фильтр users — логины авторов через запятую. API не поддерживает фильтр по пространству или задаче. spentTime возвращается как исходное число: единица измерения в публичной спецификации не указана. Задачи и пользователи возвращаются компактными ссылками. Описание записи ограничено 4000 символами; описание задачи не возвращается. Следующую страницу запросите с nextToken в fromToken. Если truncatedByCap или truncatedByBytes равен true, повторите текущую страницу с меньшим maxItemsCount, прежде чем переходить дальше: nextToken относится ко всей странице API.',
      inputSchema: listTimeEntriesByPeriodSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => listTimeEntriesByPeriod(client, args)
  );
}

export async function listTimeEntriesByPeriod(
  client: TeamStormClient,
  args: z.infer<typeof listTimeEntriesByPeriodSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const started = Date.now();
  try {
    if (args.apiUrl) client.setBaseUrl(args.apiUrl);
    const { startDate, endDate, users, fromToken, maxItemsCount } = args;
    const query = { startDate, endDate, users, fromToken, maxItemsCount };
    logRequest('teamstorm_time_entries_list_by_period', query);
    const response = await client.listTimeEntriesByPeriod(query);
    logResponse('teamstorm_time_entries_list_by_period', true, Date.now() - started);
    return buildListResult({
      items: response.items,
      nextToken: response.nextToken,
      format: args.format,
      fields: args.fields,
      maxItems: args.maxItems,
      descriptionMaxChars: args.descriptionMaxChars,
      allowedFields: TIME_ENTRY_FIELD_NAMES,
      defaultFields: TIME_ENTRY_DEFAULT_FIELDS,
      identityFields: TIME_ENTRY_IDENTITY_FIELDS,
      project: projectTimeEntry,
      renderMarkdown: (rows, meta) => {
        const lines = [
          `⏱️ Записи учёта времени (${meta.returned})`,
          'spentTime — исходное число API; единица измерения в публичной спецификации не указана.',
        ];
        if (!rows.length) lines.push('За указанный период записей не найдено.');
        for (const row of rows) {
          const compact = projectTimeEntry(row, new Set(TIME_ENTRY_DEFAULT_FIELDS), {
            descriptionMaxChars: args.descriptionMaxChars ?? 500,
          });
          const task = compact.workitem as { key: string; name: string };
          const author = compact.author as { displayName: string; username: string };
          lines.push(
            `\n**${task.key}: ${task.name}**`,
            `📅 ${formatDateTime(row.date)} · spentTime: ${row.spentTime}`,
            `👤 ${author.displayName} (${author.username})`,
            `🆔 ${compact.id}`
          );
          if (compact.description) lines.push(`💬 ${compact.description}`);
          if (row.deletedAt !== null) lines.push(`Удалена: ${formatDateTime(row.deletedAt)}`);
        }
        return lines.join('\n');
      },
    });
  } catch (error) {
    logError(error as Error, { startDate: args.startDate, endDate: args.endDate });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении записей учёта времени за период: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
