import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const updateDocumentPermissionSchema = z
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
    permissionId: z
      .string()
      .describe('ID разрешения (см. teamstorm_document_permissions_list)'),
    accessLevel: z
      .enum(['Read', 'Edit', 'Comment'])
      .describe('Новый уровень доступа: Read, Edit или Comment'),
  })
  .strict();

export async function updateDocumentPermission(
  client: TeamStormClient,
  params: z.infer<typeof updateDocumentPermissionSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl, workspace, documentId, permissionId, accessLevel } = params;
  const startTime = Date.now();

  if (apiUrl) {
    client.setBaseUrl(apiUrl);
  }

  try {
    logRequest('teamstorm_document_permissions_update', {
      workspace,
      documentId,
      permissionId,
      accessLevel,
    });
    const permission = await client.patchDocumentPermission(
      documentId,
      permissionId,
      { accessLevel },
      workspace
    );
    const duration = Date.now() - startTime;
    logResponse('teamstorm_document_permissions_update', true, duration);

    const text =
      `✅ Разрешение обновлено\n\n` +
      `- ID разрешения: \`${permissionId}\`\n` +
      `- Новый уровень доступа: ${accessLevel}`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: permission as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId, permissionId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при обновлении разрешения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerUpdateDocumentPermissionTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_document_permissions_update',
    {
      title: 'Изменить уровень доступа к документу',
      description:
        'Изменить уровень доступа существующего разрешения на документ TeamStorm (Read, Edit или Comment).',
      inputSchema: updateDocumentPermissionSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => updateDocumentPermission(client, params)
  );
}
