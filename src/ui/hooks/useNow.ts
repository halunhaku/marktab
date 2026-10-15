import { useEffect, useState } from 'preact/hooks';

/**
 * Ticking clock.
 *
 * Aligned to the next multiple of `intervalMs` instead of a fixed interval from
 * mount, so the value changes within a second of the real boundary rather than
 * drifting by up to one interval. Two cadences use it: the home date and greeting
 * tick with the minute (`30_000`), and the clock dial ticks with the second
 * (`1_000`), because its arc is drawn against the current time.
 *
 * `enabled: false` stops the timer entirely — the home surface honours the
 * `showClock` setting, and a hidden clock must not wake the CPU.
 */
export function useNow(enabled = true, intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: number | undefined;

    const schedule = (): void => {
      const current = new Date();
      setNow(current);
      const untilNextTick = intervalMs - (current.getTime() % intervalMs);
      timer = window.setTimeout(schedule, untilNextTick);
    };

    schedule();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled, intervalMs]);

  return now;
}
