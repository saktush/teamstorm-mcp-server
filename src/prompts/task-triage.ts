import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logRequest, logResponse } from '../utils/logger.js';

const PROMPT_NAME = 'teamstorm_task_triage';

const argsSchema = {
  workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  status: z
    .string()
    .optional()
    .describe('Фильтр по статусу задач (опционально). Если не задан — все открытые статусы.'),
  assignee: z
    .string()
    .optional()
    .describe('Фильтр по исполнителю (опционально). Если не задан — только неназначенные задачи.'),
};

export function registerTaskTriagePrompt(server: McpServer) {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Триаж задач',
      description:
        'Провести триаж задач с опциональными фильтрами по статусу и исполнителю и предложить приоритизацию.',
      argsSchema,
    },
    (args) => {
      logRequest(PROMPT_NAME, args);
      const { workspace, status, assignee } = args;

      const statusLine = status
        ? `- Статус: ${status}`
        : '- Статус: не задан → рассмотри все открытые статусы (не входящие в категорию Done).';
      const assigneeLine = assignee
        ? `- Исполнитель: ${assignee}`
        : '- Исполнитель: не задан → только неназначенные задачи (unassigned).';

      const text = `Проведи триаж задач в пространстве ${workspace}.

Параметры фильтрации:
${statusLine}
${assigneeLine}

Выполни шаги строго по порядку:
1. Вызови teamstorm_list_tasks (workspace="${workspace}") с фильтрами по статусу и исполнителю согласно параметрам выше.
2. Если для приоритизации нужны кастомные поля (severity, priority и т.п.), для каждой задачи вызови teamstorm_get_task_attributes (workspace="${workspace}", taskId=<ID задачи>). Если кастомные поля не нужны — пропусти этот шаг.

По итогам предложи приоритизацию: что взять в работу в первую очередь, что можно отложить, какие задачи требуют уточнения или назначения исполнителя.`;

      logResponse(PROMPT_NAME, true);
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    }
  );
}
