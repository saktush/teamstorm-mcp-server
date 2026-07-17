#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import express from 'express';
import { promises as fsPromises } from 'fs';
import {
  getApiUrl,
  getWorkspace,
  getPort,
  getListenHost,
  getNodeEnv,
  getTrustProxy,
  getApiToken,
  maskToken,
} from './config.js';
import { hashToken, validateSessionToken } from './utils/session-auth.js';
import { validateUploadAuth } from './utils/upload-auth.js';
import { logger } from './utils/logger.js';
import { TeamStormClient } from './client/teamstorm.js';
import { parseUpload, UploadError } from './utils/upload-handler.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  registerListFoldersTool,
  registerGetFolderTool,
  registerGetFolderTreeTool,
  registerFindFolderTool,
  registerCreateFolderTool,
  registerUpdateFolderTool,
  registerListWorkspacesTool,
  registerCreateTimeEntryTool,
  registerListTimeEntriesTool,
  registerListTasksTool,
  registerGetTaskTool,
  registerCreateTaskTool,
  registerUpdateTaskTool,
  registerGetTaskCountTool,
  registerListTasksByParentTool,
  registerListUpdatedTasksTool,
  registerListUsersTool,
  registerListSprintsTool,
  registerListWorkflowsTool,
  registerListTaskTypesTool,
  registerListTaskCommentsTool,
  registerCreateTaskCommentTool,
  registerGetCommentVisibilityTool,
  registerGetTaskAttributesTool,
  registerListAttributesTool,
  registerCreateAttributeTool,
  registerUpdateAttributeTool,
  registerAddAttributeOptionTool,
  registerUpdateAttributeOptionTool,
  registerListTaskAttachmentsTool,
  registerGetTaskAttachmentTool,
  registerListAttachmentVersionsTool,
  registerGetAttachmentVersionTool,
  registerAttachUploadedFileTool,
  registerGetTaskPermissionsTool,
  registerGetTaskLinksTool,
  registerCreateTaskLinkTool,
  registerListLinkTypesTool,
  registerListStatusCategoriesTool,
  registerListWorkspaceStatusesTool,
  registerGetWorkspaceStatusTool,
  registerListDocumentsTool,
  registerGetDocumentTool,
  registerCreateDocumentTool,
  registerUpdateDocumentTool,
  registerBlockDocumentTool,
  registerUnblockDocumentTool,
  registerListDocumentPermissionsTool,
  registerShareDocumentTool,
  registerUpdateDocumentPermissionTool,
  registerListDocumentStatusesTool,
  registerGetDocumentStatusTool,
  registerGetDocumentTaskLinksTool,
  registerLinkDocumentToTaskTool,
  registerGetTaskDocumentLinksTool,
  registerListDocumentCommentsTool,
  registerCreateDocumentCommentTool,
  registerListPortfoliosTool,
  registerGetPortfolioTool,
  registerCreatePortfolioTool,
  registerUpdatePortfolioTool,
  registerListPortfolioElementsTool,
  registerGetPortfolioElementTool,
  registerCreatePortfolioElementTool,
  registerUpdatePortfolioElementTool,
  registerSetTaskPortfolioElementTool,
  registerRemoveTaskPortfolioElementTool,
  registerGetTasksByPortfolioElementNameTool,
} from './tools/index.js';

// OOB Upload temp directory
const UPLOAD_DIR = path.join(os.tmpdir(), 'teamstorm-uploads');
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  logger.error(
    { error: err instanceof Error ? err.message : String(err), dir: UPLOAD_DIR },
    'Failed to create upload directory'
  );
}

// Upload security limits
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB
const UPLOAD_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

async function cleanupOrphanedUploads(): Promise<void> {
  try {
    const entries = await fsPromises.readdir(UPLOAD_DIR);
    const now = Date.now();
    const counts = await Promise.all(
      entries.map(async (f) => {
        const fp = path.join(UPLOAD_DIR, f);
        try {
          const stat = await fsPromises.stat(fp);
          if (now - stat.mtimeMs > UPLOAD_TTL_MS) {
            await fsPromises.unlink(fp);
            return 1;
          }
        } catch {
          /* concurrent removal */
        }
        return 0;
      })
    );
    const cleaned = counts.reduce<number>((a, b) => a + b, 0);
    if (cleaned > 0) logger.info({ cleaned }, 'Cleaned up orphaned upload files');
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      'Upload cleanup failed'
    );
  }
}

