import { getStorageApi } from './chrome';

export type StorageArea = 'sync' | 'local';

/**
 * Promise wrappers around `chrome.storage`.
 *
 * All MarkTab state goes through these helpers so that:
 *  - the MV3 callback/promise duality is hidden behind one implementation;
 *  - failures never reject into UI code paths (they resolve to a fallback and
 *    report through the optional error sink);
 *  - a missing `chrome.storage` (tests, preview) yields deterministic defaults.
 */
export interface StorageReadResult<T> {
  value: T | undefined;
  error?: string;
}

export async function readKey<T>(area: StorageArea, key: string): Promise<StorageReadResult<T>> {
  const api = getStorageApi();
  if (!api) return { value: undefined, error: 'storage-unavailable' };
  try {
    const bag = await api[area].get(key);
    return { value: bag[key] as T | undefined };
  } catch (error) {
    return { value: undefined, error: String(error) };
  }
}

/**
 * True when a storage area exists at all.
 *
 * `writeKey` returns `false` both for "the write was rejected" and for "there is
 * no `chrome.storage` here" (unit tests, previews). Only the first is something a
 * user should be warned about, so callers that report failures check this first.
 */
export function storageAvailable(): boolean {
  return getStorageApi() !== undefined;
}

export async function writeKey(area: StorageArea, key: string, value: unknown): Promise<boolean> {
  const api = getStorageApi();
  if (!api) return false;
  try {
    await api[area].set({ [key]: value });
    return true;
  } catch {
    return false;
  }
}

export async function removeKeys(area: StorageArea, keys: string[]): Promise<boolean> {
  const api = getStorageApi();
  if (!api) return false;
  try {
    await api[area].remove(keys);
    return true;
  } catch {
    return false;
  }
}

export type StorageChangeListener = (change: {
  area: StorageArea;
  key: string;
  newValue: unknown;
  oldValue: unknown;
}) => void;

/** Subscribe to changes for a specific key. Returns an unsubscribe function. */
export function subscribeToKey(key: string, listener: StorageChangeListener): () => void {
  const api = getStorageApi();
  if (!api?.onChanged) return () => {};
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    const change = changes[key];
    if (!change) return;
    if (areaName !== 'sync' && areaName !== 'local') return;
    listener({
      area: areaName,
      key,
      newValue: change.newValue,
      oldValue: change.oldValue,
    });
  };
  api.onChanged.addListener(handler);
  return () => api.onChanged.removeListener(handler);
}

/** Bytes a value occupies inside the `storage.sync` per-item quota. */
export function approximateSize(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
