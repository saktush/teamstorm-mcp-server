import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logRequest, logResponse } from '../utils/logger.js';

const PROMPT_NAME = 'teamstorm_document_review_package';

const argsSchema = {
  workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  documentId: z.string().describe('ID документа, для которого готовится пакет ревью'),
};

export function registerDocumentReviewPackagePrompt(server: McpServer) {
  server.registerPrompt(
    PROMPT_NAME,
    {
      title: 'Пакет ревью документа',
      description:
        'Собрать пакет для ревью документа и оценить готовность к согласованию: открытые комментарии, связанные задачи, статус.',
      argsSchema,
    },
    (args) => {
      logRequest(PROMPT_NAME, args);
      const { workspace, documentId } = args;

      const text = `Собери пакет для ревью документа ${documentId} в пространстве ${workspace} и оцени готовность к согласованию.

Выполни шаги строго по порядку:
1. Вызови teamstorm_get_document (workspace="${workspace}", documentId="${documentId}"), чтобы получить содержимое и текущий статус документа.
2. Вызови teamstorm_get_document_task_links (workspace="${workspace}", documentId="${documentId}"), чтобы получить связанные задачи.
3. Вызови teamstorm_list_document_comments (workspace="${workspace}", documentId="${documentId}"), чтобы получить комментарии.

Оформи результат как чек-лист готовности к согласованию:
- 💬 Открытые комментарии — нерешённые обсуждения, требующие ответа.
- 🔗 Связанные задачи — какие из них ещё не в статусе "Done"/не завершены (это блокирует согласование).
- 📄 Статус документа — текущий статус и чего не хватает для перевода в "утверждён".`;

      logResponse(PROMPT_NAME, true);
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    }
  );
}
