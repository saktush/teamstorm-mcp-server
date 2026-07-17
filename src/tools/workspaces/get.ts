import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';
import type { TeamStormWorkspace } from '../../client/types.js';

export const getWorkspaceSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL. Передавайте только если сервер не имеет собственного URL или нужно подключиться к другому инстансу.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
  })
  .strict();

function formatWorkspaceMarkdown(workspace: TeamStormWorkspace): string {
  const lines: string[] = [];
  lines.push(`# ${workspace.name}`);
  lines.push('');
  lines.push(`**Ключ**: \`${workspace.key}\``);
  lines.push(`**ID**: \`${workspace.id}\``);
  if (workspace.description) {
    lines.push(`**Описание**: ${workspace.description}`);
  }
  if (workspace.author) {
    lines.push(`**Автор**: ${workspace.author.displayName}`);
  }
  return lines.join('\n');
}

export async function getWorkspace(
  client: TeamStormClient,
  params: z.infer<typeof getWorkspaceSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_workspace', { workspace });
    const result = await client.getWorkspace(workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_workspace', true, duration);

    return {
      content: [{ type: 'text', text: formatWorkspaceMarkdown(result) }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении пространства: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetWorkspaceTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_workspace',
    {
      title: 'Получить пространство',
      description:
        'Получить пространство (workspace) TeamStorm по ключу или ID: название, описание, автор. Внимание: этот эндпоинт (как и bare GET /workspaces) может отдавать 500-е ошибки на бэкендах с повреждённой записью автора workspace — см. AGENTS.md.',
      inputSchema: getWorkspaceSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params: z.infer<typeof getWorkspaceSchema>) => getWorkspace(client, params)
  );
}
