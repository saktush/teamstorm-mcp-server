import { describe, it, expect, vi, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TeamStormClient } from '../client/teamstorm.js';
import {
  TOOLSETS,
  DEFAULT_SET,
  ALWAYS_ON,
  resolveToolsets,
  registerToolsets,
  type ToolsetName,
} from '../tools/toolsets.js';
import { logger } from '../utils/logger.js';

const EXPECTED_COUNTS: Record<ToolsetName, number> = {
  tasks: 27,
  documents: 18,
  portfolios: 11,
  planning: 7,
  structure: 8,
  reference: 9,
};

/**
 * Minimal McpServer stub that records every registerTool(name, ...) call so tests can
 * assert exactly which tools a toolset selection registers.
 */
function captureRegisteredNames(enabled: Set<ToolsetName>): string[] {
  const names: string[] = [];
  const stub = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerTool: (name: string, ..._rest: any[]) => {
      names.push(name);
      // registerTool normally returns a handle; nothing here relies on it.
      return undefined;
    },
  } as unknown as McpServer;
  const fakeClient = {} as TeamStormClient;
  registerToolsets(stub, fakeClient, enabled);
  return names;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TOOLSETS partition', () => {
  it('maps exactly 80 registrars with no duplicates', () => {
    const all = Object.values(TOOLSETS).flat();
    expect(all).toHaveLength(80);
    expect(new Set(all).size).toBe(80);
  });

  it('has the expected per-group counts', () => {
    for (const [name, count] of Object.entries(EXPECTED_COUNTS)) {
      expect(TOOLSETS[name as ToolsetName]).toHaveLength(count);
    }
  });
});

describe('resolveToolsets', () => {
  it('undefined input → all toolsets (backward compatible)', () => {
    expect(resolveToolsets()).toEqual(new Set(Object.keys(TOOLSETS)));
  });

  it('blank/whitespace input → all toolsets', () => {
    expect(resolveToolsets('   ')).toEqual(new Set(Object.keys(TOOLSETS)));
  });

  it('keyword "all" → every toolset', () => {
    expect(resolveToolsets('all')).toEqual(new Set(Object.keys(TOOLSETS)));
  });

  it('keyword "default" → DEFAULT_SET', () => {
    expect(resolveToolsets('default')).toEqual(new Set(DEFAULT_SET));
  });

  it('explicit list keeps the requested sets plus always-on reference', () => {
    expect(resolveToolsets('tasks,documents')).toEqual(
      new Set<ToolsetName>(['tasks', 'documents', 'reference'])
    );
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveToolsets('  Tasks , DOCUMENTS ')).toEqual(
      new Set<ToolsetName>(['tasks', 'documents', 'reference'])
    );
  });

  it('drops unknown names with a warning but still resolves the valid ones', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    expect(resolveToolsets('tasks,bogus')).toEqual(new Set<ToolsetName>(['tasks', 'reference']));
    expect(warn).toHaveBeenCalledOnce();
  });

  it('all-garbage input falls back to DEFAULT_SET (never zero tools)', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    expect(resolveToolsets('foo,bar')).toEqual(new Set(DEFAULT_SET));
  });

  it('always includes reference regardless of input', () => {
    for (const input of ['tasks', 'planning', 'portfolios', 'documents,structure']) {
      expect(resolveToolsets(input).has(ALWAYS_ON[0])).toBe(true);
    }
  });
});

describe('registerToolsets', () => {
  it('registers only tasks (27) + always-on reference (9) = 36 for ?toolsets=tasks', () => {
    const names = captureRegisteredNames(resolveToolsets('tasks'));
    expect(names).toHaveLength(36);
    expect(new Set(names).size).toBe(36);
  });

  it('registers all 80 tools for "all"', () => {
    const names = captureRegisteredNames(resolveToolsets('all'));
    expect(names).toHaveLength(80);
    expect(new Set(names).size).toBe(80);
  });

  it('registers documents (18) + reference (9) = 27 for ?toolsets=documents', () => {
    const names = captureRegisteredNames(resolveToolsets('documents'));
    expect(names).toHaveLength(27);
  });

  it('every registered tool name carries the teamstorm_ prefix', () => {
    const names = captureRegisteredNames(resolveToolsets('all'));
    expect(names.every((n) => n.startsWith('teamstorm_'))).toBe(true);
  });
});
