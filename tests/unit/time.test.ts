import { describe, expect, it } from 'vitest';
import { clockReading, greetingFor, relativeTime } from '@/core/util/time';

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe('relativeTime', () => {
  it('falls back to an absolute date for unusable timestamps', () => {
    expect(relativeTime(0, NOW)).toEqual({ unit: 'date', value: 0 });
    expect(relativeTime(-5, NOW)).toEqual({ unit: 'date', value: 0 });
    expect(relativeTime(Number.NaN, NOW)).toEqual({ unit: 'date', value: 0 });
    expect(relativeTime(Number.POSITIVE_INFINITY, NOW)).toEqual({ unit: 'date', value: 0 });
  });

  it('buckets the last 45 seconds as "now"', () => {
    expect(relativeTime(NOW, NOW)).toEqual({ unit: 'now', value: 0 });
    expect(relativeTime(NOW - 44_999, NOW)).toEqual({ unit: 'now', value: 0 });
  });

  it('counts minutes, never below one', () => {
    expect(relativeTime(NOW - 45_000, NOW)).toEqual({ unit: 'minute', value: 1 });
    expect(relativeTime(NOW - 5 * MINUTE, NOW)).toEqual({ unit: 'minute', value: 5 });
    expect(relativeTime(NOW - 59 * MINUTE - 24_000, NOW)).toEqual({ unit: 'minute', value: 59 });
    // Rounds to the nearest minute, so the last second before the hour reads 60.
    expect(relativeTime(NOW - HOUR + 1, NOW)).toEqual({ unit: 'minute', value: 60 });
  });

  it('counts hours until the first day boundary', () => {
    expect(relativeTime(NOW - HOUR, NOW)).toEqual({ unit: 'hour', value: 1 });
    expect(relativeTime(NOW - 23 * HOUR, NOW)).toEqual({ unit: 'hour', value: 23 });
  });

  it('counts days until the first week boundary', () => {
    expect(relativeTime(NOW - DAY, NOW)).toEqual({ unit: 'day', value: 1 });
    expect(relativeTime(NOW - 6 * DAY, NOW)).toEqual({ unit: 'day', value: 6 });
  });

  it('counts weeks up to the four-week cut-off', () => {
    expect(relativeTime(NOW - WEEK, NOW)).toEqual({ unit: 'week', value: 1 });
    expect(relativeTime(NOW - 27 * DAY, NOW)).toEqual({ unit: 'week', value: 4 });
  });

  it('switches to the absolute date past four weeks', () => {
    expect(relativeTime(NOW - 28 * DAY, NOW)).toEqual({ unit: 'date', value: NOW - 28 * DAY });
  });

  it('injects `now` instead of reading the wall clock', () => {
    const timestamp = 1_600_000_000_000;
    expect(relativeTime(timestamp, timestamp + 2 * DAY)).toEqual({ unit: 'day', value: 2 });
    expect(relativeTime(timestamp, timestamp + 2 * DAY + 5 * MINUTE)).toEqual({
      unit: 'day',
      value: 2,
    });
  });
});

describe('clockReading', () => {
  const date = new Date(2024, 0, 15, 9, 5);

  it('formats a 12-hour clock for english locales', () => {
    expect(clockReading(date, 'en-US')).toEqual({
      time: '09:05 AM',
      date: 'Monday, January 15',
    });
  });

  it('formats a 24-hour clock for other locales', () => {
    const reading = clockReading(date, 'zh-CN');
    expect(reading.time).toBe('09:05');
    expect(reading.date).toContain('15');
  });

  it('falls back to the raw date when the locale is not supported', () => {
    const reading = clockReading(date, 'not a valid locale');
    expect(reading.time).toMatch(/^\d{2}:\d{2}$/);
    expect(reading.date).toBe(date.toDateString());
  });
});

describe('greetingFor', () => {
  const at = (hour: number): string => greetingFor(new Date(2024, 0, 15, hour, 30));

  it('buckets the day into night/morning/afternoon/evening', () => {
    expect(at(0)).toBe('night');
    expect(at(4)).toBe('night');
    expect(at(5)).toBe('morning');
    expect(at(11)).toBe('morning');
    expect(at(12)).toBe('afternoon');
    expect(at(17)).toBe('afternoon');
    expect(at(18)).toBe('evening');
    expect(at(22)).toBe('evening');
    expect(at(23)).toBe('night');
  });
});
