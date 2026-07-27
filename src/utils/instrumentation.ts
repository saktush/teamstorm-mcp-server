import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logToolCall } from './logger.js';

const require = createRequire(import.meta.url);

/**
 * Телеметрия вызовов инструментов.
 *
 * Зачем: наблюдались зависания на ~4 минуты (`folders_find`, `comments_list`), которые
 * не воспроизводятся. У axios уже стоит `timeout: 30_000`, то есть причина НЕ в исходящем
 * HTTP-запросе. Здесь мы не «чиним наугад», а собираем доказательства: сколько на самом
 * деле длился вызов, что висело в этот момент, и чем всё кончилось.
 *
 * Оборачивание идёт в одной точке — `registerToolsets` — поэтому покрывает все инструменты
 * сразу и структурно не может повторить ошибку `folders/find.ts`, где `logResponse`
 * вызывался ДО дорогого `Promise.all` и прятал реальную задержку.
 */

export interface InstrumentOptions {
  /** Через сколько вернуть структурную ошибку вместо бесконечного ожидания. */
  deadlineMs?: number;
  /** Порог, выше которого вызов логируется как медленный. */
  slowMs?: number;
  /** Период отчёта о «висящих» вызовах. 0 — выключить. */
  watchdogMs?: number;
}

interface InFlightCall {
  callId: string;
  tool: string;
  startedAt: number;
}

const inFlight = new Map<string, InFlightCall>();

/** Значения по умолчанию; env читается лениво — см. комментарий в `resolveDefaults`. */
const FALLBACK_DEADLINE_MS = 60_000; // 2× axios timeout: один чистый round-trip не может его задеть
const FALLBACK_SLOW_MS = 5_000;
const FALLBACK_WATCHDOG_MS = 15_000;

let resolved: Required<InstrumentOptions> | null = null;

/**
 * Конфиг резолвится лениво и через try/catch: `getConfig()` на верхнем уровне
 * вызывает `process.exit(1)` при отсутствии .env и убил бы все юнит-тесты.
 * Тот же приём, что в `logger.ts`.
 */
function resolveDefaults(): Required<InstrumentOptions> {
  if (resolved) return resolved;

  let deadlineMs = FALLBACK_DEADLINE_MS;
  let slowMs = FALLBACK_SLOW_MS;
  try {
    const { getToolTimeoutMs, getSlowToolMs } = require('../config.js');
    deadlineMs = getToolTimeoutMs();
    slowMs = getSlowToolMs();
  } catch {
    // остаются значения по умолчанию
  }

  resolved = { deadlineMs, slowMs, watchdogMs: FALLBACK_WATCHDOG_MS };
  return resolved;
}

/** Мгновенный снимок активных вызовов — отдаётся в /health. */
export function getInflightSnapshot(): {
  inFlight: number;
  oldestAgeMs: number | null;
  oldestTool: string | null;
  byTool: Record<string, number>;
} {
  const now = Date.now();
  let oldest: InFlightCall | null = null;
  const byTool: Record<string, number> = {};

  for (const call of inFlight.values()) {
    byTool[call.tool] = (byTool[call.tool] ?? 0) + 1;
    if (!oldest || call.startedAt < oldest.startedAt) oldest = call;
  }

  return {
    inFlight: inFlight.size,
    oldestAgeMs: oldest ? now - oldest.startedAt : null,
    oldestTool: oldest ? oldest.tool : null,
    byTool,
  };
}

let watchdog: NodeJS.Timeout | null = null;

function startWatchdog(intervalMs: number): void {
  if (watchdog || intervalMs <= 0) return;

  watchdog = setInterval(() => {
    const snap = getInflightSnapshot();
    if (snap.inFlight > 0) logToolCall('inflight', snap);
  }, intervalMs);

  // Обязательно: без unref() vitest не завершится.
  watchdog.unref();
}

type ToolHandler = (...args: unknown[]) => unknown;

function timeoutResult(tool: string, deadlineMs: number, callId: string) {
  const seconds = Math.round(deadlineMs / 1000);
  return {
    content: [
      {
        type: 'text' as const,
        text:
          `⏱ Инструмент \`${tool}\` не ответил за ${seconds} с и был прерван.\n` +
          '💡 Запрос мог остаться выполняться на сервере — проверьте логи по callId.\n' +
          `   callId: ${callId}`,
      },
    ],
    isError: true,
    structuredContent: { error: 'tool_timeout', tool, deadlineMs, callId },
  };
}

/**
 * Оборачивает `registerTool` у McpServer, оставляя все прочие члены нетронутыми.
 *
 * Именно Proxy, а не мутация объекта: в тестах сюда приходят стабы, реализующие
 * только `registerTool` (см. `tool-naming.test.ts`, `toolsets.test.ts`).
 */
export function instrumentServer(server: McpServer, opts?: InstrumentOptions): McpServer {
  const defaults = resolveDefaults();
  const deadlineMs = opts?.deadlineMs ?? defaults.deadlineMs;
  const slowMs = opts?.slowMs ?? defaults.slowMs;
  const watchdogMs = opts?.watchdogMs ?? defaults.watchdogMs;

  startWatchdog(watchdogMs);

  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop !== 'registerTool') {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }

      const original = Reflect.get(target, prop, receiver) as (
        name: string,
        config: unknown,
        handler: ToolHandler
      ) => unknown;

      return function registerInstrumentedTool(
        name: string,
        config: unknown,
        handler: ToolHandler
      ) {
        const wrapped = async (...args: unknown[]) => {
          const callId = randomUUID();
          const startedAt = Date.now();
          inFlight.set(callId, { callId, tool: name, startedAt });

          logToolCall('start', { tool: name, callId, inFlight: inFlight.size });

          let settled = false;
          let timer: NodeJS.Timeout | undefined;

          const work = (async () => handler(...args))();

          // Осиротевший промис продолжает выполняться — и когда он наконец завершится,
          // мы залогируем ИСТИННУЮ длительность. Ради этой строки всё и затевалось.
          work.then(
            () => {
              if (settled) {
                logToolCall('orphaned', {
                  tool: name,
                  callId,
                  durationMs: Date.now() - startedAt,
                  ok: true,
                });
              }
            },
            (err: unknown) => {
              if (settled) {
                logToolCall('orphaned', {
                  tool: name,
                  callId,
                  durationMs: Date.now() - startedAt,
                  ok: false,
                  err: err instanceof Error ? err.message : String(err),
                });
              }
            }
          );

          const deadline = new Promise<'__timeout__'>((resolve) => {
            timer = setTimeout(() => resolve('__timeout__'), deadlineMs);
            timer.unref?.();
          });

          try {
            const outcome = await Promise.race([work, deadline]);
            const durationMs = Date.now() - startedAt;

            if (outcome === '__timeout__') {
              settled = true;
              logToolCall('timeout', { tool: name, callId, durationMs, deadlineMs });
              return timeoutResult(name, deadlineMs, callId);
            }

            settled = true;
            if (durationMs > slowMs) {
              logToolCall('slow', { tool: name, callId, durationMs, slowMs });
            }
            logToolCall('end', { tool: name, callId, durationMs, ok: true });
            return outcome;
          } catch (error) {
            settled = true;
            logToolCall('end', {
              tool: name,
              callId,
              durationMs: Date.now() - startedAt,
              ok: false,
              err: error instanceof Error ? error.message : String(error),
            });
            throw error;
          } finally {
            if (timer) clearTimeout(timer);
            inFlight.delete(callId);
          }
        };

        return original.call(target, name, config, wrapped as ToolHandler);
      };
    },
  });
}
