import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../client/teamstorm.js';
import { formatDocumentMarkdown } from '../utils/formatters.js';
import { logRequest, logResponse, logError } from '../utils/logger.js';
import { toMcpError } from './to-mcp-error.js';

const RESOURCE_NAME = 'teamstorm-document';
const URI_TEMPLATE = 'teamstorm://{workspace}/documents/{documentId}';

export function registerDocumentResource(server: McpServer, client: TeamStormClient) {
  server.registerResource(
    RESOURCE_NAME,
    new ResourceTemplate(URI_TEMPLATE, { list: undefined }),
    {
      title: 'Документ TeamStorm',
      description:
        'Документ (с содержимым) в формате Markdown по URI teamstorm://{workspace}/documents/{documentId}',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const workspace = String(variables.workspace);
      const documentId = String(variables.documentId);
      const startTime = Date.now();
      try {
        logRequest(`resource:${RESOURCE_NAME}`, { workspace, documentId });
        const doc = await client.getDocument(documentId, workspace);
        logResponse(`resource:${RESOURCE_NAME}`, true, Date.now() - startTime);
        return {
          contents: [
            { uri: uri.href, mimeType: 'text/markdown', text: formatDocumentMarkdown(doc, true) },
          ],
        };
      } catch (error) {
        logError(error as Error, { workspace, documentId });
        throw toMcpError(error, `Не удалось получить документ ${documentId}`);
      }
    }
  );
}
