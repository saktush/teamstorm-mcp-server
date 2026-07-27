/**
 * Единая точка форматирования дат.
 *
 * Зачем: раньше `new Date(x).toLocaleString('ru-RU')` вызывался инлайном в ~28 местах
 * без единой проверки. Если поле отсутствовало, наружу уходила строка `Invalid Date`
 * (именно так `teamstorm_tasks_list_updated` печатал дату изменения для всех задач).
 * Здесь `Invalid Date` не может появиться в принципе: невалидный вход → плейсхолдер.
 */

/** Плейсхолдер для пустых и невалидных дат. */
export const EMPTY_DATE = '—';

/**
 * «Наивная» дата — без `Z` и без смещения: `2026-09-29T21:00:00`, `2026-09-29`.
 * Именно так TeamStorm отдаёт значения атрибутов типа `Date`.
 */
const NAIVE_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/;

export function isNaiveDateString(raw: string): boolean {
  return NAIVE_DATE_RE.test(raw);
}

/**
 * Парсинг даты из API. Возвращает `null` вместо `Invalid Date` —
 * это и есть та проверка, которой раньше не было нигде.
 */
export function parseApiDate(raw: unknown): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : new Date(raw);
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Наивные строки форматируем срезом, а не через `Date`: значение с сервера —
 * это «стенные часы», и прогонять его через часовой пояс процесса нельзя,
 * иначе `2026-09-29` на хосте с отрицательным смещением станет 28-м числом.
 */
function formatNaive(raw: string, withTime: boolean): string | null {
  const m = NAIVE_DATE_RE.exec(raw);
  if (!m) return null;

  const [, year, month, day, hour, minute, second] = m;
  const date = `${day}.${month}.${year}`;
  if (!withTime || hour === undefined) return date;

  return `${date}, ${hour}:${minute}:${second ?? '00'}`;
}

function format(raw: unknown, fallback: string, withTime: boolean): string {
  if (typeof raw === 'string') {
    const naive = formatNaive(raw, withTime);
    if (naive !== null) return naive;
  }

  const date = parseApiDate(raw);
  if (!date) return fallback;

  return withTime ? date.toLocaleString('ru-RU') : date.toLocaleDateString('ru-RU');
}

/** `29.09.2026`, либо `fallback` если даты нет или она невалидна. */
export function formatDate(raw: unknown, fallback: string = EMPTY_DATE): string {
  return format(raw, fallback, false);
}

/** `29.09.2026, 21:00:00`, либо `fallback` если даты нет или она невалидна. */
export function formatDateTime(raw: unknown, fallback: string = EMPTY_DATE): string {
  return format(raw, fallback, true);
}

/**
 * Длительность в секундах → `1ч 30м`.
 * Живёт здесь, а не в `formatters.ts`, чтобы `attribute-format.ts` мог её использовать
 * без циклического импорта. `formatters.ts` реэкспортирует её для обратной совместимости.
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}ч ${minutes}м`;
  if (hours > 0) return `${hours}ч`;
  return `${minutes}м`;
}
