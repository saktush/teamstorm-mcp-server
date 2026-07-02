import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import type { TeamStormDocumentPermission } from '../../client/types.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const listDocumentPermissionsSchema = z
  .object({
    apiUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'URL TeamStorm API в формате http://<host>/cwm/public/api/v1. Оставьте пустым, если URL предконфигурирован на сервере через TEAMSTORM_API_URL.'
      ),
    workspace: z.string().describe('Ключ или ID пространства (workspace)'),
    documentId: z.string().describe('Ключ или идентификатор документа (UUID)'),
  })
  .strict();

function formatPermission(p: TeamStormDocumentPermission): string[] {
  const lines: string[] = [];
  const subject =
    p.type === 'User'
      ? `👤 ${p.user?.displayName ?? p.userId ?? 'пользователь'}`
      : `👥 ${p.group?.name ?? p.groupId ?? 'группа'}`;
  lines.push(`**${subject}** — ${p.accessLevel}`);
  lines.push(`- ID разрешения: \`${p.permissionId}\``);
  lines.push('');
  return lines;
}

export async function listDocumentPermissions(
  client: TeamStormClient,
  params: z.infer<typeof listDocumentPermissionsSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_list_document_permissions', { workspace, documentId });
    const permissions = await client.listDocumentPermissions(documentId, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_list_document_permissions', true, duration);

    if (permissions.length === 0) {
      return {
        content: [{ type: 'text', text: 'Разрешения на документ не найдены.' }],
        structuredContent: { items: [], count: 0 },
      };
    }

    const lines: string[] = [];
    lines.push(`# Разрешения на документ (${permissions.length})\n`);
    for (const p of permissions) {
      lines.push(...formatPermission(p));
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { items: permissions, count: permissions.length },
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при получении разрешений документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerListDocumentPermissionsTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_list_document_permissions',
    {
      title: 'Разрешения на документ',
      description:
        'Получить список разрешений (доступов пользователей и групп) на документ TeamStorm.',
      inputSchema: listDocumentPermissionsSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params) => listDocumentPermissions(client, params)
  );
}
