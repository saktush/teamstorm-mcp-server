import { describe, it, expect, vi, afterEach } from 'vitest';
import { instrumentServer, getInflightSnapshot } from '../utils/instrumentation.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type Handler = (args: unknown) => Promise<unknown>;

/**
 * Стаб сервера с единственным методом `registerTool` — ровно как в
 * `tool-naming.test.ts` / `toolsets.test.ts`. Proxy обязан это пережить.
 */
function buildStubServer() {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: Handler) {
      handlers.set(name, handler);
    },
    someOtherMember: 'untouched',
    echo(value: string) {
      return `echo:${value}`;
    },
  };
  return { server, handlers };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('instrumentServer', () => {
  it('passes through members other than registerTool', () => {
    const { server } = buildStubServer();
    const wrapped = instrumentServer(server as unknown as McpServer) as unknown as ReturnType<
      typeof buildStubServer
    >['server'];

    expect(wrapped.someOtherMember).toBe('untouched');
    expect(wrapped.echo('hi')).toBe('echo:hi');
  });

  it('registers the tool under its original name and returns the handler result unchanged', async () => {
    const { server, handlers } = buildStubServer();
    const wrapped = instrumentServer(server as unknown as McpServer);

    const result = { content: [{ type: 'text', text: 'ok' }] };
    wrapped.registerTool('teamstorm_tasks_get', {} as never, (async () => result) as never);

    expect(handlers.has('teamstorm_tasks_get')).toBe(true);
    await expect(handlers.get('teamstorm_tasks_get')!({})).resolves.toBe(result);
  });

  it('tracks in-flight calls and clears them when the handler resolves', async () => {
    const { server, handlers } = buildStubServer();
    const wrapped = instrumentServer(server as unknown as McpServer);

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    wrapped.registerTool(
      'slow_tool',
      {} as never,
      (async () => {
        await gate;
        return 'done';
      }) as never
    );

    const pending = handlers.get('slow_tool')!({});
    await Promise.resolve();

    const during = getInflightSnapshot();
    expect(during.inFlight).toBe(1);
    expect(during.oldestTool).toBe('slow_tool');
    expect(during.byTool.slow_tool).toBe(1);

    release();
    await pending;

    expect(getInflightSnapshot().inFlight).toBe(0);
  });

  it('decrements the in-flight counter even when the handler throws', async () => {
    const { server, handlers } = buildStubServer();
    const wrapped = instrumentServer(server as unknown as McpServer);

    wrapped.registerTool(
      'boom',
      {} as never,
      (async () => {
        throw new Error('nope');
      }) as never
    );

    await expect(handlers.get('boom')!({})).rejects.toThrow('nope');
    expect(getInflightSnapshot().inFlight).toBe(0);
  });

  it('returns a structured MCP error instead of hanging forever past the deadline', async () => {
    vi.useFakeTimers();
    const { server, handlers } = buildStubServer();
    const wrapped = instrumentServer(server as unknown as McpServer, { deadlineMs: 1000 });

    // Никогда не резолвится — это и есть воспроизведение «зависания» из отчёта.
    wrapped.registerTool('hangs', {} as never, (() => new Promise(() => {})) as never);

    const pending = handlers.get('hangs')!({}) as Promise<{
      isError?: boolean;
      structuredContent?: Record<string, unknown>;
      content: Array<{ type: string; text: string }>;
    }>;

    await vi.advanceTimersByTimeAsync(1001);
    const result = await pending;

    expect(result.isError).toBe(true);
    expect(result.structuredContent?.error).toBe('tool_timeout');
    expect(result.structuredContent?.tool).toBe('hangs');
    expect(result.content[0].text).toContain('hangs');
  });
});
