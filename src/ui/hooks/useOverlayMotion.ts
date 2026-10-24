import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { exitTiming, fadeIn, fadeOutCopy, scrollOffsets, type FadeTiming, type ScrollOffset } from '../motion';

/**
 * Gives an overlay its paper-language motion: a 120 ms fade in from 85% opacity
 * on mount, and an 80 ms fade of a non-interactive copy on unmount.
 *
 * `enterRef` is what becomes visible (a panel); `exitRef` is what is copied for
 * the exit (a scrim wrapping the panel), defaulting to `enterRef`. The caller's
 * state has already changed by the time the exit runs, so focus, `inert` and
 * pointer handling are never waiting on an animation.
 *
 * Keyboard-triggered opens and reduced motion are handled inside `fadeIn` /
 * `fadeOutCopy`: both read the duration tokens, so a reduced-motion user gets an
 * overlay on its first frame.
 */
export function useOverlayMotion(
  enterRef: { current: HTMLElement | null },
  exitRef: { current: HTMLElement | null } = enterRef,
): void {
  const snapshot = useRef<{
    node: HTMLElement;
    rect: DOMRect;
    time: FadeTiming | null;
    offsets: ScrollOffset[];
  } | null>(null);

  // Re-measure after every render: a menu moves once it knows its own height, and
  // the exit must be painted where the overlay actually was. The duration and the
  // scroll positions are read here too — a detached node has neither a computed
  // style nor a scroll offset to read later.
  useLayoutEffect(() => {
    const node = exitRef.current;
    if (!node) return;
    snapshot.current = {
      node,
      rect: node.getBoundingClientRect(),
      time: exitTiming(node),
      offsets: scrollOffsets(node),
    };
  });

  // Scrolling an overlay does not re-render it, so the positions are refreshed
  // while it is still in the document (capture: `scroll` does not bubble).
  useLayoutEffect(() => {
    const node = exitRef.current;
    if (!node) return undefined;
    const record = (): void => {
      if (snapshot.current) snapshot.current.offsets = scrollOffsets(node);
    };
    node.addEventListener('scroll', record, true);
    return () => node.removeEventListener('scroll', record, true);
  }, []);

  useLayoutEffect(() => {
    fadeIn(enterRef.current);
  }, []);

  useEffect(
    () => () => {
      const last = snapshot.current;
      if (last) fadeOutCopy(last.node, last.rect, last.time, last.offsets);
    },
    [],
  );
}
