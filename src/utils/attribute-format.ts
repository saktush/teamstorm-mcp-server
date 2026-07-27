import type { TeamStormAttribute, TeamStormAttributeOptionRef } from '../client/types.js';
import { formatDate, formatDuration } from './dates.js';

/**
 * Единый форматтер значений атрибутов.
 *
 * Зачем: раньше существовало два несогласованных форматтера — в `formatTaskMarkdown`
 * (ветвление по `attr.type`, но без веток для `UniSelect` и с `join(', ')` по объектам
 * для `Tag` → `[object Object]`) и в `attributes/get.ts` (ветвление по форме значения,
 * печатало `undefined` для `User`). Здесь одна реализация для обоих.
 *
 * Формы значений подтверждены выборкой по 40 задачам на живом API.
 */

/** Плейсхолдер для незаполненного атрибута. */
export const ATTRIBUTE_EMPTY = 'Не заполнено';

type AttrLike = Pick<TeamStormAttribute, 'type' | 'value'>;

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
}

/** Имя ссылочного значения: `name` у справочников, `displayName` у пользователей. */
function refName(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;
  for (const key of ['name', 'displayName', 'username', 'email', 'title']) {
    if (typeof obj[key] === 'string' && obj[key] !== '') return obj[key] as string;
  }
  return null;
}

/**
 * Последняя линия обороны для неизвестных/будущих типов атрибутов.
 * Гарантирует, что `[object Object]` не появится независимо от формы значения.
 */
function structuralFallback(value: unknown): string {
  if (Array.isArray(value)) {
    const parts = value.map((item) => refName(item) ?? JSON.stringify(item));
    return parts.join(', ');
  }
  return refName(value) ?? JSON.stringify(value);
}

/** Человекочитаемое значение атрибута. Никогда не возвращает `[object Object]`. */
export function formatAttributeValue(attr: AttrLike, opts?: { empty?: string }): string {
  const empty = opts?.empty ?? ATTRIBUTE_EMPTY;
  const { value } = attr;

  if (isEmpty(value)) return empty;

  switch (attr.type) {
    case 'UniString':
      return typeof value === 'string' ? value : structuralFallback(value);

    case 'Number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? String(n) : empty;
    }

    case 'TimeDuration': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? formatDuration(n) : empty;
    }

    case 'Date':
      return formatDate(value, empty);

    case 'UniSelect':
    case 'User':
      // Оба приходят объектом; допускаем и массив, и голую строку — API непоследователен.
      return Array.isArray(value) ? structuralFallback(value) : (refName(value) ?? empty);

    case 'Tag':
      return structuralFallback(value) || empty;

    default:
      return structuralFallback(value) || empty;
  }
}

/** Компактное JSON-значение для `structuredContent`. */
export function toCompactAttributeValue(
  attr: AttrLike
): string | number | TeamStormAttributeOptionRef | TeamStormAttributeOptionRef[] | null {
  const { value } = attr;
  if (isEmpty(value)) return null;

  if (typeof value === 'string' || typeof value === 'number') return value;

  const toRef = (item: unknown): TeamStormAttributeOptionRef => ({
    id: String((item as Record<string, unknown>)?.id ?? ''),
    name: refName(item) ?? '',
  });

  return Array.isArray(value) ? value.map(toRef) : toRef(value);
}
