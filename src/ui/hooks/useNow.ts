import { useEffect, useState } from 'preact/hooks';

/**
 * Ticking clock.
 *
 * Aligned to the next minute boundary instead of a fixed 60s interval, so the
 * displayed time changes within a second of the real minute rather than drifting
 * by up to a minute. `enabled: false` stops the timer entirely — the home surface
 * honours the `showClock` setting, and a hidden clock must not wake the CPU.
 */
export function useNow(enabled = true, intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: number | undefined;

    const schedule = (): void => {
      const current = new Date();
      setNow(current);
      const untilNextMinute = intervalMs - (current.getTime() % intervalMs);
      timer = window.setTimeout(schedule, untilNextMinute);
    };

    schedule();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled, intervalMs]);

  return now;
}
