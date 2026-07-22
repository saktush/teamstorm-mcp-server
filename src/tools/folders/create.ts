import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const createFolderSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    name: z.string().max(255).describe('Название папки (до 255 символов)'),
    description: z.string().optional().describe('Описание папки'),
    parentId: z
      .string()
      .optional()
      .describe('UUID родительской папки. Не указывайте, чтобы создать папку в корне пространства.'),
  })
  .strict();

export async function createFolder(
  client: TeamStormClient,
  params: z.infer<typeof createFolderSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, ...body } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_folders_create', { workspace, name: body.name });
    const folder = await client.createFolder(body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_folders_create', true, duration);

    const lines: string[] = [];
    lines.push(`✅ Папка создана\n`);
    lines.push(`# Папка: ${folder.name}\n`);
    lines.push(`- **ID:** \`${folder.id}\``);
    if (folder.parentId) lines.push(`- **Родитель:** \`${folder.parentId}\``);
    if (folder.description) lines.push(`- **Описание:** ${folder.description}`);

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: folder as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, name: body.name });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при создании папки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerCreateFolderTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_folders_create',
    {
      title: 'Создать папку',
      description:
        'Создать новую папку в пространстве TeamStorm. Укажите parentId, чтобы вложить папку в другую; без него папка создаётся в корне.',
      inputSchema: createFolderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => createFolder(client, params)
  );
}
