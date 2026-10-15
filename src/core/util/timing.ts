export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Runs the pending call immediately (used before page unload and in tests). */
  flush: () => void;
  cancel: () => void;
  pending: () => boolean;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;

  const run = (): void => {
    timer = undefined;
    const args = lastArgs;
    lastArgs = undefined;
    if (args) fn(...args);
  };

  const debounced = ((...args: A): void => {
    lastArgs = args;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, waitMs);
  }) as Debounced<A>;

  debounced.flush = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    run();
  };
  debounced.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };
  debounced.pending = (): boolean => timer !== undefined;
  return debounced;
}

export interface Throttled<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

export function throttle<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Throttled<A> {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;

  const throttled = ((...args: A): void => {
    lastArgs = args;
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    if (remaining <= 0) {
      lastCall = now;
      const callArgs = lastArgs;
      lastArgs = undefined;
      if (callArgs) fn(...callArgs);
      return;
    }
    if (timer === undefined) {
      timer = setTimeout(() => {
        timer = undefined;
        lastCall = Date.now();
        const callArgs = lastArgs;
        lastArgs = undefined;
        if (callArgs) fn(...callArgs);
      }, remaining);
    }
  }) as Throttled<A>;

  throttled.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };
  return throttled;
}
