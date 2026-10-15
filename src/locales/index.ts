import { computed } from '@preact/signals';
import { en, type MessageDict, type MessageKey } from './en';
import { zh } from './zh';
import { getI18nApi } from '../core/platform/chrome';
import { settings } from '../core/settings/store';
import type { LanguageSetting } from '../core/settings/types';

export type LocaleId = 'en' | 'zh';

export const MESSAGE_DICTS: Record<LocaleId, MessageDict> = { en, zh };

export const LOCALE_LABELS: Record<LocaleId, string> = { en: 'English', zh: '简体中文' };

/** Browser languages that map to the Simplified Chinese catalogue. */
const ZH_PREFIXES = ['zh', 'zh-cn', 'zh-hans', 'zh-sg', 'zh-my'];

export function resolveLocale(setting: LanguageSetting, uiLanguage: string): LocaleId {
  if (setting === 'en' || setting === 'zh') return setting;
  const normalized = uiLanguage.toLowerCase();
  return ZH_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ? 'zh' : 'en';
}

export function detectUiLanguage(): string {
  const api = getI18nApi();
  if (api?.getUILanguage) {
    try {
      const language = api.getUILanguage();
      if (language) return language;
    } catch {
      /* fall through to navigator */
    }
  }
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en';
}

export const currentLocale = computed<LocaleId>(() =>
  resolveLocale(settings.value.language, detectUiLanguage()),
);

export type MessageParams = Record<string, string | number>;

/** Replaces `{name}` placeholders; unknown parameters are left untouched. */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(locale: LocaleId, key: MessageKey, params?: MessageParams): string {
  const dict = MESSAGE_DICTS[locale] ?? en;
  return interpolate(dict[key] ?? en[key] ?? key, params);
}

export function t(key: MessageKey, params?: MessageParams): string {
  return translate(currentLocale.value, key, params);
}

/**
 * Count-aware message.
 *
 * Messages that embed a count exist twice, as `key.one` and `key.other`, so the
 * grammar lives in the catalogue instead of in a ternary at the call site. Both
 * locales define both forms — Chinese repeats the same string, because its
 * measure words do not inflect — which keeps the lookup rule identical
 * everywhere and stops a missing translation from leaking English into Chinese.
 */
export type CountMessageKey = 'common.items' | 'search.resultsCount';

export function tCount(key: CountMessageKey, count: number, params?: MessageParams): string {
  const suffix = count === 1 ? 'one' : 'other';
  const candidate = `${key}.${suffix}`;
  const dict = MESSAGE_DICTS[currentLocale.value] ?? en;
  // Both locales ship both forms. If a translation ever omits the singular, the
  // plural form is still the right string, which beats falling back to a key.
  const resolved = (Object.hasOwn(dict, candidate) ? candidate : `${key}.other`) as MessageKey;
  return t(resolved, { count, ...params });
}

/** Stable formatter for dates and numbers in the active locale. */
export function localeTag(locale: LocaleId): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

export type { MessageKey };
