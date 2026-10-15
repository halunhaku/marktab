import { beforeEach, describe, expect, it } from 'vitest';
import { en, type MessageKey } from '@/locales/en';
import { zh } from '@/locales/zh';
import {
  LOCALE_LABELS,
  MESSAGE_DICTS,
  currentLocale,
  detectUiLanguage,
  interpolate,
  localeTag,
  resolveLocale,
  tCount,
  translate,
  type CountMessageKey,
} from '@/locales/index';
import { settings } from '@/core/settings/store';
import { cloneDefaults } from '@/core/settings/types';
import { createFakeChrome } from './helpers/fakes';

const COUNT_KEYS: CountMessageKey[] = ['common.items', 'search.resultsCount'];

const enKeys = Object.keys(en) as MessageKey[];
const zhKeys = Object.keys(zh) as MessageKey[];

/** Distinct `{placeholder}` names used by a message. */
function placeholders(message: string): string[] {
  return [...new Set(message.match(/\{(\w+)\}/g) ?? [])].sort();
}

beforeEach(() => {
  settings.value = cloneDefaults();
});

describe('catalogue integrity', () => {
  it('ships exactly the same key set in both locales', () => {
    expect([...zhKeys].sort()).toEqual([...enKeys].sort());
    expect(enKeys.length).toBeGreaterThan(200);
    expect(Object.keys(MESSAGE_DICTS.en)).toEqual(enKeys);
    expect(Object.keys(MESSAGE_DICTS.zh)).toEqual(zhKeys);
  });

  it('has no empty message in either locale', () => {
    for (const key of enKeys) {
      expect(typeof en[key], `en.${key}`).toBe('string');
      expect(en[key].trim(), `en.${key}`).not.toBe('');
    }
    for (const key of zhKeys) {
      expect(typeof zh[key], `zh.${key}`).toBe('string');
      expect(zh[key].trim(), `zh.${key}`).not.toBe('');
    }
  });

  it('uses the same placeholders in both locales', () => {
    for (const key of enKeys) {
      expect(placeholders(zh[key]), `placeholders of ${key}`).toEqual(placeholders(en[key]));
    }
  });

  it('defines both count forms for every count-aware message', () => {
    for (const key of COUNT_KEYS) {
      for (const suffix of ['one', 'other'] as const) {
        const messageKey = `${key}.${suffix}` as MessageKey;
        expect(enKeys).toContain(messageKey);
        expect(zhKeys).toContain(messageKey);
        expect(placeholders(en[messageKey])).toEqual(['{count}']);
        expect(placeholders(zh[messageKey])).toEqual(['{count}']);
      }
    }
  });

  it('distinguishes singular and plural in English and repeats the string in Chinese', () => {
    for (const key of COUNT_KEYS) {
      expect(en[`${key}.one` as MessageKey]).not.toBe(en[`${key}.other` as MessageKey]);
      // Chinese measure words do not inflect, so both forms are identical by design.
      expect(zh[`${key}.one` as MessageKey]).toBe(zh[`${key}.other` as MessageKey]);
    }
  });

  it('labels both locales', () => {
    expect(Object.keys(LOCALE_LABELS).sort()).toEqual(['en', 'zh']);
    expect(localeTag('en')).toBe('en-US');
    expect(localeTag('zh')).toBe('zh-CN');
  });
});

describe('interpolate', () => {
  it('replaces the named placeholders and leaves unknown ones untouched', () => {
    expect(interpolate('Open {url}', { url: 'https://example.com' })).toBe('Open https://example.com');
    expect(interpolate('{a} and {b}', { a: '1' })).toBe('1 and {b}');
    expect(interpolate('{missing}', {})).toBe('{missing}');
  });

  it('replaces every occurrence of the same placeholder', () => {
    expect(interpolate('{a}-{a}-{a}', { a: 'x' })).toBe('x-x-x');
  });

  it('stringifies numbers and ignores extra parameters', () => {
    expect(interpolate('{count} items', { count: 0 })).toBe('0 items');
    expect(interpolate('{count} items', { count: 12, other: 'ignored' })).toBe('12 items');
  });

  it('returns the template untouched when no parameters are given', () => {
    expect(interpolate('No {placeholders} here')).toBe('No {placeholders} here');
    expect(interpolate('{a}', undefined)).toBe('{a}');
  });

  it('only treats word characters as placeholder names', () => {
    expect(interpolate('{ a }', { a: 'x' })).toBe('{ a }');
    expect(interpolate('{a.b}', { a: 'x' })).toBe('{a.b}');
    expect(interpolate('{}', {})).toBe('{}');
  });
});

