import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logRequest, logResponse, logError } from '../../utils/logger.js';

export const shareDocumentSchema = z
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
    type: z.enum(['User', 'Group']).describe('Тип субъекта доступа: User или Group'),
    accessLevel: z
      .enum(['Read', 'Edit', 'Comment'])
      .describe('Уровень доступа: Read, Edit или Comment'),
    userId: z.string().optional().describe('UUID пользователя (обязателен при type=User)'),
    groupId: z.string().optional().describe('UUID группы (обязателен при type=Group)'),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.type === 'User' && !val.userId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'userId обязателен при type=User' });
    }
    if (val.type === 'Group' && !val.groupId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'groupId обязателен при type=Group' });
    }
  });

export async function shareDocument(
  client: TeamStormClient,
  params: z.infer<typeof shareDocumentSchema>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const { apiUrl: _apiUrl, workspace, documentId, ...body } = params;
  const startTime = Date.now();

  if (_apiUrl) {
    client.setBaseUrl(_apiUrl);
  }

  try {
    logRequest('teamstorm_share_document', { workspace, documentId, ...body });
    const permission = await client.createDocumentPermission(documentId, body, workspace);
    const duration = Date.now() - startTime;
    logResponse('teamstorm_share_document', true, duration);

    const subject = body.type === 'User' ? `пользователю ${body.userId}` : `группе ${body.groupId}`;
    const text =
      `✅ Доступ к документу выдан ${subject}\n\n` +
      `- Уровень: ${body.accessLevel}\n` +
      `- ID разрешения: \`${permission?.permissionId ?? '—'}\``;

    return {
      content: [{ type: 'text', text }],
      structuredContent: permission as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logError(error as Error, { workspace, documentId });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при выдаче доступа к документу: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        },
      ],
      isError: true,
    };
  }
}

export function registerShareDocumentTool(server: McpServer, client: TeamStormClient) {
  server.registerTool(
    'teamstorm_share_document',
    {
      title: 'Выдать доступ к документу',
      description:
        'Выдать пользователю (type=User, userId) или группе (type=Group, groupId) доступ к документу TeamStorm с уровнем Read, Edit или Comment.',
      inputSchema: shareDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => shareDocument(client, params)
  );
}
