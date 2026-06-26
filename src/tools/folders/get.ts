import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const getFolderSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    folderId: z.string().describe('UUID папки'),
  })
  .strict();

export async function getFolder(
  client: TeamStormClient,
  params: z.infer<typeof getFolderSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, folderId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_get_folder', { workspace, folderId });
    const folder = await client.getFolder(folderId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_get_folder', true, duration);

    const lines: string[] = [];
    lines.push(`# Папка: ${folder.name}\n`);
    lines.push(`- **ID:** \`${folder.id}\``);
    if (folder.parentId) lines.push(`- **Родитель:** \`${folder.parentId}\``);
    if (folder.description) lines.push(`- **Описание:** ${folder.description}`);
    lines.push('');
    lines.push(
      `💡 Используйте \`teamstorm_list_tasks\` с параметром \`parent=${folder.id}\` чтобы получить задачи в этой папке.`
    );

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: folder as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, folderId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении папки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerGetFolderTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_get_folder',
    {
      title: 'Получить папку по ID',
      description: 'Получить информацию о папке TeamStorm по её UUID.',
      inputSchema: getFolderSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => getFolder(client, params)
  );
}
