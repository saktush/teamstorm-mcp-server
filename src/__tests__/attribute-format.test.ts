import { describe, it, expect } from 'vitest';
import {
  ATTRIBUTE_EMPTY,
  formatAttributeValue,
  toCompactAttributeValue,
} from '../utils/attribute-format.js';
import type { TeamStormAttribute } from '../client/types.js';

type Attr = Pick<TeamStormAttribute, 'type' | 'value'>;

/**
 * Every fixture below is a value shape confirmed against the live TeamStorm API
 * (`/workspaces/CS/workitems/updates`, 40-task survey).
 */
const UNI_SELECT: Attr = {
  type: 'UniSelect',
  value: { id: 'a5e109f7-5c50-44a9-b764-fd5696ef0760', name: 'D (3-99)' },
};
const TAG: Attr = {
  type: 'Tag',
  value: [
    { id: '59c8fd91-3245-41b9-a109-c93d67c44905', name: 'tehnorama.ru' },
    { id: '11111111-1111-1111-1111-111111111111', name: 'Инвестиции' },
  ],
};
const USER: Attr = {
  type: 'User',
  value: {
    id: '308e9063-a8b6-480c-8cfb-20abc77d48a1',
    displayName: 'Anastasia Ivanova',
    username: 'anastasia.ivanova',
    email: 'anastasia.ivanova@teamstorm.io',
    providerId: '35e700f5-6819-470a-9531-6e1bc3b209e5',
  },
};

describe('formatAttributeValue', () => {
  it('renders UniSelect objects as the option name, not [object Object]', () => {
    expect(formatAttributeValue(UNI_SELECT)).toBe('D (3-99)');
  });

  it('renders Tag arrays of objects as joined names, not [object Object]', () => {
    expect(formatAttributeValue(TAG)).toBe('tehnorama.ru, Инвестиции');
  });

  it('renders User objects via displayName', () => {
    expect(formatAttributeValue(USER)).toBe('Anastasia Ivanova');
  });

  it('renders UniString and Number as-is', () => {
    expect(
      formatAttributeValue({ type: 'UniString', value: 'https://teamstorm.amocrm.ru/leads/1' })
    ).toBe('https://teamstorm.amocrm.ru/leads/1');
    expect(formatAttributeValue({ type: 'Number', value: 42 })).toBe('42');
    expect(formatAttributeValue({ type: 'Number', value: 0 })).toBe('0');
  });

  it('renders naive Date strings without shifting the day', () => {
    expect(formatAttributeValue({ type: 'Date', value: '2026-09-29T21:00:00' })).toBe('29.09.2026');
  });

  it('renders TimeDuration seconds in human form', () => {
    expect(formatAttributeValue({ type: 'TimeDuration', value: 3600 })).toBe('1ч');
  });

  it('returns the empty placeholder for null on every type', () => {
    const types: TeamStormAttribute['type'][] = [
      'UniString',
      'Number',
      'Date',
      'UniSelect',
      'Tag',
      'User',
      'TimeDuration',
    ];
    for (const type of types) {
      expect(formatAttributeValue({ type, value: null })).toBe(ATTRIBUTE_EMPTY);
    }
  });

  it('treats an empty Tag array as empty', () => {
    expect(formatAttributeValue({ type: 'Tag', value: [] })).toBe(ATTRIBUTE_EMPTY);
  });

  it('honours a custom empty placeholder', () => {
    expect(formatAttributeValue({ type: 'Tag', value: null }, { empty: '— (не заполнено)' })).toBe(
      '— (не заполнено)'
    );
  });

  it('never emits [object Object] for an unknown future type', () => {
    const unknownObject = {
      type: 'SomeFutureType',
      value: { id: 'x', name: 'Понятное имя' },
    } as unknown as Attr;
    expect(formatAttributeValue(unknownObject)).toBe('Понятное имя');

    const unknownArray = {
      type: 'SomeFutureType',
      value: [
        { id: 'x', name: 'A' },
        { id: 'y', displayName: 'B' },
      ],
    } as unknown as Attr;
    expect(formatAttributeValue(unknownArray)).toBe('A, B');

    const opaque = { type: 'SomeFutureType', value: { foo: 1 } } as unknown as Attr;
    expect(formatAttributeValue(opaque)).not.toContain('[object Object]');
  });
});

describe('toCompactAttributeValue', () => {
  it('keeps id/name refs but drops User PII beyond identity', () => {
    expect(toCompactAttributeValue(UNI_SELECT)).toEqual({
      id: 'a5e109f7-5c50-44a9-b764-fd5696ef0760',
      name: 'D (3-99)',
    });
    expect(toCompactAttributeValue(TAG)).toEqual([
      { id: '59c8fd91-3245-41b9-a109-c93d67c44905', name: 'tehnorama.ru' },
      { id: '11111111-1111-1111-1111-111111111111', name: 'Инвестиции' },
    ]);
    expect(toCompactAttributeValue(USER)).toEqual({
      id: '308e9063-a8b6-480c-8cfb-20abc77d48a1',
      name: 'Anastasia Ivanova',
    });
  });

  it('passes scalars through and normalises empties to null', () => {
    expect(toCompactAttributeValue({ type: 'UniString', value: 'x' })).toBe('x');
    expect(toCompactAttributeValue({ type: 'Number', value: 7 })).toBe(7);
    expect(toCompactAttributeValue({ type: 'Date', value: '2026-09-29T21:00:00' })).toBe(
      '2026-09-29T21:00:00'
    );
    expect(toCompactAttributeValue({ type: 'Tag', value: null })).toBeNull();
    expect(toCompactAttributeValue({ type: 'Tag', value: [] })).toBeNull();
  });

  it('is JSON-serialisable without [object Object]', () => {
    const json = JSON.stringify([UNI_SELECT, TAG, USER].map(toCompactAttributeValue));
    expect(json).not.toContain('[object Object]');
  });
});
