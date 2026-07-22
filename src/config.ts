import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Mask sensitive token for safe logging / display
export const maskToken = (token: string): string => {
  if (!token || token.length <= 16) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

// Environment variables schema with validation
const ConfigSchema = z.object({
  // TeamStorm API
  TEAMSTORM_API_URL: z.string().url().optional(),
  TEAMSTORM_API_TOKEN: z.preprocess((val) => {
    if (val === '' || val === undefined) return undefined;
    return val;
  }, z.string().min(1).optional()),
  TEAMSTORM_WORKSPACE: z.string().optional(),
  // Comma-separated toolset selection or a keyword: "tasks,documents" | "default" | "all".
  TEAMSTORM_TOOLSETS: z.string().optional(),

  // Server configuration
  PORT: z.coerce.number().int().positive().default(3001),
  LISTEN_HOST: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  TRUST_PROXY: z.coerce
    .boolean()
    .default(false)
    .describe('Trust X-Forwarded-For header for rate limiting'),
});

// Parse and validate configuration — fatal (exits process)
const parseConfig = (): Config => {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .filter((err) => err.code === 'invalid_type' || err.code === 'too_small')
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      console.error('❌ Configuration validation failed:\n');
      console.error(missing);
      console.error('\n💡 Check your .env file or environment variables.');
      process.exit(1);
    }
    throw error;
  }
};

// Format config validation error without exiting — for use in non-fatal contexts
export function formatConfigError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const missing = error.errors
      .filter((err) => err.code === 'invalid_type' || err.code === 'too_small')
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    return `Config validation failed: ${missing}`;
  }
  return String(error);
}

// Type-safe configuration
export type Config = z.infer<typeof ConfigSchema>;

// Singleton configuration instance
let configInstance: Config | null = null;

export const getConfig = (): Config => {
  if (!configInstance) {
    configInstance = parseConfig();
  }
  return configInstance;
};

// Convenience accessors — lazy, config loaded only on first call
export const getApiToken = (): string | undefined => getConfig().TEAMSTORM_API_TOKEN;
export const getApiUrl = (): string | undefined => getConfig().TEAMSTORM_API_URL;
export const getWorkspace = (): string | undefined => getConfig().TEAMSTORM_WORKSPACE;
export const getToolsets = (): string | undefined => getConfig().TEAMSTORM_TOOLSETS;
export const getPort = (): number => getConfig().PORT;
export const getNodeEnv = (): string => getConfig().NODE_ENV;
export const getTrustProxy = (): boolean => getConfig().TRUST_PROXY;

// When TEAMSTORM_API_TOKEN is set, the server acts as a single-user proxy —
// restrict to loopback by default to prevent unauthenticated remote session creation.
// Set LISTEN_HOST explicitly to override (e.g. LISTEN_HOST=0.0.0.0 in containers).
export const getListenHost = (): string =>
  getConfig().LISTEN_HOST ?? (getApiToken() ? '127.0.0.1' : '0.0.0.0');
