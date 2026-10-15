/**
 * Position of a moment inside the period it belongs to, as a 0…1 fraction.
 *
 * These drive the home dial's two arcs, both of which fill from the start of their
 * period so the graphic answers "how much of it has passed" instead of being pure
 * decoration: the outer arc is the day (0.23 px per minute — it is there to be read
 * at a glance), the inner one is the minute (one lap a minute, so it also shows
 * that the clock is running).
 */

/** Seconds since midnight, over a full day. */
export function dayProgress(date: Date): number {
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  return seconds / 86_400;
}

/** Seconds since the top of the minute, over a full minute. */
export function minuteProgress(date: Date): number {
  return date.getSeconds() / 60;
}