function cleanupRateLimiter(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [ip, entry] of rateLimiter) {
    if (now > entry.resetTime) {
      rateLimiter.delete(ip);
      cleaned++;
    }
  }
  if (cleaned > 0) logger.debug({ cleaned }, 'Cleaned up stale rate limiter entries');
}

setInterval(
  () => {
    cleanupRateLimiter();
    cleanupOrphanedUploads().catch((err) =>
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Scheduled upload cleanup failed'
      )
    );
  },
  30 * 60 * 1000
);

function registerAllTools(server: McpServer, client: TeamStormClient) {
  registerListFoldersTool(server, client);
  registerGetFolderTool(server, client);
  registerGetFolderTreeTool(server, client);
  registerFindFolderTool(server, client);
  registerCreateFolderTool(server, client);
  registerUpdateFolderTool(server, client);
  registerListWorkspacesTool(server, client);
  registerCreateTimeEntryTool(server, client);
  registerListTimeEntriesTool(server, client);
  registerListTasksTool(server, client);
  registerGetTaskTool(server, client);
  registerCreateTaskTool(server, client);
  registerUpdateTaskTool(server, client);
  registerGetTaskCountTool(server, client);
  registerListTasksByParentTool(server, client);
  registerListUpdatedTasksTool(server, client);
  registerListUsersTool(server, client);
  registerListSprintsTool(server, client);
  registerListWorkflowsTool(server, client);
  registerListTaskTypesTool(server, client);
  registerListTaskCommentsTool(server, client);
  registerCreateTaskCommentTool(server, client);
  registerGetCommentVisibilityTool(server, client);
  registerGetTaskAttributesTool(server, client);
  registerListAttributesTool(server, client);
  registerCreateAttributeTool(server, client);
  registerUpdateAttributeTool(server, client);
  registerAddAttributeOptionTool(server, client);
  registerUpdateAttributeOptionTool(server, client);
  registerListTaskAttachmentsTool(server, client);
  registerGetTaskAttachmentTool(server, client);
  registerListAttachmentVersionsTool(server, client);
  registerGetAttachmentVersionTool(server, client);
  registerAttachUploadedFileTool(server, client);
  registerGetTaskPermissionsTool(server, client);
  registerGetTaskLinksTool(server, client);
  registerCreateTaskLinkTool(server, client);
  registerListLinkTypesTool(server, client);
  registerListStatusCategoriesTool(server, client);
  registerListWorkspaceStatusesTool(server, client);
  registerGetWorkspaceStatusTool(server, client);
  registerListDocumentsTool(server, client);
  registerGetDocumentTool(server, client);
  registerCreateDocumentTool(server, client);
  registerUpdateDocumentTool(server, client);
  registerBlockDocumentTool(server, client);
  registerUnblockDocumentTool(server, client);
  registerListDocumentPermissionsTool(server, client);
  registerShareDocumentTool(server, client);
  registerUpdateDocumentPermissionTool(server, client);
  registerListDocumentStatusesTool(server, client);
  registerGetDocumentStatusTool(server, client);
  registerGetDocumentTaskLinksTool(server, client);
  registerLinkDocumentToTaskTool(server, client);
  registerGetTaskDocumentLinksTool(server, client);
  registerListDocumentCommentsTool(server, client);
  registerCreateDocumentCommentTool(server, client);
  registerListPortfoliosTool(server, client);
  registerGetPortfolioTool(server, client);
  registerCreatePortfolioTool(server, client);
  registerUpdatePortfolioTool(server, client);
  registerListPortfolioElementsTool(server, client);
  registerGetPortfolioElementTool(server, client);
  registerCreatePortfolioElementTool(server, client);
  registerUpdatePortfolioElementTool(server, client);
  registerSetTaskPortfolioElementTool(server, client);
  registerRemoveTaskPortfolioElementTool(server, client);
  registerGetTasksByPortfolioElementNameTool(server, client);
}

