import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logRequest, logResponse } from '../utils/logger.js';

const PROMPT_NAME = 'teamstorm_sprint_standup_digest';

const argsSchema = {
  workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  sprintId: z.string().describe('ID спринта, по которому нужен дайджест'),
};

export function registerSprintStandupDigestPrompt(server: McpServer) {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Дайджест спринта для стендапа',
      description:
        'Подготовить дайджест по спринту для стендапа: что сделано со вчера, что в работе, что заблокировано.',
      argsSchema,
    },
    (args) => {
      logRequest(PROMPT_NAME, args);
      const { workspace, sprintId } = args;

      const text = `Подготовь дайджест для стендапа по спринту ${sprintId} в пространстве ${workspace}.

Выполни шаги строго по порядку:
1. Вызови teamstorm_get_sprint (workspace="${workspace}", sprintId="${sprintId}"), чтобы получить название, даты и цель спринта.
2. Вызови teamstorm_list_tasks с фильтром по спринту sprintId="${sprintId}" (workspace="${workspace}"), чтобы получить задачи спринта.
3. Вызови teamstorm_list_updated_tasks (workspace="${workspace}"), чтобы понять, что менялось за последние сутки.

Сформируй дайджест из трёх разделов:
- ✅ Сделано со вчерашнего дня — задачи, перешедшие в статус категории "Done"/завершённые (сопоставь с изменениями из teamstorm_list_updated_tasks).
- 🔄 В работе — задачи в статусах категории "In Progress".
- 🚫 Заблокировано — определи блокеры по статусу и категории статуса (отдельного поля "заблокировано" в API нет): задачи, застрявшие в открытых статусах без прогресса, либо явно помеченные заблокированными по статусу.`;

      logResponse(PROMPT_NAME, true);
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    }
  );
}
