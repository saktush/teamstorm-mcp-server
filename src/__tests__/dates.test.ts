import { describe, it, expect } from 'vitest';
import {
  EMPTY_DATE,
  isNaiveDateString,
  parseApiDate,
  formatDate,
  formatDateTime,
} from '../utils/dates.js';

describe('isNaiveDateString', () => {
  it('recognises API date strings without a zone designator', () => {
    // Confirmed live shape of a `Date` attribute value.
    expect(isNaiveDateString('2026-09-29T21:00:00')).toBe(true);
    expect(isNaiveDateString('2026-09-29')).toBe(true);
    expect(isNaiveDateString('2026-09-29T21:00')).toBe(true);
  });

  it('rejects zoned strings', () => {
    expect(isNaiveDateString('2026-07-10T08:19:52.322744Z')).toBe(false);
    expect(isNaiveDateString('2026-09-29T21:00:00+03:00')).toBe(false);
    expect(isNaiveDateString('garbage')).toBe(false);
  });
});

describe('parseApiDate', () => {
  it('returns null instead of an Invalid Date', () => {
    expect(parseApiDate(undefined)).toBeNull();
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate('garbage')).toBeNull();
    expect(parseApiDate(NaN)).toBeNull();
  });

  it('parses zoned ISO strings', () => {
    const d = parseApiDate('2026-07-10T08:19:52.322744Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe('2026-07-10T08:19:52.322Z');
  });
});

describe('formatDate / formatDateTime', () => {
  it('never emits "Invalid Date"', () => {
    for (const bad of [undefined, null, '', 'garbage', {}, []]) {
      expect(formatDate(bad)).toBe(EMPTY_DATE);
      expect(formatDateTime(bad)).toBe(EMPTY_DATE);
      expect(formatDate(bad)).not.toContain('Invalid');
      expect(formatDateTime(bad)).not.toContain('Invalid');
    }
  });

  it('honours a custom fallback', () => {
    expect(formatDate(null, 'Не заполнено')).toBe('Не заполнено');
  });

  it('keeps the wall-clock day of a naive string regardless of host timezone', () => {
    // The 21:00 hour is exactly where a UTC+3 host would roll over to the 30th.
    expect(formatDate('2026-09-29T21:00:00')).toBe('29.09.2026');
    expect(formatDateTime('2026-09-29T21:00:00')).toBe('29.09.2026, 21:00:00');
    expect(formatDate('2026-09-29')).toBe('29.09.2026');
  });

  it('formats zoned ISO strings in ru-RU, matching the previous inline behaviour', () => {
    expect(formatDate('2024-02-01T00:00:00Z')).toBe(
      new Date('2024-02-01T00:00:00Z').toLocaleDateString('ru-RU')
    );
    expect(formatDateTime('2026-07-10T08:19:52.322744Z')).toBe(
      new Date('2026-07-10T08:19:52.322744Z').toLocaleString('ru-RU')
    );
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date('2024-02-01T00:00:00Z'))).toBe(
      new Date('2024-02-01T00:00:00Z').toLocaleDateString('ru-RU')
    );
  });
});
