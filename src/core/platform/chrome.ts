/**
 * Thin, typed access to the `chrome.*` APIs.
 *
 * Every accessor returns `undefined` when the API is unavailable (unit tests,
 * plain web preview). Callers degrade gracefully instead of throwing, which is
 * what keeps the core modules testable without a browser.
 */
export type ChromeApi = typeof chrome;

export function getChrome(): ChromeApi | undefined {
  const candidate = (globalThis as { chrome?: unknown }).chrome;
  if (!candidate || typeof candidate !== 'object') return undefined;
  const api = candidate as Partial<ChromeApi>;
  if (!api.runtime || !api.storage) return undefined;
  return api as ChromeApi;
}

export function getBookmarksApi(): typeof chrome.bookmarks | undefined {
  return getChrome()?.bookmarks;
}

export function getStorageApi(): typeof chrome.storage | undefined {
  return getChrome()?.storage;
}

export function getI18nApi(): typeof chrome.i18n | undefined {
  return getChrome()?.i18n;
}

export function getTabsApi(): typeof chrome.tabs | undefined {
  return getChrome()?.tabs;
}

/** Absolute `chrome-extension://…` URL for a packaged asset, when available. */
export function runtimeUrl(path: string): string | undefined {
  const api = getChrome();
  if (!api?.runtime?.getURL) return undefined;
  try {
    return api.runtime.getURL(path);
  } catch {
    return undefined;
  }
}

/** Truthy when running inside an installed extension page. */
export function isExtensionContext(): boolean {
  return runtimeUrl('manifest.json') !== undefined;
}
