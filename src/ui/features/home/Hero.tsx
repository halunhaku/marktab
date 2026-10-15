import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Icon } from '@/ui/components/Icon';
import { Kbd } from '@/ui/components/Kbd';
import { Skeleton } from '@/ui/components/Skeleton';
import { cx } from '@/ui/components/cx';
import styles from './Hero.module.css';

export interface HeroProps {
  greeting: string;
  tagline: string;
  date: string;
  time: string;
  /** 0…1 position of the current time inside the day; drives the halo arc. */
  dayProgress: number;
  showClock: boolean;
  clockLabel: string;
  searchLabel: string;
  searchShortcut: string;
  onSearch: () => void;
  class?: string;
}

/**
 * Home hero.
 *
 * One idea per element: who/what on the left, when on the right, and the single
 * most valuable action (search) as the only large control on the surface. The arc
 * behind the clock encodes the progress of the day, so the one large graphic
 * carries a fact instead of being decoration.
 */
export function Hero({
  greeting,
  tagline,
  date,
  time,
  dayProgress,
  showClock,
  clockLabel,
  searchLabel,
  searchShortcut,
  onSearch,
  class: className,
}: HeroProps): JSX.Element {
  const progress = Math.min(1, Math.max(0, dayProgress));
  return (
    <section class={cx(styles.hero, className)} aria-labelledby="home-greeting">
      <div class={styles.copy}>
        <h1 class={styles.greeting} id="home-greeting">
          {greeting}
        </h1>
        <p class={styles.date}>{date}</p>
        <p class={styles.tagline}>{tagline}</p>
      </div>

      {showClock ? (
        <div class={styles.clock} role="group" aria-label={clockLabel}>
          <svg class={styles.arc} viewBox="0 0 120 120" aria-hidden="true">
            <circle class={styles.arcTrack} cx="60" cy="60" r="54" />
            <circle
              class={styles.arcValue}
              cx="60"
              cy="60"
              r="54"
              stroke-dasharray="339.29"
              stroke-dashoffset={339.29 * (1 - progress)}
            />
          </svg>
          <span class={styles.time}>{time}</span>
        </div>
      ) : null}

      <button type="button" class={styles.search} onClick={onSearch}>
        <Icon name="search" size={17} />
        <span class={styles.searchLabel}>{searchLabel}</span>
        <Kbd shortcut={searchShortcut} class={styles.searchKbd} />
      </button>
    </section>
  );
}

export interface HomeSkeletonProps {
  rows: number;
}

/** Loading placeholders matching the real card geometry, so nothing jumps. */
export function HomeSkeleton({ rows }: HomeSkeletonProps): JSX.Element {
  return (
    <div class={styles.skeleton} role="status" aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <div class={styles.skeletonRow} key={row}>
          <Skeleton width="12rem" height="0.75rem" />
          <div class={styles.skeletonCards}>
            {Array.from({ length: 4 }, (_, card) => (
              <Skeleton key={card} height="5.5rem" radius="var(--radius-lg)" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface HomeEmptyProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function HomeEmpty({ title, description, actionLabel, onAction }: HomeEmptyProps): JSX.Element {
  return (
    <EmptyState
      icon="bookmarkPlus"
      title={title}
      description={description}
      action={
        <Button variant="primary" icon="externalLink" onClick={onAction}>
          {actionLabel}
        </Button>
      }
    />
  );
}
