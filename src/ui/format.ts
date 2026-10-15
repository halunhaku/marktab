import { relativeTime } from '@/core/util/time';
import { currentLocale, localeTag, t, tCount } from '@/locales';

/** "3 min ago", "2 d ago", or a formatted date for older entries. */
export function relativeLabel(timestamp: number, now: number = Date.now()): string {
  const { unit, value } = relativeTime(timestamp, now);
  switch (unit) {
    case 'now':
      return t('time.now');
    case 'minute':
      return t('time.minutes', { count: value });
    case 'hour':
      return t('time.hours', { count: value });
    case 'day':
      return t('time.days', { count: value });
    case 'week':
      return t('time.weeks', { count: value });
    default:
      return formatDate(value);
  }
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  try {
    return new Intl.DateTimeFormat(localeTag(currentLocale.value), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toDateString();
  }
}

export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat(localeTag(currentLocale.value)).format(value);
  } catch {
    return String(value);
  }
}

/** `12 items` / `12 项`, used for counts in headers and cards. */
export function itemCountLabel(count: number): string {
  return tCount('common.items', count, { count: formatNumber(count) });
}
