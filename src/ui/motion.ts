/**
 * Overlay motion, in one place.
 *
 * The paper language animates opacity and nothing else, and only for overlays and
 * transient notices: hover, press, focus, typing, filtering, theme changes and
 * the clock are instant (ADR-024). Every duration is read from the design tokens,
 * so `[data-motion='reduced']` and `prefers-reduced-motion: reduce` collapse the
 * animation to nothing without a second code path.
 *
 * Nothing here gates state: callers open or close on the same frame they call
 * these helpers. A closing overlay is not animated in place — the caller has
 * already removed it — so `fadeOut` paints a non-interactive copy at the
 * element's last rect for the exit duration and drops it.
 */

/** Last input modality. A keyboard-triggered overlay paints with no animation. */
let keyboardDriven = false;

if (typeof document !== 'undefined') {
  // Capturing listeners: they must see the event before any component can stop it.
  document.addEventListener(
    'keydown',
    () => {
      keyboardDriven = true;
    },
    true,
  );
  for (const type of ['pointerdown', 'mousedown', 'touchstart'] as const) {
    document.addEventListener(
      type,
      () => {
        keyboardDriven = false;
      },
      true,
    );
  }
}

/** Enter opacity for a panel, menu, dialog or toast: `.85 → 1`. */
const ENTER_FROM = 0.85;

/** A resolved fade: milliseconds plus the easing curve, both from the tokens. */
export interface FadeTiming {
  duration: number;
  easing: string;
}

/** Resolves a `--dur-*` token to milliseconds; 0 when it is unavailable. */
function durationMs(element: Element, name: string): number {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  if (raw.endsWith('ms')) return value;
  if (raw.endsWith('s')) return value * 1000;
  return value;
}

function timeline(element: Element, durationToken: string): FadeTiming | null {
  const duration = durationMs(element, durationToken);
  if (duration <= 0) return null;
  return { duration, easing: getComputedStyle(element).getPropertyValue('--ease-out').trim() || 'ease-out' };
}

/**
 * Fades an overlay in from 85% opacity.
 *
 * Skipped entirely for a keyboard-triggered open, and for reduced motion — both
 * make the overlay appear on its first frame instead of after a fade.
 */
export function fadeIn(element: Element | null): void {
  if (!element || keyboardDriven) return;
  const time = timeline(element, '--dur-base');
  if (!time) return;
  element.animate([{ opacity: ENTER_FROM }, { opacity: 1 }], {
    duration: time.duration,
    easing: time.easing,
    fill: 'none',
  });
}

function copyScrollPositions(from: Element, to: Element): void {
  const sources = [from, ...from.querySelectorAll('*')];
  const targets = [to, ...to.querySelectorAll('*')];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const target = targets[index];
    if (!source || !target) continue;
    if (source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
      target.value = source.value;
    } else if (source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
      target.value = source.value;
    }
    if (source.scrollTop !== 0 || source.scrollLeft !== 0) {
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
    }
  }
}

/**
 * Resolves the exit fade for an element that is still mounted.
 *
 * Must be called before the element leaves the document: a detached element has
 * no computed style, and reading `--dur-fast` from one returns nothing.
 */
export function exitTiming(element: Element | null): FadeTiming | null {
  return element ? timeline(element, '--dur-fast') : null;
}

/**
 * Paints a non-interactive copy of `element` at `rect` and fades it out.
 *
 * The caller has already removed the real element, so this never delays focus
 * restoration, `inert` or pointer handling — and the copy cannot be reached by
 * the pointer, the keyboard or a screen reader.
 */
export function fadeOutCopy(element: Element | null, rect: DOMRect | null, time: FadeTiming | null): void {
  if (!element || !rect || !time || keyboardDriven) return;

  const copy = element.cloneNode(true) as HTMLElement;
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('inert', '');
  Object.assign(copy.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    pointerEvents: 'none',
    // The real element may already be hidden or off-canvas; the copy has to be
    // visible for its fade to be seen.
    visibility: 'visible',
    zIndex: 'var(--z-toast)',
  });
  copyScrollPositions(element, copy);
  document.body.append(copy);

  const animation = copy.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: time.duration,
    easing: time.easing,
    fill: 'forwards',
  });
  const remove = (): void => copy.remove();
  animation.finished.then(remove, remove);
}
