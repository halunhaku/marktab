export type TimeUnit = 'now' | 'minute' | 'hour' | 'day' | 'week' | 'date';

export interface RelativeTime {
  unit: TimeUnit;
  value: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Resolves a timestamp into a unit + amount. Formatting lives in the i18n layer
 * so the core stays locale-free and trivially testable.
 */
export function relativeTime(timestamp: number, now: number = Date.now()): RelativeTime {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return { unit: 'date', value: 0 };
  const delta = now - timestamp;
  if (delta < 45_000) return { unit: 'now', value: 0 };
  if (delta < HOUR) return { unit: 'minute', value: Math.max(1, Math.round(delta / MINUTE)) };
  if (delta < DAY) return { unit: 'hour', value: Math.round(delta / HOUR) };
  if (delta < WEEK) return { unit: 'day', value: Math.round(delta / DAY) };
  if (delta < 4 * WEEK) return { unit: 'week', value: Math.round(delta / WEEK) };
  return { unit: 'date', value: timestamp };
}

export interface ClockReading {
  time: string;
  date: string;
}

export function clockReading(date: Date, locale: string): ClockReading {
  try {
    return {
      time: new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale.startsWith('en'),
      }).format(date),
      date: new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(date),
    };
  } catch {
    return { time: date.toTimeString().slice(0, 5), date: date.toDateString() };
  }
}

/** Greeting bucket for the hero; the i18n layer turns it into a sentence. */
export type GreetingKey = 'morning' | 'afternoon' | 'evening' | 'night';

export function greetingFor(date: Date): GreetingKey {
  const hour = date.getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 23) return 'evening';
  return 'night';
}
