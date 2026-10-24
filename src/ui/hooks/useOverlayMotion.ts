import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { exitTiming, fadeIn, fadeOutCopy, type FadeTiming } from '../motion';

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
  const snapshot = useRef<{ node: HTMLElement; rect: DOMRect; time: FadeTiming | null } | null>(null);

  // Re-measure after every render: a menu moves once it knows its own height, and
  // the exit must be painted where the overlay actually was. The duration is read
  // here too — a detached node has no computed style to read it from later.
  useLayoutEffect(() => {
    const node = exitRef.current;
    if (!node) return;
    snapshot.current = { node, rect: node.getBoundingClientRect(), time: exitTiming(node) };
  });

  useLayoutEffect(() => {
    fadeIn(enterRef.current);
  }, []);

  useEffect(
    () => () => {
      const last = snapshot.current;
      if (last) fadeOutCopy(last.node, last.rect, last.time);
    },
    [],
  );
}
