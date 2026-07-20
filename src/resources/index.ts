import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../client/teamstorm.js';
import { registerTaskResource } from './task.js';
import { registerDocumentResource } from './document.js';
import { registerFolderTreeResource } from './folder-tree.js';

export { registerTaskResource, registerDocumentResource, registerFolderTreeResource };

/**
 * Регистрирует все MCP-ресурсы на переданном сервере.
 * Ресурсы — это read-path для тех же данных, что отдают инструменты get_* (задача, документ,
 * дерево папок). Они вызывают TeamStormClient, поэтому получают session-scoped клиент, как и
 * инструменты. Существующие инструменты при этом остаются без изменений.
 */
export function registerAllResources(server: McpServer, client: TeamStormClient) {
  registerTaskResource(server, client);
  registerDocumentResource(server, client);
  registerFolderTreeResource(server, client);
}
