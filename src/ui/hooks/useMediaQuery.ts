import { useSignal, type Signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

/**
 * Reactive `matchMedia`.
 *
 * Layout that differs by viewport (the rail collapsing to a drawer) is driven
 * from JavaScript as well as CSS, so both sides must agree on the same
 * breakpoint. Reading it through one hook keeps that breakpoint in a single
 * place, and the returned signal is reactive so components re-render when the
 * window crosses it.
 */
export function useMediaQuery(query: string): Signal<boolean> {
  const matches = useSignal(readMatches(query));

  useEffect(() => {
    const list = matchMediaList(query);
    if (!list) return;
    const update = (): void => {
      matches.value = list.matches;
    };
    // Re-read on mount: the query may already have changed between render and effect.
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query, matches]);

  return matches;
}

function matchMediaList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

function readMatches(query: string): boolean {
  return matchMediaList(query)?.matches ?? false;
}
