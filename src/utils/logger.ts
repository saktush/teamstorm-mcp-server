import pino from 'pino';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Logger config is resolved lazily on first access to avoid calling getConfig()
// (and thus process.exit()) during test imports when .env is absent.
let nodeEnv = 'production';
function resolveNodeEnv(): string {
  if (nodeEnv === 'production') {
    try {
      const { getConfig } = require('../config.js');
      nodeEnv = getConfig().NODE_ENV;
    } catch {
      // stays 'production'
    }
  }
  return nodeEnv;
}

// Recursively redact sensitive keys from objects before they reach the log
const SENSITIVE_PATTERN =
  /^(token|apitoken|authorization|password|secret|key|auth|bearer|privatetoken)$/i;

function redact(obj: unknown): unknown {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return obj;
}

const redactedLogger = {
  debug: (obj: unknown, msg?: string, ...args: unknown[]) =>
    logger.debug(redact(obj), msg, ...args),
  info: (obj: unknown, msg?: string, ...args: unknown[]) => logger.info(redact(obj), msg, ...args),
  warn: (obj: unknown, msg?: string, ...args: unknown[]) => logger.warn(redact(obj), msg, ...args),
  error: (obj: unknown, msg?: string, ...args: unknown[]) =>
    logger.error(redact(obj), msg, ...args),
  fatal: (obj: unknown, msg?: string, ...args: unknown[]) =>
    logger.fatal(redact(obj), msg, ...args),
};

// Logger configuration based on environment
const loggerConfig: pino.LoggerOptions = {
  level: resolveNodeEnv() === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Add pretty printing in development
if (resolveNodeEnv() === 'development') {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(loggerConfig);

// Convenience methods for common log patterns (auto-redact sensitive fields)
export const logRequest = (method: string, params: Record<string, unknown>) => {
  redactedLogger.debug({ method, params }, 'MCP request received');
};

export const logResponse = (method: string, success: boolean, duration?: number) => {
  redactedLogger.debug({ method, success, duration }, 'MCP response sent');
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  redactedLogger.error({ ...context, err: error.message, stack: error.stack }, error.message);
};
