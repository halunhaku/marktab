/**
 * Overlay motion, in one place.
 *
 * The paper language animates opacity and nothing else, and only for overlays and
 * transient notices: hover, press, focus, typing, filtering, theme changes and
 * the clock are instant (ADR-024). Every duration is read from the design tokens,
 * so `[data-motion='reduced']` and `prefers-reduced-motion: reduce` collapse the
 * animation to nothing without a second code path.
 *
 * Three rules are enforced here instead of in each component:
 *  - the last input modality is mirrored onto `<html data-input>`, which also
 *    zeroes the CSS durations, so a keyboard-triggered pin, action cluster or
 *    panel paints on its first frame;
 *  - switching to reduced motion cancels fades that are already running;
 *  - a closing overlay never waits for its animation: the caller has already
 *    removed the real element, and the exit is a non-interactive copy.
 */

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Last input modality. A keyboard-triggered interaction paints with no motion. */
let keyboardDriven = false;

/** Fades in flight, so a change of motion preference can settle them at once. */
const running = new Set<Animation>();

/** Enter opacity for a panel, menu, dialog or toast: `.85 → 1`. */
const ENTER_FROM = 0.85;

/** A resolved fade: milliseconds plus the easing curve, both from the tokens. */
export interface FadeTiming {
  duration: number;
  easing: string;
}

/**
 * A scroll position inside a subtree, by index in `[root, ...root.querySelectorAll('*')]`.
 *
 * Recorded while the overlay is still mounted: `scrollTop` on a detached node is 0,
 * which is what made a scrolled palette's exit copy jump back to the top.
 */
export interface ScrollOffset {
  index: number;
  top: number;
  left: number;
}

/** Every non-zero scroll position in a mounted subtree. */
export function scrollOffsets(element: Element | null): ScrollOffset[] {
  if (!element) return [];
  const nodes = [element, ...element.querySelectorAll('*')];
  const offsets: ScrollOffset[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node && (node.scrollTop !== 0 || node.scrollLeft !== 0)) {
      offsets.push({ index, top: node.scrollTop, left: node.scrollLeft });
    }
  }
  return offsets;
}

/** True when motion is reduced, following the same resolution order as the tokens. */
function reducedNow(): boolean {
  const mode = document.documentElement.dataset['motion'];
  if (mode === 'reduced') return true;
  if (mode === 'full') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_QUERY).matches;
}

function cancelRunning(): void {
  for (const animation of running) animation.cancel();
  running.clear();
}

function track(animation: Animation): void {
  running.add(animation);
  const settle = (): void => {
    running.delete(animation);
  };
  animation.finished.then(settle, settle);
}

function setModality(keyboard: boolean): void {
  if (keyboardDriven === keyboard) return;
  keyboardDriven = keyboard;
  // The stylesheet reads the same fact (`[data-input='keyboard']` zeroes every
  // duration), so a CSS-only opacity transition obeys the keyboard rule too.
  document.documentElement.dataset['input'] = keyboard ? 'keyboard' : 'pointer';
  // A key press settles what is on screen instead of letting a pointer-started
  // fade run on: a keyboard interaction is 0 ms, including the one already playing.
  if (keyboard) cancelRunning();
}

if (typeof document !== 'undefined') {
  // Capturing listeners: they must see the event before any component can stop it.
  document.addEventListener('keydown', () => setModality(true), true);
  for (const type of ['pointerdown', 'mousedown', 'touchstart'] as const) {
    document.addEventListener(type, () => setModality(false), true);
  }
  // Moving a pointer is input as well, so a mouse taking over after the keyboard
  // restores the pointer durations without needing a click first.
  document.addEventListener('pointermove', () => setModality(false), true);

  // The preference can change at any time — Settings → Motion, or the OS — and a
  // fade that is already running has to stop with it.
  new MutationObserver(() => {
    if (reducedNow()) cancelRunning();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window.matchMedia(REDUCED_QUERY).addEventListener('change', () => {
      if (reducedNow()) cancelRunning();
    });
  }
}

/** Resolves this element's copy of a `--dur-*` token to milliseconds; 0 when absent. */
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
  track(
    element.animate([{ opacity: ENTER_FROM }, { opacity: 1 }], {
      duration: time.duration,
      easing: time.easing,
      fill: 'none',
    }),
  );
}

/**
 * Copies the live form values of a mounted subtree into its clone.
 *
 * `cloneNode` keeps attributes but not the current value of an input, and the
 * palette's query lives in one. Values survive detachment, so this is safe to run
 * before the copy is mounted (scroll positions do not — see `scrollOffsets`).
 */
function copyFormValues(from: Element, to: Element): void {
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
  }
}

/**
 * Resolves the exit fade for an element that is still mounted.
 *
 * Must be called before the element leaves the document: a detached element has
 * no computed style, and reading a token from one returns nothing. It reads
 * `--dur-exit`, which `[data-input='keyboard']` does not zero: a pointer close
 * still fades when the user typed a moment earlier, and the keyboard rule is
 * applied to the close itself (see `fadeOutCopy`).
 */
export function exitTiming(element: Element | null): FadeTiming | null {
  return element ? timeline(element, '--dur-exit') : null;
}

/**
 * Paints a non-interactive copy of `element` at `rect` and fades it out.
 *
 * The caller has already removed the real element, so this never delays focus
 * restoration, `inert` or pointer handling — and the copy cannot be reached by
 * the pointer, the keyboard or a screen reader.
 */
export function fadeOutCopy(
  element: Element | null,
  rect: DOMRect | null,
  time: FadeTiming | null,
  offsets: readonly ScrollOffset[] = [],
): void {
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
  copyFormValues(element, copy);
  document.body.append(copy);
  // The detached copy had no scrollable layout, so the recorded offsets are
  // applied now that it does — before its first paint.
  const copyNodes = [copy, ...copy.querySelectorAll('*')];
  for (const offset of offsets) {
    const target = copyNodes[offset.index];
    if (!target) continue;
    target.scrollTop = offset.top;
    target.scrollLeft = offset.left;
  }

  const animation = copy.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: time.duration,
    easing: time.easing,
    fill: 'forwards',
  });
  // A cancelled fade rejects `finished`, and the copy goes with it.
  const remove = (): void => copy.remove();
  animation.finished.then(remove, remove);
  track(animation);
}
