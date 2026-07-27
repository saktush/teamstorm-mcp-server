import { z } from 'zod';

/**
 * Общая сборка ответа для «списочных» инструментов.
 *
 * Зачем: вызовы падали целиком по лимиту в 1 МБ. Замер на живой папке «Встречи»
 * (334 задачи) показал, что markdown занимает ~42 КБ, а `structuredContent`,
 * куда клали сырые объекты задач, — 2755 КБ, из них 1560 КБ HTML-описаний.
 * То есть раздувала ответ не разметка, а дублирующая структурная часть.
 *
 * Здесь один утиль на все инструменты: проекция полей, потолок по количеству,
 * вырезание HTML и — главное — жёсткий бюджет по байтам, который держит размер
 * независимо от формы данных.
 */

export type OutputFormat = 'markdown' | 'json';

export interface ToolTextResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Максимум элементов, который инструмент отдаст даже если попросили больше. */
export const HARD_CAP = 200;
export const DEFAULT_MAX_ITEMS = 50;
export const DEFAULT_DESCRIPTION_MAX_CHARS = 500;
/** Бюджет на сериализованный ответ. Лимит транспорта — 1 МБ, берём с запасом. */
export const MAX_PAYLOAD_BYTES = 256 * 1024;

/**
 * Раскладывается в `.extend()` поверх существующей `.strict()`-схемы.
 *
 * Два независимых уровня валидации:
 *  — схема: эти ключи становятся ОБЪЯВЛЕННЫМИ, поэтому `.strict()` продолжает
 *    отклонять действительно неизвестные аргументы;
 *  — значения: `fields` — это `z.array(z.string())`, а не `z.enum`, чтобы форма
 *    оставалась общей для всех инструментов. Конкретные имена проверяются в
 *    `buildListResult` против `allowedFields`, и опечатка не роняет вызов.
 */
export const OUTPUT_PARAMS_SHAPE = {
  format: z
    .enum(['markdown', 'json'])
    .optional()
    .default('markdown')
    .describe(
      'Формат вывода: "markdown" (по умолчанию, для чтения человеком) или "json" (компактные структурированные данные для отчётов).'
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      'Какие поля вернуть в режиме json. По умолчанию — компактный набор. Неизвестные имена игнорируются с предупреждением.'
    ),
  maxItems: z
    .number()
    .int()
    .positive()
    .max(HARD_CAP)
    .optional()
    .describe(`Максимум элементов в ответе (потолок: ${HARD_CAP}).`),
  descriptionMaxChars: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('До скольких символов обрезать описание, если оно запрошено через fields.'),
};

export interface ListMeta {
  returned: number;
  requested: number;
  hasMore: boolean;
  nextToken?: string | null;
  truncatedByCap: boolean;
  truncatedByBytes: boolean;
  warnings: string[];
}

export interface BuildListOptions<T> {
  items: T[];
  nextToken?: string | null;
  format: OutputFormat;
  fields?: string[];
  maxItems?: number;
  descriptionMaxChars?: number;
  allowedFields: readonly string[];
  defaultFields: readonly string[];
  identityFields: readonly string[];
  project: (
    item: T,
    fields: Set<string>,
    opts: { descriptionMaxChars: number }
  ) => Record<string, unknown>;
  renderMarkdown: (items: T[], meta: ListMeta) => string;
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** HTML-описание → читаемый текст. Без новых зависимостей. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function truncate(text: string, max: number): string {
  if (max <= 0) return '';
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export function renderPaginationFooter(meta: ListMeta): string {
  const parts: string[] = [];

  if (meta.truncatedByCap) {
    parts.push(`показано ${meta.returned} из ${meta.requested} загруженных`);
  }
  if (meta.truncatedByBytes) {
    parts.push('ответ обрезан по размеру');
  }
  if (meta.nextToken) {
    parts.push(`следующая страница: fromToken="${meta.nextToken}"`);
  }

  const warnings = meta.warnings.length ? `\n⚠️ ${meta.warnings.join('; ')}` : '';
  if (parts.length === 0) return warnings;

  return `\n\n📄 ${parts.join(' · ')}${warnings}`;
}

function resolveFields(
  requested: string[] | undefined,
  allowed: readonly string[],
  fallback: readonly string[]
): { fields: Set<string>; warnings: string[] } {
  if (!requested || requested.length === 0) {
    return { fields: new Set(fallback), warnings: [] };
  }

  const allowedSet = new Set(allowed);
  const kept = requested.filter((f) => allowedSet.has(f));
  const dropped = requested.filter((f) => !allowedSet.has(f));

  const warnings = dropped.length
    ? [`неизвестные поля проигнорированы: ${dropped.join(', ')}`]
    : [];

  // Если не осталось ни одного валидного поля — не отдаём пустые объекты.
  return { fields: new Set(kept.length ? kept : fallback), warnings };
}

export function buildListResult<T>(o: BuildListOptions<T>): ToolTextResult {
  const limit = Math.min(o.maxItems ?? DEFAULT_MAX_ITEMS, HARD_CAP);
  const descriptionMaxChars = o.descriptionMaxChars ?? DEFAULT_DESCRIPTION_MAX_CHARS;

  const { fields, warnings } = resolveFields(o.fields, o.allowedFields, o.defaultFields);
  const identity = new Set(o.identityFields);

  let sliced = o.items.slice(0, limit);

  const meta: ListMeta = {
    returned: sliced.length,
    requested: o.items.length,
    hasMore: o.items.length > limit || !!o.nextToken,
    nextToken: o.nextToken ?? null,
    truncatedByCap: o.items.length > limit,
    truncatedByBytes: false,
    warnings,
  };

  const assemble = (rows: T[]): ToolTextResult => {
    meta.returned = rows.length;

    const projected = rows.map((item) =>
      o.project(item, o.format === 'json' ? fields : identity, { descriptionMaxChars })
    );
    const structuredContent: Record<string, unknown> = { items: projected, ...meta };

    const text =
      o.format === 'json'
        ? JSON.stringify(structuredContent)
        : o.renderMarkdown(rows, meta) + renderPaginationFooter(meta);

    return { content: [{ type: 'text', text }], structuredContent };
  };

  // Бюджет по байтам — та самая гарантия, что ответ больше не упадёт целиком.
  // Считаем по факту сериализации, поэтому не зависим от формы элемента.
  let result = assemble(sliced);
  while (sliced.length > 1 && Buffer.byteLength(JSON.stringify(result)) > MAX_PAYLOAD_BYTES) {
    sliced = sliced.slice(0, Math.max(1, Math.floor(sliced.length / 2)));
    meta.truncatedByBytes = true;
    meta.hasMore = true;
    result = assemble(sliced);
  }

  if (meta.truncatedByBytes && !warnings.some((w) => w.includes('размер'))) {
    meta.warnings.push('ответ обрезан по размеру — запросите меньше элементов или полей');
    result = assemble(sliced);
  }

  return result;
}
