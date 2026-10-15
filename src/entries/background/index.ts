/**
 * MV3 module service worker.
 *
 * It exists for the two jobs the UI cannot guarantee:
 *  1. run `bootstrapState()` once per worker start, so an existing v1/v2
 *     installation is migrated even if the user never opens the new tab page
 *     after updating;
 *  2. open the new tab page once after a fresh install — the only discoverable
 *     entry point for someone who never clicks the toolbar action.
 *
 * There is no DOM here, and deliberately nothing else: no timers, no polling,
 * no bookmark listeners (the new tab page owns those; the popup refreshes only
 * after its own writes, because it lives for seconds). The worker starts, does
 * its work and is evicted.
 */
import { bootstrapState } from '@/core/state/bootstrap';
import { getChrome } from '@/core/platform/chrome';

const NEW_TAB_PAGE = 'newtab.html';

/** Best-effort: a worker must never surface an error to the browser. */
function warmState(): void {
  void bootstrapState().catch(() => {
    /* storage unavailable: the next page open retries and migrates */
  });
}

/** Opens the new tab page once, after a fresh install. */
function openNewTabPage(): void {
  const api = getChrome();
  const url = api?.runtime?.getURL?.(NEW_TAB_PAGE);
  if (!api?.tabs?.create || !url) return;
  try {
    void api.tabs.create({ url, active: true }).catch(() => {
      /* nothing to recover: discovery is a courtesy, not a requirement */
    });
  } catch {
    /* tab creation is unavailable (unit tests, reduced API surface) */
  }
}

try {
  warmState();
  const api = getChrome();
  if (api?.runtime?.onInstalled) {
    api.runtime.onInstalled.addListener((details) => {
      // Updates (extension or browser) change nothing for the user, and an
      // install is the only moment a new tab page is worth showing uninvited.
      if (details.reason !== 'install') return;
      openNewTabPage();
    });
  }
} catch {
  /* a worker that throws on start would never migrate the stored state */
}
