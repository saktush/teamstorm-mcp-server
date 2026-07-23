import { describe, it, expect } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TeamStormClient } from '../client/teamstorm.js';
import { resolveToolsets, registerToolsets } from '../tools/toolsets.js';

/**
 * Guard for the Feature D resource-first naming convention
 * (`teamstorm_<resource>_<verb>[_<qualifier>]`). Introspects the actual wire
 * names via a stub McpServer rather than grepping the filesystem — a raw grep
 * hits false positives in prompt/instruction/client prose (see the usability audit).
 */
function allRegisteredNames(): string[] {
  const names: string[] = [];
  const stub = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerTool: (name: string, ..._rest: any[]) => {
      names.push(name);
      return undefined;
    },
  } as unknown as McpServer;
  registerToolsets(stub, {} as TeamStormClient, resolveToolsets('all'));
  return names;
}

// Verbs that must never lead a tool name (i.e. no verb-first names survive).
// `link` is intentionally excluded: it is unambiguous with the `link_types`
// resource (`teamstorm_link_types_list`), whose first token is `link`.
const VERB_FIRST =
  /^teamstorm_(get|list|create|update|add|set|remove|share|block|unblock|find|attach)_/;
const SHAPE = /^teamstorm_[a-z0-9]+(_[a-z0-9]+)+$/;

describe('resource-first tool naming (Feature D)', () => {
  const names = allRegisteredNames();

  it('registers exactly 80 uniquely-named tools', () => {
    expect(names).toHaveLength(80);
    expect(new Set(names).size).toBe(80);
  });

  it('every name is lowercase snake_case under the teamstorm_ prefix', () => {
    const bad = names.filter((n) => !SHAPE.test(n));
    expect(bad, `malformed names: ${bad.join(', ')}`).toEqual([]);
  });

  it('no name is verb-first — resource must come before the verb', () => {
    const offenders = names.filter((n) => VERB_FIRST.test(n));
    expect(offenders, `verb-first names remain: ${offenders.join(', ')}`).toEqual([]);
  });
});
