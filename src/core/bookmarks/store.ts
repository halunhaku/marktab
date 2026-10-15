import { signal } from '@preact/signals';
import { getBookmarksApi } from '../platform/chrome';
import { EMPTY_INDEX, buildIndex, isIndexEmpty } from './index';
import type { BookmarkIndexData, IndexStatus, RawBookmarkNode } from './types';
import { debounce } from '../util/timing';

export const bookmarkIndex = signal<BookmarkIndexData>(EMPTY_INDEX);
export const indexStatus = signal<IndexStatus>('idle');
export const indexError = signal<string | null>(null);
/** Bumped on every successful rebuild; cheap dependency for memoised views. */
export const indexRevision = signal(0);

let inFlight: Promise<void> | null = null;
let queued = false;

function commit(tree: readonly RawBookmarkNode[]): void {
  const index = buildIndex(tree);
  bookmarkIndex.value = index;
  indexRevision.value += 1;
  indexStatus.value = isIndexEmpty(index) ? 'empty' : 'ready';
  indexError.value = null;
}

/** Reads the browser bookmark tree and rebuilds the search index. */
export async function reloadBookmarks(): Promise<void> {
  if (inFlight) {
    queued = true;
    return inFlight;
  }
  const api = getBookmarksApi();
  if (!api?.getTree) {
    indexStatus.value = 'error';
    indexError.value = 'bookmarks-unavailable';
    return;
  }
  indexStatus.value = bookmarkIndex.value.builtAt === 0 ? 'loading' : indexStatus.value;
  inFlight = (async () => {
    try {
      const tree = (await api.getTree()) as RawBookmarkNode[];
      commit(tree);
    } catch (error) {
      indexStatus.value = 'error';
      indexError.value = String(error);
    } finally {
      inFlight = null;
      if (queued) {
        queued = false;
        void reloadBookmarks();
      }
    }
  })();
  return inFlight;
}

const scheduleReload = debounce(() => {
  void reloadBookmarks();
}, 220);

const BOOKMARK_EVENTS = [
  'onCreated',
  'onRemoved',
  'onChanged',
  'onMoved',
  'onChildrenReordered',
  'onImportBegan',
] as const;

/**
 * Subscribes to browser bookmark mutations and rebuilds the index in the
 * background. Returns an unsubscribe function.
 */
export function startBookmarkSync(): () => void {
  const api = getBookmarksApi();
  if (!api) return () => {};
  const handler = (): void => scheduleReload();
  for (const event of BOOKMARK_EVENTS) {
    api[event].addListener(handler);
  }
  const importEnded = api.onImportEnded;
  if (importEnded) importEnded.addListener(handler);
  return () => {
    scheduleReload.cancel();
    for (const event of BOOKMARK_EVENTS) {
      api[event].removeListener(handler);
    }
    if (importEnded) importEnded.removeListener(handler);
  };
}

/** Forces a rebuild, bypassing the debounce (used after our own mutations). */
export function refreshBookmarksNow(): Promise<void> {
  scheduleReload.cancel();
  return reloadBookmarks();
}
