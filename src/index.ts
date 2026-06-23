#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import express from 'express';
import { promises as fsPromises } from 'fs';
import { getApiUrl, getWorkspace, getPort, getNodeEnv, getTrustProxy, getApiToken } from './config.js';
import { validateUploadAuth } from './utils/upload-auth.js';
import { logger } from './utils/logger.js';
import { TeamStormClient } from './client/teamstorm.js';
import { TextDecoder } from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
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
  registerListTaskAttachmentsTool,
  registerGetTaskAttachmentTool,
  registerListAttachmentVersionsTool,
  registerGetAttachmentVersionTool,
  registerAttachUploadedFileTool,
  registerGetTaskPermissionsTool,
  registerGetTaskLinksTool,
} from './tools/index.js';

// OOB Upload temp directory
const UPLOAD_DIR = path.join(os.tmpdir(), 'teamstorm-uploads');
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  logger.error({ error: err instanceof Error ? err.message : String(err), dir: UPLOAD_DIR }, 'Failed to create upload directory');
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
    let cleaned = 0;
    for (const f of entries) {
      const fp = path.join(UPLOAD_DIR, f);
      try {
        const stat = await fsPromises.stat(fp);
        if (now - stat.mtimeMs > UPLOAD_TTL_MS) {
          await fsPromises.unlink(fp);
          cleaned++;
        }
      } catch { /* concurrent removal */ }
    }
    if (cleaned > 0) logger.info({ cleaned }, 'Cleaned up orphaned upload files');
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Upload cleanup failed');
  }
}

function cleanupRateLimiter(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [ip, entry] of rateLimiter) {
    if (now > entry.resetTime) { rateLimiter.delete(ip); cleaned++; }
  }
  if (cleaned > 0) logger.debug({ cleaned }, 'Cleaned up stale rate limiter entries');
}

setInterval(() => {
  cleanupRateLimiter();
  cleanupOrphanedUploads().catch((err) =>
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Scheduled upload cleanup failed')
  );
}, 30 * 60 * 1000);

