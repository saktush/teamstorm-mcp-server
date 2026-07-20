import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAnalyzeFolderCommentsPrompt } from './analyze-folder-comments.js';
import { registerSprintStandupDigestPrompt } from './sprint-standup-digest.js';
import { registerDocumentReviewPackagePrompt } from './document-review-package.js';
import { registerTaskTriagePrompt } from './task-triage.js';

export {
  registerAnalyzeFolderCommentsPrompt,
  registerSprintStandupDigestPrompt,
  registerDocumentReviewPackagePrompt,
  registerTaskTriagePrompt,
};

/**
 * Регистрирует все MCP-промпты на переданном сервере.
 * Промпты — это шаблоны инструкций поверх существующих инструментов; они не вызывают
 * TeamStormClient и не требуют session-scoped клиента (в отличие от инструментов и ресурсов).
 */
export function registerAllPrompts(server: McpServer) {
  registerAnalyzeFolderCommentsPrompt(server);
  registerSprintStandupDigestPrompt(server);
  registerDocumentReviewPackagePrompt(server);
  registerTaskTriagePrompt(server);
}