describe('translate', () => {
  it('reads from the requested locale', () => {
    expect(translate('en', 'nav.home')).toBe(en['nav.home']);
    expect(translate('zh', 'nav.home')).toBe(zh['nav.home']);
    expect(translate('zh', 'nav.home')).not.toBe(en['nav.home']);
  });

  it('interpolates the parameters it is given', () => {
    expect(translate('en', 'search.webFor', { query: 'react' })).toBe(
      interpolate(en['search.webFor'], { query: 'react' }),
    );
    expect(translate('zh', 'search.webFor', { query: 'react' })).toBe(
      interpolate(zh['search.webFor'], { query: 'react' }),
    );
    expect(translate('en', 'search.webFor', { query: 'react' })).not.toContain('{query}');
  });

  it('falls back to the key itself for an unknown message', () => {
    expect(translate('en', 'nope.nope' as MessageKey)).toBe('nope.nope');
    expect(translate('zh', 'common.undo')).toBe(zh['common.undo']);
  });
});

describe('tCount', () => {
  it('uses the singular form for exactly one', () => {
    expect(tCount('common.items', 1)).toBe(interpolate(en['common.items.one'], { count: 1 }));
    expect(tCount('search.resultsCount', 1)).toBe(
      interpolate(en['search.resultsCount.one'], { count: 1 }),
    );
  });

  it('uses the plural form for zero, two and everything else', () => {
    for (const count of [0, 2, 3, 11, 21, 100, -1]) {
      expect(tCount('common.items', count)).toBe(
        interpolate(en['common.items.other'], { count }),
      );
      expect(tCount('search.resultsCount', count)).toBe(
        interpolate(en['search.resultsCount.other'], { count }),
      );
    }
  });

  it('follows the active locale', () => {
    settings.value = { ...cloneDefaults(), language: 'zh' };

    expect(tCount('common.items', 1)).toBe(interpolate(zh['common.items.one'], { count: 1 }));
    expect(tCount('common.items', 2)).toBe(interpolate(zh['common.items.other'], { count: 2 }));
    expect(tCount('common.items', 1)).not.toBe(interpolate(en['common.items.one'], { count: 1 }));
  });

  it('embeds the count in the returned message', () => {
    expect(tCount('common.items', 3)).toContain('3');
    expect(tCount('common.items', 3)).not.toContain('{count}');
  });

  it('keeps additional parameters usable', () => {
    expect(tCount('search.resultsCount', 2, { total: 5 })).toBe(
      interpolate(en['search.resultsCount.other'], { count: 2 }),
    );
  });
});

describe('resolveLocale', () => {
  it('honours an explicit language setting', () => {
    expect(resolveLocale('en', 'zh-CN')).toBe('en');
    expect(resolveLocale('zh', 'en-US')).toBe('zh');
    expect(resolveLocale('zh', '')).toBe('zh');
  });

  it('maps a Chinese browser language to zh', () => {
    for (const language of ['zh', 'zh-CN', 'zh-cn', 'zh-Hans', 'zh-HANS-CN', 'ZH-SG', 'zh-MY', 'zh-TW']) {
      expect(resolveLocale('auto', language), language).toBe('zh');
    }
  });

  it('maps every other browser language to en', () => {
    for (const language of ['en', 'en-US', 'en-GB', 'fr-FR', 'de', 'ja-JP', '']) {
      expect(resolveLocale('auto', language), language).toBe('en');
    }
  });
});

describe('detectUiLanguage', () => {
  it('prefers the extension UI language', () => {
    const chrome = createFakeChrome();
    (chrome as unknown as { i18n: unknown }).i18n = { getUILanguage: () => 'zh-CN' };
    chrome.install();

    expect(detectUiLanguage()).toBe('zh-CN');
    expect(currentLocale.value).toBe('zh');
  });

  it('falls back to the browser language when the extension API throws', () => {
    const chrome = createFakeChrome();
    (chrome as unknown as { i18n: unknown }).i18n = {
      getUILanguage: () => {
        throw new Error('not allowed');
      },
    };
    chrome.install();

    expect(detectUiLanguage()).toBe(navigator.language);
  });

  it('falls back to the browser language without an extension API', () => {
    expect(detectUiLanguage()).toBe(navigator.language);
  });
});

describe('currentLocale', () => {
  it('follows the language setting', () => {
    settings.value = { ...cloneDefaults(), language: 'zh' };
    expect(currentLocale.value).toBe('zh');

    settings.value = { ...cloneDefaults(), language: 'en' };
    expect(currentLocale.value).toBe('en');
  });

  it('resolves auto against the detected language', () => {
    const chrome = createFakeChrome();
    (chrome as unknown as { i18n: unknown }).i18n = { getUILanguage: () => 'de-DE' };
    chrome.install();

    settings.value = { ...cloneDefaults(), language: 'auto' };
    expect(currentLocale.value).toBe('en');
  });
});