function registerAllTools(server: McpServer, client: TeamStormClient) {
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
  registerListTaskAttachmentsTool(server, client);
  registerGetTaskAttachmentTool(server, client);
  registerListAttachmentVersionsTool(server, client);
  registerGetAttachmentVersionTool(server, client);
  registerAttachUploadedFileTool(server, client);
  registerGetTaskPermissionsTool(server, client);
  registerGetTaskLinksTool(server, client);
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
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'teamstorm-mcp-server', version: '1.0.0' });
  });
  const healthServer = healthApp.listen(healthPort, '0.0.0.0', () => {
    logger.info(`💚 Health check: http://localhost:${healthPort}/health`);
  });
  healthServer.on('error', (error) => { logger.fatal({ error }, 'Health check server error'); process.exit(1); });

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
    if (!authResult.ok) { res.status(401).json({ error: authResult.reason }); return; }

    const clientIp = getTrustProxy()
      ? ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.headers['x-real-ip'] as string | undefined || req.ip || 'unknown')
      : req.ip || 'unknown';

    if (!checkRateLimit(clientIp)) {
      logger.warn({ ip: clientIp }, 'Upload rate limit exceeded');
      res.status(429).json({ error: 'Rate limit exceeded. Max 10 uploads per minute.' });
      return;
    }

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/);
    if (!boundaryMatch) { res.status(400).json({ error: 'No multipart boundary found' }); return; }

    const boundary = Buffer.from('--' + (boundaryMatch[1] || boundaryMatch[2]));
    let fileBuffer: Buffer | null = null;
    let filenameRaw: Buffer | null = null;
    let contentTypeFile = 'application/octet-stream';
    let headerBuffer = '';
    let totalBytes = 0;
    let sizeExceeded = false;

    const decodeHeaderValue = (raw: string | Buffer): string => {
      const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'latin1');
      const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (!utf8.includes('�')) return utf8;
      const cp1251 = new TextDecoder('cp1251', { fatal: false }).decode(bytes);
      if (!cp1251.includes('�') && /[А-Яа-яЁё]/.test(cp1251)) return cp1251;
      return utf8;
    };

    const parseHeaders = (headerStr: string): Record<string, string> => {
      const headers: Record<string, string> = {};
      for (const line of headerStr.split('\r\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
      }
      return headers;
    };

    const extractFilename = (cd: string): string | null => {
      const fnMatch = cd.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      if (fnMatch) return decodeURIComponent(fnMatch[1]);
      const fnMatch2 = cd.match(/filename="?([^";\r\n]+)"?/i);
      if (fnMatch2) return fnMatch2[1];
      return null;
    };

    const chunks: Buffer[] = [];
    let prevTail = Buffer.alloc(0);

    req.on('data', (chunk: Buffer) => {
      if (sizeExceeded) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_UPLOAD_SIZE) { sizeExceeded = true; req.destroy(); return; }
      if (fileBuffer !== null) { chunks.push(chunk); return; }
      const searchChunk = Buffer.concat([prevTail, chunk]);
      headerBuffer += searchChunk.toString('binary');
      const headerEnd = headerBuffer.indexOf('\r\n\r\n');
      if (headerEnd >= 0) {
        const rawHeaders = headerBuffer.slice(0, headerEnd);
        headerBuffer = '';
        const headers = parseHeaders(rawHeaders);
        const cd = headers['content-disposition'] || '';
        contentTypeFile = headers['content-type'] || 'application/octet-stream';
        const fname = extractFilename(cd);
        if (fname) filenameRaw = Buffer.from(fname, 'binary');
        const dataStart = headerEnd + 4;
        const remaining = searchChunk.slice(dataStart);
        if (remaining.length > 0) {
          const boundaryIdx = remaining.indexOf(boundary);
          fileBuffer = boundaryIdx >= 0 ? remaining.slice(0, boundaryIdx) : remaining;
        }
      }
      prevTail = searchChunk.slice(-boundary.length - 4);
    });

    req.on('end', () => {
      if (sizeExceeded) { res.status(413).json({ error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE / 1024 / 1024} MB.` }); return; }
      if (!fileBuffer || !filenameRaw) { res.status(400).json({ error: 'No file provided. Send as multipart field "file".' }); return; }
      const originalName = decodeHeaderValue(filenameRaw);
      const uploadId = crypto.randomUUID();
      const destPath = path.join(UPLOAD_DIR, uploadId);
      const fileData = Buffer.concat([fileBuffer, ...chunks]);
      fs.writeFileSync(destPath, fileData, { mode: 0o600 });
      fs.writeFileSync(path.join(UPLOAD_DIR, uploadId + '.meta.json'), JSON.stringify({ fileName: originalName, contentType: contentTypeFile }), { mode: 0o600 });
      const stats = fs.statSync(destPath);
      logger.info({ fileName: originalName, size: stats.size, uploadId, ip: clientIp }, 'File uploaded');
      res.json({ uploadId, fileName: originalName, size: stats.size, contentType: contentTypeFile });
    });

    req.on('error', (err: Error) => {
      logger.error({ error: err.message, ip: clientIp }, 'Upload stream error');
      if (!res.headersSent) res.status(400).json({ error: 'Upload failed. Please try again.' });
    });
  };

  // --- Debug: list uploads ---
  const listUploadsHandler = (_req: express.Request, res: express.Response) => {
    const authResult = validateUploadAuth(_req);
    if (!authResult.ok) { res.status(401).json({ error: authResult.reason }); return; }
    try {
      const entries = fs.readdirSync(UPLOAD_DIR);
      const details = entries.map((f) => { const fp = path.join(UPLOAD_DIR, f); const stat = fs.statSync(fp); return { name: f, size: stat.size, isFile: stat.isFile() }; });
      res.json({ entries: details });
    } catch { res.status(500).json({ error: 'Failed to list uploads' }); }
  };

  // --- MCP endpoint (stateful with session persistence) ---
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionClients = new Map<string, TeamStormClient>();

  const mcpHandler = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const token = resolveToken(req);

    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
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
          logger.info({ sessionId: sid, hadStaleSession: !!sessionId }, 'MCP session initialized');
        },
      });

      try {
        await mcpServer.connect(transport);
      } catch (error) {
        logger.error({ error }, 'Failed to connect MCP transport');
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
        return;
      }
    } else {
      const sessionClient = sessionClients.get(sessionId!);
      if (sessionClient && token) {
        sessionClient.setToken(token);
      }
    }

    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error({ error, sessionId, accept: req.headers.accept, method: req.method }, 'MCP request error');
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  };

  // --- Build Express app using SDK helper ---
  const app = createMcpExpressApp({ host: '0.0.0.0' });
  app.use(express.json({ limit: '50mb' }));

  // Inject Accept header for MCP clients that don't send it (Claude Code, Cursor)
  // Must modify both rawHeaders (Hono reads from it) and headers (Express object)
  app.use((req, _res, next) => {
    if (req.path === '/mcp' || req.path === '/sse') {
      const accept = req.headers.accept;
      if (!accept || (!accept.includes('application/json') && !accept.includes('text/event-stream'))) {
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
  app.post('/upload', uploadHandler);
  app.get('/uploads', listUploadsHandler);
  app.post('/mcp', mcpHandler);
  app.post('/sse', mcpHandler);
  app.get('/sse', mcpHandler);
  app.get('/mcp', mcpHandler);

  const httpServer = app.listen(getPort(), '0.0.0.0', () => {
    logger.info('✅ TeamStorm MCP Server started (HTTP mode)');
    logger.info(`📍 MCP endpoint: http://localhost:${getPort()}/mcp`);
    logger.info(`💚 Health check: http://localhost:${healthPort}/health`);
  });

  httpServer.on('error', (error) => { logger.fatal({ error }, 'Server error'); process.exit(1); });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  await runHttp();
}

main().catch((error) => { logger.fatal({ error }, 'Failed to start server'); process.exit(1); });
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
