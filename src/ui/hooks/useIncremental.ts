import { useEffect, useState } from 'preact/hooks';

export interface Incremental {
  /** How many items the caller should render. */
  limit: number;
  hasMore: boolean;
  remaining: number;
  showMore: () => void;
}

/**
 * Bounds the number of rendered rows.
 *
 * A bookmarks folder can hold thousands of entries; mounting them all on open
 * would block the main thread for hundreds of milliseconds and produce a
 * document far taller than anyone scrolls. Rendering a window and extending it on
 * demand keeps the first paint flat regardless of library size.
 */
export function useIncremental(total: number, step = 60, initial = 60): Incremental {
  const [limit, setLimit] = useState(initial);

  useEffect(() => {
    setLimit(initial);
  }, [total, initial]);

  const visible = Math.min(limit, total);
  return {
    limit: visible,
    hasMore: visible < total,
    remaining: Math.max(0, total - visible),
    showMore: () => setLimit((current) => current + step),
  };
}
