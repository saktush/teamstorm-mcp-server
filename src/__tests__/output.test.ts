import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  OUTPUT_PARAMS_SHAPE,
  MAX_PAYLOAD_BYTES,
  HARD_CAP,
  buildListResult,
  stripHtml,
  truncate,
} from '../utils/output.js';
import { projectTask, TASK_FIELD_NAMES, TASK_DEFAULT_FIELDS } from '../utils/task-projection.js';
import type { TeamStormTask } from '../client/types.js';

const user = { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' };

function buildTask(i: number, descriptionBytes = 0): TeamStormTask {
  return {
    id: `id-${i}`,
    key: `CS-${1000 + i}`,
    name: `Задача ${i}`,
    description: descriptionBytes ? `<p>${'x'.repeat(descriptionBytes)}</p>` : '',
    type: { id: 'type1', name: 'Встреча' },
    workflow: { id: 'wf1', name: 'Default' },
    status: { id: 's1', name: 'Выполнено', category: { id: 'c1', name: 'Done' } },
    createdDate: '2026-07-07T08:20:45.317733Z',
    dueDate: '2026-07-10T00:00:00Z',
    assignee: user,
    author: user,
    changedBy: user,
    // FolderThumbModel is {id, name} only — no `nodeType` (see F2, task-2a-brief.md).
    folder: { id: 'f1', name: 'Встречи' },
    originalEstimate: 0,
    timeSpent: 0,
    remainingEstimate: 0,
    storyPoints: 0,
    attributes: [],
    portfolios: [],
    workspace: { id: 'ws1', key: 'CS', name: 'CS', description: '', author: user },
  };
}

function build(items: TeamStormTask[], overrides: Record<string, unknown> = {}) {
  return buildListResult<TeamStormTask>({
    items,
    format: 'markdown',
    allowedFields: TASK_FIELD_NAMES,
    defaultFields: TASK_DEFAULT_FIELDS,
    identityFields: ['id', 'key', 'name'],
    project: projectTask,
    renderMarkdown: (rows) => rows.map((t) => `- ${t.key}: ${t.name}`).join('\n'),
    ...overrides,
  });
}

describe('OUTPUT_PARAMS_SHAPE', () => {
  // Версионно-чувствительное допущение: если zod перестанет сохранять strict
  // при .extend(), схемы молча начнут принимать мусор.
  it('preserves .strict() through .extend()', () => {
    const schema = z.object({ workspace: z.string() }).strict().extend(OUTPUT_PARAMS_SHAPE);

    expect(schema.safeParse({ workspace: 'CS' }).success).toBe(true);
    expect(schema.safeParse({ workspace: 'CS', format: 'json' }).success).toBe(true);
    expect(schema.safeParse({ workspace: 'CS', totallyUnknown: 1 }).success).toBe(false);
  });

  it('defaults format to markdown so existing callers are unaffected', () => {
    const schema = z.object({}).strict().extend(OUTPUT_PARAMS_SHAPE);
    expect(schema.parse({}).format).toBe('markdown');
  });

  it('rejects a maxItems above the hard cap', () => {
    const schema = z.object({}).strict().extend(OUTPUT_PARAMS_SHAPE);
    expect(schema.safeParse({ maxItems: HARD_CAP + 1 }).success).toBe(false);
  });
});

describe('stripHtml / truncate', () => {
  it('turns TeamStorm description HTML into readable text', () => {
    const html =
      '<p data-uuid="x" class="" style="">Прошу ознакомиться с ПМИ.</p><p></p><p>Второй абзац</p>';
    const text = stripHtml(html);
    expect(text).not.toContain('<');
    expect(text).toContain('Прошу ознакомиться с ПМИ.');
    expect(text).toContain('Второй абзац');
  });

  it('decodes common entities', () => {
    expect(stripHtml('a&nbsp;&amp;&nbsp;b')).toBe('a & b');
  });

  it('truncates with an ellipsis', () => {
    expect(truncate('abcdef', 3)).toBe('abc…');
    expect(truncate('abc', 10)).toBe('abc');
  });
});

describe('buildListResult', () => {
  it('caps the item count and reports hasMore', () => {
    const result = build(
      Array.from({ length: 120 }, (_, i) => buildTask(i)),
      { maxItems: 10 }
    );
    const meta = result.structuredContent as Record<string, unknown>;

    expect((meta.items as unknown[]).length).toBe(10);
    expect(meta.returned).toBe(10);
    expect(meta.hasMore).toBe(true);
    expect(meta.truncatedByCap).toBe(true);
  });

  it('keeps structuredContent to identity fields in markdown mode', () => {
    const result = build([buildTask(1, 5000)]);
    const items = (result.structuredContent as { items: Record<string, unknown>[] }).items;

    expect(Object.keys(items[0]).sort()).toEqual(['id', 'key', 'name']);
    // Раздутое HTML-описание не должно утекать в structuredContent.
    expect(JSON.stringify(result)).not.toContain('xxxxx');
  });

  it('returns projected rows in json mode', () => {
    const result = build([buildTask(1)], { format: 'json' });
    const items = (result.structuredContent as { items: Record<string, unknown>[] }).items;

    expect(items[0].key).toBe('CS-1001');
    expect(items[0].status).toEqual({ id: 's1', name: 'Выполнено', category: 'Done' });
    // description не входит в поля по умолчанию
    expect(items[0].description).toBeUndefined();
    // content тоже должен нести данные: многие клиенты показывают только его
    expect(result.content[0].text).toContain('CS-1001');
  });

  it('drops unknown field names with a warning instead of throwing', () => {
    const result = build([buildTask(1)], { format: 'json', fields: ['key', 'nope'] });
    const meta = result.structuredContent as Record<string, unknown>;

    expect(meta.warnings).toEqual([expect.stringContaining('nope')]);
    const items = meta.items as Record<string, unknown>[];
    expect(items[0].key).toBe('CS-1001');
  });

  it('strips and truncates HTML when description is explicitly requested', () => {
    const result = build([buildTask(1, 5000)], {
      format: 'json',
      fields: ['key', 'description'],
      descriptionMaxChars: 50,
    });
    const items = (result.structuredContent as { items: Record<string, unknown>[] }).items;
    const description = items[0].description as string;

    expect(description).not.toContain('<p>');
    expect(description.length).toBeLessThanOrEqual(51);
  });

  // Регрессия на баг из отчёта: вызовы падали целиком по лимиту 1 МБ,
  // потому что structuredContent содержал 2755 КБ сырых задач (1560 КБ — HTML).
  it('stays within the byte budget even with 400 huge tasks, in both formats', () => {
    const huge = Array.from({ length: 400 }, (_, i) => buildTask(i, 8000));

    for (const format of ['markdown', 'json'] as const) {
      const result = build(huge, { format, maxItems: HARD_CAP });
      const bytes = Buffer.byteLength(JSON.stringify(result));

      expect(bytes).toBeLessThan(MAX_PAYLOAD_BYTES);
      expect((result.structuredContent as { hasMore: boolean }).hasMore).toBe(true);
    }
  });
});

describe('projectTask parent field', () => {
  // Regression for F2 (task-2a-brief.md): `task.parent` resolves to
  // TreeNodeThumbModel {id, nodeType} — it has no `name`, unlike `task.folder`
  // (FolderThumbModel {id, name}). Reusing the generic name-ref helper for both
  // silently produced `{id, name: ''}` for parent, dropping the real nodeType.
  it('projects id + nodeType, not a blank name', () => {
    const task = buildTask(0);
    task.parent = { id: 'parent-1', nodeType: 'Folder' };

    const projected = projectTask(task, new Set(['parent']), { descriptionMaxChars: 500 });

    expect(projected.parent).toEqual({ id: 'parent-1', nodeType: 'Folder' });
  });

  it('projects null when there is no parent', () => {
    const task = buildTask(0);

    const projected = projectTask(task, new Set(['parent']), { descriptionMaxChars: 500 });

    expect(projected.parent).toBeNull();
  });

  // Fix-round Important 1: `name` is optional on TeamStormTreeNodeThumb, not
  // absent — emit it when the API sends it, so `fields:['parent']` still returns
  // a human-readable label instead of forcing a second lookup by id.
  it('includes name alongside nodeType when the API sends both', () => {
    const task = buildTask(0);
    task.parent = { id: 'parent-1', name: 'Meetings', nodeType: 'Folder' };

    const projected = projectTask(task, new Set(['parent']), { descriptionMaxChars: 500 });

    expect(projected.parent).toEqual({ id: 'parent-1', name: 'Meetings', nodeType: 'Folder' });
  });
});
