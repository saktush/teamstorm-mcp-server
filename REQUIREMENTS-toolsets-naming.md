# Technical Requirements: Toolsets & Tool Naming

Follow-up to the [MCP usability audit](https://claude.ai/code/artifact/fd2e7715-537c-4479-b703-46d54b414412). Covers the two P2 items: **toolset grouping with per-session filtering** (Feature C) and the **`service_verb_resource` → `service_resource_verb` rename** (Feature D). These are documented together because both touch the single registration site in `src/index.ts`, and the rename only pays off once toolset filtering ships (per the audit report).

Written against the current tree: **80 tools across 26 domain folders**, all registered unconditionally in `registerAllTools()` ([src/index.ts:273](src/index.ts)), invoked per-session at [src/index.ts:557](src/index.ts).

Recommended order: **Feature C first** (delivers the token-cost win on its own), **Feature D second** (cosmetic without C; synergistic with it). Feature D is a breaking change — see §2.5.

---

## Implementation status

- **Feature C — ✅ Implemented (2026-07-22).** Toolset grouping and per-session filtering are live. New registry `src/tools/toolsets.ts` (`TOOLSETS` map, `resolveToolsets`, `registerToolsets`), `TEAMSTORM_TOOLSETS` env var + `getToolsets()` in `src/config.ts`, and per-session wiring in `src/index.ts` (query `?toolsets=` > header `X-TeamStorm-Toolsets` > env > `all`). Covered by `src/__tests__/toolsets.test.ts` (partition + resolver + registration). Docs updated in `README.md`, `AGENTS.md`, `.env.example`. Verified end-to-end against a running server. All C.8 acceptance criteria met (see checkboxes below).
- **Feature D — ✅ Implemented (2026-07-22).** All 80 tool names are now resource-first (`teamstorm_<resource>_<verb>`) under the **Normalized** convention (resource pluralized to its toolset; verb moved to the end; redundant `get` folded where a noun subsumes it — `tasks_count`, `folders_tree`). Applied as a scripted word-boundary sweep that renamed the registration literal, both `logRequest`/`logResponse` self-labels (~162 lines the original spec missed), inter-tool references in descriptions/comments/error messages, the `src/index.ts` `instructions` block, `src/client/teamstorm.ts` hints, prompt instruction text, and the tool tables in `README.md` / `AGENTS.md` / `openAPI-coverage-report.md`. **Clean cutover — no aliases** (single test user); `TEAMSTORM_LEGACY_TOOL_NAMES` was **not** built. Guarded by `src/__tests__/tool-naming.test.ts` (introspects wire names via a stub `McpServer`; asserts 80 unique names, snake_case shape, no verb-first). The 4 `PROMPT_NAME` constants are unchanged (not tools). See D.5 acceptance below.

---

## Feature C — Toolset grouping & per-session filtering

### C.1 Problem restated

Every session's `McpServer` loads all 80 tool schemas whether the task touches 3 domains or all 26. That's a fixed context tax on every connection, and the pending agile/portfolio API TODOs will push the count higher. Mirrors the problem GitHub MCP Server solved with `--toolsets` / dynamic discovery.

### C.2 The toolset map (6 groups, sums to 80)

Group the 26 domain folders so that each group is a coherent workflow surface. Counts are actual `server.registerTool()` calls per folder.

| Toolset | Domain folders included | Tools |
|---|---|---|
| `tasks` | `tasks`(7), `attributes`(6), `attachments`(6), `comments`(3), `links`(2), `time-tracking`(2), `permissions`(1) | **27** |
| `documents` | `documents`(6), `document-sharing`(3), `document-links`(3), `document-comments`(2), `document-attachments`(2), `document-statuses`(2) | **18** |
| `portfolios` | `portfolios`(4), `portfolio-elements`(4), `portfolio-links`(3) | **11** |
| `planning` | `sprints`(4), `agile`(3) | **7** |
| `structure` | `folders`(6), `workspaces`(2) | **8** |
| `reference` | `users`(3), `statuses`(2), `workflows`(1), `types`(1), `link-types`(1), `status-categories`(1) | **9** |

**Design notes on the grouping:**
- `tasks` deliberately absorbs everything that hangs off a work item (its attributes, attachments, comments, links, time entries, permissions) rather than exposing those as separate toolsets — a client that can operate on tasks needs all of them, and splitting would just recreate the discovery problem at a finer grain.
- `reference` is **cross-cutting** read-only lookup data: nearly every workflow needs to resolve a status/type/user/workflow name to an ID. `workflows` sits here (not `planning`) because it describes *how* statuses transition — definitional metadata an agent reads to understand the board, not a planning action it performs. Recommendation: `reference` is **always loaded** and cannot be disabled (treat it like a base layer, not an optional toolset). This prevents the common failure where an agent has `teamstorm_create_task` but no `teamstorm_list_task_types` to discover the `type` argument.
- `structure` (folders + workspaces) is small and also widely needed; include it in the **default** set but keep it disableable.

### C.3 Default set

Following GitHub's `default`/`all` keyword convention:

- **`default`** = `tasks` + `structure` + `reference` (the most common workflow; ~43 tools). `reference` is implicit/always-on per C.2.
- **`all`** = every toolset (current behavior; 80 tools).
- Explicit list, e.g. `tasks,documents` — loads exactly those, plus the always-on `reference`.

If no configuration is provided anywhere, the server loads **`all`**, so this change is **backward-compatible by default** — existing deployments see no behavior change until they opt into filtering.

### C.4 Configuration surface

Two knobs, with a clear precedence order. Both accept a comma-separated list or the `default`/`all` keywords.

1. **Server-wide default — env var `TEAMSTORM_TOOLSETS`** (add to `ConfigSchema` in [src/config.ts:14](src/config.ts)):
   ```ts
   TEAMSTORM_TOOLSETS: z.string().optional(), // e.g. "tasks,documents" | "default" | "all"
   ```
   Add a `getToolsets(): string | undefined` accessor next to the others at [src/config.ts:79](src/config.ts).

2. **Per-session override — query param `?toolsets=`** on the MCP endpoint. This is the primary per-session mechanism because it works with every client that lets you configure the server URL (Claude Code's `claude mcp add ... <url>`, Cursor's `mcp.json` `url`, Codex's `url=`), no custom-header support required. Example:
   ```
   POST http://localhost:3001/mcp?toolsets=tasks,documents
   ```
   Also accept header `X-TeamStorm-Toolsets` as a secondary path for clients that prefer headers (same clients already send `Authorization`), but query param is the documented default.

**Precedence:** per-session param/header > `TEAMSTORM_TOOLSETS` env var > built-in `all`.

### C.5 Implementation

#### C.5.1 Central registry — new file `src/tools/toolsets.ts`

Replace the flat `registerAllTools` with a keyed registry, so grouping lives in one place:

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TeamStormClient } from '../client/teamstorm.js';

type ToolRegistrar = (server: McpServer, client: TeamStormClient) => void;
export type ToolsetName = 'tasks' | 'documents' | 'portfolios' | 'planning' | 'structure' | 'reference';

export const ALWAYS_ON: ToolsetName[] = ['reference'];
export const DEFAULT_SET: ToolsetName[] = ['tasks', 'structure', 'reference'];

export const TOOLSETS: Record<ToolsetName, ToolRegistrar[]> = {
  tasks: [registerListTasksTool, registerGetTaskTool, /* … all 27 */],
  documents: [/* … 18 */],
  portfolios: [/* … 11 */],
  planning: [/* … 7 */],
  structure: [/* … 8 */],
  reference: [/* … 9 */],
};
```

Every one of the 80 `register*Tool` imports currently in [src/index.ts:30-111](src/index.ts) moves into exactly one `TOOLSETS` array. A build-time assertion (unit test) verifies the arrays partition all 80 registrars with no omissions or duplicates (§C.7).

#### C.5.2 Resolver — `resolveToolsets(raw?: string): Set<ToolsetName>`

- Parse comma-separated input; trim; lowercase.
- Expand keyword `all` → every key; `default` → `DEFAULT_SET`.
- Drop unknown names with a `logger.warn` (do **not** fail the session — a typo shouldn't 500 a connection).
- Union in `ALWAYS_ON`.
- If the result is empty (e.g. input was only garbage), fall back to `DEFAULT_SET` — never register zero tools, that produces a silently broken session.

#### C.5.3 Wire into session creation

In `mcpHandler` ([src/index.ts:510](src/index.ts)), at the point where a new session is created (the `if (!transport)` block, [src/index.ts:516-557](src/index.ts)), read the selection **before** constructing the server:

```ts
const rawToolsets =
  (req.query.toolsets as string | undefined) ??
  (req.headers['x-teamstorm-toolsets'] as string | undefined) ??
  getToolsets();
const enabled = resolveToolsets(rawToolsets);
```

Replace the `registerAllTools(mcpServer, requestClient)` call at [src/index.ts:557](src/index.ts) with:

```ts
registerToolsets(mcpServer, requestClient, enabled); // iterates only enabled groups
logger.info({ sessionId: '(pending)', toolsets: [...enabled] }, 'Registering toolsets for session');
```

Because tools are registered once per session against that session's `McpServer`, the filter naturally scopes per-session with **no** change to transport, session-map, or auth logic. A session started with `?toolsets=tasks` and one with `?toolsets=all` coexist against the same running server.

Keep `registerAllTools` as a thin wrapper (`= registerToolsets(s, c, resolveToolsets('all'))`) if anything else references it, or delete it once the call site is migrated.

### C.6 Optional Phase 2 — dynamic toolset discovery

Mirrors GitHub's `--dynamic-toolsets`. Out of scope for the first pass; specify only if C.1–C.5 prove insufficient.

- Register two meta-tools in every session: `teamstorm_list_toolsets` (returns the table in C.2 with enabled/disabled state) and `teamstorm_enable_toolset` (registers a group's tools mid-session, then calls `mcpServer.sendToolListChanged()`).
- **Client-support caveat:** this only works if the connected client handles `notifications/tools/list_changed` and re-fetches the tool list. Verify against the actual clients in use (Claude Code, Cursor, Codex) before building — if they don't re-fetch, the newly enabled tools won't appear until reconnect, defeating the purpose. This is why it's Phase 2, not Phase 1.

### C.7 Testing

- **Partition test:** assert `Object.values(TOOLSETS).flat()` has exactly 80 entries, all unique, and equals the full set of exported `register*Tool` functions. This is the guard that catches a new tool being added to `src/tools/` but forgotten in the map.
- **Resolver tests:** `all`, `default`, explicit list, unknown name (warns + drops), empty/garbage (falls back to default), `reference` always present regardless of input.
- **Integration:** start a session with `?toolsets=tasks`, call `tools/list`, assert only the 27 `tasks` + 9 `reference` tools appear; a second session with no param sees all 80 (default `all`).

### C.8 Acceptance criteria

- [x] With no config, `tools/list` returns all 80 tools (backward compatible). — verified end-to-end (no param → 80).
- [x] `TEAMSTORM_TOOLSETS=tasks,documents` in `.env` → new sessions expose `tasks`(27) + `documents`(18) + always-on `reference`(9) = 54 tools, nothing else. — resolver + registration unit-tested (`documents`→27, `tasks`→36 verified live).
- [x] `?toolsets=planning` on the request URL overrides the env var for that session only. — precedence query > header > env > `all` implemented; `?toolsets=planning` → 16 verified live.
- [x] Unknown toolset name logs a warning and is ignored; session still starts. — `?toolsets=bogus` → warning logged, falls back to `default` (44), session starts.
- [x] Partition unit test passes (all 80 tools mapped exactly once). — `src/__tests__/toolsets.test.ts`.
- [x] `AGENTS.md` documents the toolset map, env var, and query param; `README.md` gains a "Toolsets" section. — plus `.env.example`.

---

## Feature D — `service_resource_verb` naming

> **Status: ✅ Implemented (2026-07-22).** Resource-first rename shipped via clean cutover (no legacy aliases). The mapping below shows the original examples; the full 80-tool table lives in the implementation plan.

### D.1 What changes

Rename tools from verb-first to resource-first so the prefix groups by resource (aligning with the C.2 toolsets) and alphabetical sort in tool pickers keeps a resource's operations together. Examples:

| Current (`service_verb_resource`) | New (`service_resource_verb`) |
|---|---|
| `teamstorm_list_tasks` | `teamstorm_tasks_list` |
| `teamstorm_get_task` | `teamstorm_tasks_get` |
| `teamstorm_create_task` | `teamstorm_tasks_create` |
| `teamstorm_update_task` | `teamstorm_tasks_update` |
| `teamstorm_get_task_count` | `teamstorm_tasks_count` |
| `teamstorm_list_tasks_by_parent` | `teamstorm_tasks_list_by_parent` |
| `teamstorm_get_folder_tree` | `teamstorm_folders_tree` |
| `teamstorm_list_document_comments` | `teamstorm_document_comments_list` |

Rule: `teamstorm_<resource>_<verb>[_<qualifier>]`, where `<resource>` is the singular/plural noun already implied by the domain folder, `<verb>` ∈ {`list`, `get`, `create`, `update`, `count`, `share`, `block`, …}.

### D.2 Value / cost honesty

Low value in isolation — the audit rated this cosmetic. It becomes worth doing **only alongside Feature C**, because (a) both edit the registration layer, so you touch these files once, and (b) resource-first names visually reinforce the toolset grouping (`teamstorm_tasks_*` ⊂ `tasks` toolset). If Feature C is deferred, defer this too.

### D.3 Breaking-change management

Tool names are identifiers. Renaming breaks any saved client config, stored prompt, or workflow that calls a tool by its old name. Since the repo currently has **one test user**, the cheapest correct path is a **clean cutover** (rename, no aliases) — but the mechanism below must exist for when there are more consumers.

**Compatibility mode (opt-in, default off):** env var `TEAMSTORM_LEGACY_TOOL_NAMES=true` additionally registers each old name as a deprecated alias pointing at the same handler, with `description` prefixed `[DEPRECATED — use teamstorm_<new_name>]`. Default is off because dual-registration doubles the tool count to 160, directly fighting Feature C's token-cost goal. Document that this is a temporary migration bridge, to be removed one release after consumers cut over.

### D.4 Implementation

- The tool name is a hardcoded string literal in each `server.registerTool('teamstorm_...', …)` call across ~80 files. The rename is mechanical but touches every tool file. Do it as a single dedicated commit, separate from Feature C's logic changes, so the diff is reviewable as "pure rename."
- Keep the internal `execute` function names, exported symbols, and schema names **unchanged** — only the wire-facing tool-name string changes. This keeps the diff to one line per file and avoids churn in `src/tools/index.ts` barrels.
- Update the server `instructions` block ([src/index.ts:532](src/index.ts)) and any tool-name references inside other tools' `description` text (e.g. `block.ts` mentions `teamstorm_unblock_document`) to the new names.

### D.5 Testing & acceptance

- [x] `tools/list` shows every tool under its new `teamstorm_<resource>_<verb>` name; no verb-first names remain. — verified via the naming guard (80 names) and end-to-end `tools/list`.
- [x] Guard test: no verb-first names remain. — implemented as `src/__tests__/tool-naming.test.ts`, introspecting the registered wire names via a stub `McpServer` (chosen over a filesystem grep, which false-positives on prompt/instruction/client prose).
- [~] ~~`TEAMSTORM_LEGACY_TOOL_NAMES=true` dual-registration~~ — **N/A: not built.** Clean cutover chosen (one test user), per D.3.
- [x] Cross-references in `instructions` and inter-tool descriptions use new names. — swept in the same pass (`index.ts` instructions, `block.ts`→`teamstorm_documents_unblock`, `statuses/list.ts`→`teamstorm_document_statuses_list`, client hints, etc.).
- [x] `AGENTS.md` / `README.md` examples updated to new names. — plus `openAPI-coverage-report.md`.

---

## Cross-cutting

- **Sequence:** ship C, validate the token-cost win, then do D as a follow-up rename commit. Don't interleave — keep the rename diff pure. **(C shipped 2026-07-22; D shipped 2026-07-22.)**
- **Docs:** both features need `AGENTS.md` (architecture) and `README.md` (user-facing config) updates. The `README.md`/`AGENTS.md` tool count now reads 80 (the stale 63 was already corrected in a prior commit). C's and D's docs are done (D also updated `openAPI-coverage-report.md`).
- **No API/client changes:** like the prompts/resources work, neither feature adds or modifies a `TeamStormClient` method; both operate purely at the registration layer.
- **Interaction with prompts/resources doc:** the prompt/resource registration from `REQUIREMENTS-prompts-resources.md` should slot into the same per-session setup block; if both land, `registerAllPrompts` / `registerAllResources` sit next to `registerToolsets` at the [src/index.ts:557](src/index.ts) site. Prompts reference tools by name in their instruction text, so if Feature D ships, prompt text must use the new names.
