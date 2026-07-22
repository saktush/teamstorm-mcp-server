import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const updateFolderSchema = z
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
    name: z.string().max(255).optional().describe('Новое название папки (до 255 символов)'),
    description: z.string().optional().describe('Новое описание папки'),
    parentId: z
      .string()
      .optional()
      .describe('UUID новой родительской папки — перемещает папку в другую папку.'),
  })
  .strict();

export async function updateFolder(
  client: TeamStormClient,
  params: z.infer<typeof updateFolderSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, folderId, ...body } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_folders_update', { workspace, folderId, ...body });
    const folder = await client.patchFolder(folderId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_folders_update', true, duration);

    const lines: string[] = [];
    lines.push(`✅ Папка обновлена\n`);
    lines.push(`# Папка: ${folder.name}\n`);
    lines.push(`- **ID:** \`${folder.id}\``);
    if (folder.parentId) lines.push(`- **Родитель:** \`${folder.parentId}\``);
    if (folder.description) lines.push(`- **Описание:** ${folder.description}`);

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
          text: `❌ Ошибка при обновлении папки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdateFolderTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_folders_update',
    {
      title: 'Обновить папку',
      description:
        'Изменить название, описание или родительскую папку (перемещение) существующей папки TeamStorm. Передавайте только изменяемые поля.',
      inputSchema: updateFolderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updateFolder(client, params)
  );
}
