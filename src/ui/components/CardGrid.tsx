import type { ComponentChildren, JSX } from 'preact';
import { cx } from './cx';
import styles from './CardGrid.module.css';

export interface CardGridProps {
  children: ComponentChildren;
  /** Grid floor; defaults to the density-aware `--grid-min`. */
  min?: string;
  class?: string;
}

/**
 * Responsive grid for bookmark cards.
 *
 * Shared by the home rows and the library views so that card width, gap and
 * density behave identically everywhere — the alternative (each view rolling its
 * own columns) is how grids drift apart.
 */
export function CardGrid({ children, min, class: className }: CardGridProps): JSX.Element {
  return (
    <div
      class={cx(styles.grid, className)}
      style={min ? { gridTemplateColumns: `repeat(auto-fill, minmax(${min}, 1fr))` } : undefined}
    >
      {children}
    </div>
  );
}