// ---------------------------------------------------------------------------
// HTTP mode — multi-user, per-request client from Authorization header
// ---------------------------------------------------------------------------
async function runHttp() {
  logger.info('🚀 Starting TeamStorm MCP Server (HTTP mode)...');

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    console.error(
      '❌ TeamStorm MCP Server: TEAMSTORM_API_URL не задан.\n' +
        '💡 Укажите URL через переменную окружения TEAMSTORM_API_URL.\n' +
        '   Формат: http://<teamstorm-host>/cwm/public/api/v1'
    );
    process.exit(1);
  }

  logger.info({ apiUrl, port: getPort(), env: getNodeEnv() }, 'Configuration loaded');

  // Health check on separate port
  const healthPort = getPort() + 1;
  const healthApp = express();
  healthApp.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'teamstorm-mcp-server',
      version: '1.0.0',
    });
  });
  const healthServer = healthApp.listen(healthPort, getListenHost(), () => {
    logger.info(`💚 Health check: http://localhost:${healthPort}/health`);
  });
  healthServer.on('error', (error) => {
    logger.fatal({ error }, 'Health check server error');
    process.exit(1);
  });

  function resolveToken(req: express.Request): string {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = getApiToken() ?? '';
    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^(?:Bearer|PrivateToken)\s+(.+)$/i);
      if (match) token = match[1];
    }
    return token;
  }

  // --- OOB Upload endpoint ---
  const uploadHandler = async (req: express.Request, res: express.Response) => {
    const authResult = validateUploadAuth(req);
    if (!authResult.ok) {
      res.status(401).json({ error: authResult.reason });
      return;
    }

    const clientIp = getTrustProxy()
      ? (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
        (req.headers['x-real-ip'] as string | undefined) ||
        req.ip ||
        'unknown'
      : req.ip || 'unknown';

    if (!checkRateLimit(clientIp)) {
      logger.warn({ ip: clientIp }, 'Upload rate limit exceeded');
      res.status(429).json({ error: 'Rate limit exceeded. Max 10 uploads per minute.' });
      return;
    }

    try {
      const result = await parseUpload(req, UPLOAD_DIR, MAX_UPLOAD_SIZE);
      logger.info(
        {
          fileName: result.originalFilename,
          size: result.size,
          uploadId: result.uploadId,
          ip: clientIp,
        },
        'File uploaded'
      );
      res.json({
        uploadId: result.uploadId,
        fileName: result.originalFilename,
        size: result.size,
        contentType: result.contentType,
      });
    } catch (err) {
      if (err instanceof UploadError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      logger.error(
        { error: err instanceof Error ? err.message : String(err), ip: clientIp },
        'Upload stream error'
      );
      if (!res.headersSent) res.status(400).json({ error: 'Upload failed. Please try again.' });
    }
  };

  // --- MCP endpoint (stateful with session persistence) ---
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionClients = new Map<string, TeamStormClient>();
  const sessionTokenHashes = new Map<string, string>();

  const mcpHandler = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const token = resolveToken(req);

    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      if (!token) {
        res.status(401).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized: token required' },
          id: null,
        });
        return;
      }

      delete (req.headers as Record<string, unknown>)['mcp-session-id'];

      const requestClient = new TeamStormClient(token, getApiUrl(), getWorkspace());
      const mcpServer = new McpServer(
        { name: 'teamstorm-mcp-server', version: '1.0.0' },
        {
          instructions: `TeamStorm API URL предконфигурирован на сервере через переменную окружения TEAMSTORM_API_URL. НЕ передавайте параметр apiUrl в инструменты, если пользователь не попросил явно подключиться к другому TeamStorm-инстансу. Если получили ошибку "TeamStorm API URL не задан" — спросите у пользователя URL и передайте его через apiUrl в формате http://<host>/cwm/public/api/v1.

## Загрузка файлов (attachments)

Чтобы прикрепить файл к задаче, выполните два шага:

1. HTTP POST на http://<mcp-server-host>:<port>/upload с multipart/form-data (поле "file"),
   заголовок Authorization: PrivateToken <TEAMSTORM_API_TOKEN>. Получите uploadId из ответа (JSON {uploadId, fileName, size}).
2. Вызовите инструмент teamstorm_attach_uploaded с полученным uploadId.

Ограничения: max 50 MB, файл живёт на сервере 1 час, rate limit 10 загрузок в минуту.
Если mcp-server-host не указан — сервер доступен на localhost:PORT из конфигурации.`,
        }
      );
      registerAllTools(mcpServer, requestClient);

      transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid: string) => {
          transports.set(sid, transport!);
          sessionClients.set(sid, requestClient);
          sessionTokenHashes.set(sid, hashToken(token));
          logger.info({ sessionId: sid, hadStaleSession: !!sessionId }, 'MCP session initialized');
          transport!.onclose = () => {
            transports.delete(sid);
            sessionClients.delete(sid);
            sessionTokenHashes.delete(sid);
            logger.info({ sessionId: sid }, 'MCP session closed, maps cleaned up');
          };
        },
        onsessionclosed: (sid: string) => {
          transports.delete(sid);
          sessionClients.delete(sid);
          sessionTokenHashes.delete(sid);
          logger.info({ sessionId: sid }, 'MCP session deleted by client, maps cleaned up');
        },
      });

      try {
        await mcpServer.connect(transport);
      } catch (error) {
        logger.error({ error }, 'Failed to connect MCP transport');
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
        return;
      }
    } else {
      const expectedHash = sessionTokenHashes.get(sessionId!);
      const authResult = validateSessionToken(token, expectedHash);
      if (!authResult.ok) {
        logger.warn(
          { sessionId, tokenMasked: maskToken(token) },
          'Session token mismatch — rejecting request'
        );
        res
          .status(401)
          .json({ jsonrpc: '2.0', error: { code: -32001, message: authResult.reason }, id: null });
        return;
      }
    }

    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error(
        { error, sessionId, accept: req.headers.accept, method: req.method },
        'MCP request error'
      );
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  // --- Build Express app using SDK helper ---
  const app = createMcpExpressApp({ host: getListenHost() });
  app.use(express.json({ limit: '50mb' }));

  // Inject Accept header for MCP clients that don't send it (Claude Code, Cursor)
  // Must modify both rawHeaders (Hono reads from it) and headers (Express object)
  app.use((req, _res, next) => {
    if (req.path === '/mcp' || req.path === '/sse') {
      const accept = req.headers.accept;
      if (
        !accept ||
        (!accept.includes('application/json') && !accept.includes('text/event-stream'))
      ) {
        const newValue = 'application/json, text/event-stream';
        const raw = req.rawHeaders;
        const idx = raw.findIndex((h: string) => h.toLowerCase() === 'accept');
        if (idx >= 0) raw[idx + 1] = newValue;
        else raw.push('Accept', newValue);
        Object.assign(req.headers, { accept: newValue });
      }
    }
    next();
  });

  app.use((_req, res, next) => {
    // No Access-Control-Allow-Origin: browser clients are not a supported use case
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
  app.post('/upload', uploadHandler);
  app.post('/mcp', mcpHandler);
  app.post('/sse', mcpHandler);
  app.get('/sse', mcpHandler);
  app.get('/mcp', mcpHandler);

  const listenHost = getListenHost();
  if (getApiToken() && listenHost !== '127.0.0.1') {
    logger.warn(
      { listenHost },
      'TEAMSTORM_API_TOKEN is set but server is binding to all interfaces — remote callers can create sessions using the server token'
    );
  }

  const httpServer = app.listen(getPort(), listenHost, () => {
    logger.info({ host: listenHost }, '✅ TeamStorm MCP Server started (HTTP mode)');
    logger.info(`📍 MCP endpoint: http://localhost:${getPort()}/mcp`);
    logger.info(`💚 Health check: http://localhost:${healthPort}/health`);
  });

  httpServer.on('error', (error) => {
    logger.fatal({ error }, 'Server error');
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  await runHttp();
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
