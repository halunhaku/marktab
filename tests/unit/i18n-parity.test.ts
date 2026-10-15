import { describe, expect, it } from 'vitest';
import { en } from '@/locales/en';
import { zh } from '@/locales/zh';
import { MESSAGE_DICTS, interpolate, resolveLocale } from '@/locales';

/** Keys present in `a` but missing from `b`. */
function missingFrom(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  return Object.keys(a)
    .filter((key) => !Object.hasOwn(b, key))
    .sort();
}

describe('message catalogue parity', () => {
  it('defines exactly the same keys in en and zh', () => {
    expect(missingFrom(en, zh)).toEqual([]);
    expect(missingFrom(zh, en)).toEqual([]);
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
  });

  it('keeps every message a non-empty, trimmed string', () => {
    for (const [locale, dict] of Object.entries(MESSAGE_DICTS)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `${locale}.${key} is not a string`).toBe('string');
        expect(value.trim(), `${locale}.${key} is blank`).not.toBe('');
        expect(value, `${locale}.${key} has surrounding whitespace`).toBe(value.trim());
      }
    }
  });
});

describe('interpolate', () => {
  it('substitutes known parameters and leaves unknown ones untouched', () => {
    expect(interpolate('{a} and {b}', { a: 'x' })).toBe('x and {b}');
  });
});

describe('resolveLocale', () => {
  it('honours an explicit language setting over the browser language', () => {
    expect(resolveLocale('en', 'zh-CN')).toBe('en');
    expect(resolveLocale('zh', 'en-US')).toBe('zh');
  });

  it('follows the browser language when the setting is auto', () => {
    expect(resolveLocale('auto', 'zh-CN')).toBe('zh');
    expect(resolveLocale('auto', 'zh-Hans-CN')).toBe('zh');
    expect(resolveLocale('auto', 'en-US')).toBe('en');
  });
});

describe('MESSAGE_DICTS', () => {
  it('exposes the exact catalogue objects', () => {
    expect(MESSAGE_DICTS.en).toBe(en);
    expect(MESSAGE_DICTS.zh).toBe(zh);
  });
});
