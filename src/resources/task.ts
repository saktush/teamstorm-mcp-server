import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../client/teamstorm.js';
import { formatTaskMarkdown } from '../utils/formatters.js';
import { logRequest, logResponse, logError } from '../utils/logger.js';
import { toMcpError } from './to-mcp-error.js';

const RESOURCE_NAME = 'teamstorm-task';
const URI_TEMPLATE = 'teamstorm://{workspace}/tasks/{taskId}';

export function registerTaskResource(server: McpServer, client: TeamStormClient) {
  server.registerResource(
    RESOURCE_NAME,
    new ResourceTemplate(URI_TEMPLATE, { list: undefined }),
    {
      title: 'Задача TeamStorm',
      description: 'Задача в формате Markdown по URI teamstorm://{workspace}/tasks/{taskId}',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const workspace = String(variables.workspace);
      const taskId = String(variables.taskId);
      const startTime = Date.now();
      try {
        logRequest(`resource:${RESOURCE_NAME}`, { workspace, taskId });
        const task = await client.getTask(taskId, workspace);
        logResponse(`resource:${RESOURCE_NAME}`, true, Date.now() - startTime);
        return {
          contents: [{ uri: uri.href, mimeType: 'text/markdown', text: formatTaskMarkdown(task) }],
        };
      } catch (error) {
        logError(error as Error, { workspace, taskId });
        throw toMcpError(error, `Не удалось получить задачу ${taskId}`);
      }
    }
  );
}
