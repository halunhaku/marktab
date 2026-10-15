import type { JSX } from 'preact';
import { t } from '@/locales';
import { useNow } from '@/ui/hooks/useNow';
import { dayProgress, minuteProgress } from './clockProgress';
import styles from './ClockDial.module.css';

export interface ClockDialProps {
  /** Time already formatted for the active locale, e.g. `18:19`. */
  time: string;
  /** Accessible name of the dial, e.g. `当前本地时间`. */
  label: string;
}

/**
 * The two arcs, in viewBox units. `circumference` is `2π × r`.
 *
 * The minute ring is the *outer* one because the time sits in the middle: a 12-hour
 * locale reads "06:42 PM", which is 97 units wide, so a ring drawn inside `r = 54`
 * would run through the text. Outside it, nothing competes with the label.
 */
const DAY_ARC = { r: 54, circumference: 339.29 };
const MINUTE_RING = { r: 58, circumference: 364.42 };

/** The arcs follow the clock, so they are redrawn every second — see below. */
const TICK_MS = 1000;

/**
 * Hero clock: the time, the day's progress as the thick arc, and the minute's as
 * the thin ring around it.
 *
 * Midnight sits at the top and both arcs grow clockwise. Ticking every second is a
 * scale decision as much as a motion one: the day is 0.23 px per minute around a
 * 116 px dial, so a minute-aligned day arc is indistinguishable from a frozen
 * graphic, while the minute ring steps ~4.6 px per second and makes the dial read
 * as running. The two therefore move differently on purpose — the day arc eases
 * over one tick (`--dur-tick`, linear) so a creep never becomes a step, and the
 * minute ring snaps in `--dur-fast` so each step is crisp rather than smeared.
 *
 * The arcs are `aria-hidden`: a ring says nothing to a screen reader, so the same
 * two facts are stated in words beside the time, and the group is named for what
 * it is.
 */
export function ClockDial({ time, label }: ClockDialProps): JSX.Element {
  const now = useNow(true, TICK_MS);
  const day = Math.min(1, Math.max(0, dayProgress(now)));
  const minute = Math.min(1, Math.max(0, minuteProgress(now)));
  return (
    <div class={styles.dial} role="group" aria-label={label}>
      <svg class={styles.arc} viewBox="0 0 120 120" aria-hidden="true">
        <circle class={styles.arcTrack} cx="60" cy="60" r={DAY_ARC.r} />
        <circle
          class={styles.arcValue}
          cx="60"
          cy="60"
          r={DAY_ARC.r}
          stroke-dasharray={DAY_ARC.circumference}
          stroke-dashoffset={DAY_ARC.circumference * (1 - day)}
        />
        <circle
          class={styles.arcMinute}
          cx="60"
          cy="60"
          r={MINUTE_RING.r}
          stroke-dasharray={MINUTE_RING.circumference}
          stroke-dashoffset={MINUTE_RING.circumference * (1 - minute)}
        />
      </svg>
      <span class={styles.time}>{time}</span>
      <span class="visually-hidden">{t('a11y.clockDay', { percent: Math.round(day * 100) })}</span>
      <span class="visually-hidden">{t('a11y.clockMinute', { percent: Math.round(minute * 100) })}</span>
    </div>
  );
}
