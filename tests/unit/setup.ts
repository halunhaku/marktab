import { afterEach, vi } from 'vitest';

/**
 * Global test hygiene.
 *
 * Every core module degrades gracefully when `chrome.*` is missing, so the
 * default state for a test is "no extension APIs" and a suite that needs them
 * installs its own fake (see `helpers/fakes.ts`). Timers are always restored so
 * a suite that forgets to call `useRealTimers` cannot poison its neighbours.
 */
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis as { chrome?: unknown }).chrome;
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
