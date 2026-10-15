import type { JSX } from 'preact';
import { cx } from './cx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** CSS width, e.g. `100%` or `12rem`. */
  width?: string;
  height?: string;
  radius?: string;
  class?: string;
}

/** Placeholder block used while the bookmark index is still loading. */
export function Skeleton({ width = '100%', height = '1rem', radius, class: className }: SkeletonProps): JSX.Element {
  return (
    <span
      class={cx(styles.bar, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
