import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logRequest, logResponse } from '../utils/logger.js';

const PROMPT_NAME = 'teamstorm_analyze_folder_comments';

const argsSchema = {
  workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  folderName: z
    .string()
    .describe('Имя или ID папки, комментарии в задачах которой нужно проанализировать'),
};

export function registerAnalyzeFolderCommentsPrompt(server: McpServer) {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Анализ комментариев задач в папке',
      description:
        'Собрать и проанализировать комментарии ко всем задачам внутри папки: темы обсуждений, action items и блокеры.',
      argsSchema,
    },
    (args) => {
      logRequest(PROMPT_NAME, args);
      const { workspace, folderName } = args;

      const text = `Проанализируй комментарии ко всем задачам в папке "${folderName}" пространства ${workspace} и составь сводку по темам и action items.

Выполни шаги строго по порядку:
1. Вызови teamstorm_find_folder с workspace="${workspace}" и запросом "${folderName}", чтобы определить ID папки.
2. Вызови teamstorm_list_tasks_by_parent для найденной папки (workspace="${workspace}"), чтобы получить список всех её задач.
3. Для КАЖДОЙ задачи из полученного списка вызови teamstorm_list_task_comments (workspace="${workspace}", taskId=<ID задачи>). Не ограничивайся первой задачей — обойди все задачи из шага 2.

По итогам собери единую сводку по комментариям всех задач:
- Основные темы обсуждений.
- Action items и нерешённые вопросы (с указанием задачи).
- Общие блокеры и риски, если они упоминаются.`;

      logResponse(PROMPT_NAME, true);
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    }
  );
}
