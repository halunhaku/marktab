import { vi, type Mock } from 'vitest';

/**
 * Minimal in-memory stand-ins for the browser surfaces the core layer touches.
 *
 * Real `chrome.storage` round-trips through JSON, so the fakes deep-clone on
 * write and read: a test that accidentally shares a mutable reference with the
 * store fails here the same way it would in the browser.
 */

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface FakeStorageArea {
  data: Record<string, unknown>;
  get: (keys: string | string[] | null | undefined) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
}

export type StorageChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void;

export interface FakeStorage {
  sync: FakeStorageArea;
  local: FakeStorageArea;
  onChanged: {
    listeners: Set<StorageChangeListener>;
    addListener: Mock;
    removeListener: Mock;
  };
  /** Deliver a change event the way `chrome.storage.onChanged` would. */
  emit: (area: 'sync' | 'local', key: string, newValue: unknown, oldValue?: unknown) => void;
}

export interface FakeBookmarkEvent {
  listeners: Set<() => void>;
  addListener: Mock;
  removeListener: Mock;
}

export const BOOKMARK_EVENT_NAMES = [
  'onCreated',
  'onRemoved',
  'onChanged',
  'onMoved',
  'onChildrenReordered',
  'onImportBegan',
  'onImportEnded',
] as const;

export type BookmarkEventName = (typeof BOOKMARK_EVENT_NAMES)[number];

export type FakeBookmarks = Record<BookmarkEventName, FakeBookmarkEvent> & {
  getTree: Mock;
  listeners: Map<BookmarkEventName, Set<() => void>>;
  setTree: (next: unknown) => void;
};

export interface FakeChrome {
  runtime: { getURL: (path: string) => string };
  storage: FakeStorage;
  bookmarks: FakeBookmarks;
  /** Install the fake as `globalThis.chrome`. */
  install: () => void;
  /** Deliver a `chrome.bookmarks` event to every registered listener. */
  fireBookmarkEvent: (name: BookmarkEventName) => void;
}

export function createFakeStorageArea(initial: Record<string, unknown> = {}): FakeStorageArea {
  const data: Record<string, unknown> = clone(initial);
  return {
    data,
    async get(keys) {
      const requested = keys == null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
      const out: Record<string, unknown> = {};
      for (const key of requested) {
        if (key in data) out[key] = clone(data[key]);
      }
      return out;
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) data[key] = clone(value);
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
    async clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
  };
}

/** `chrome` with in-memory storage + a scriptable bookmarks API. */
export function createFakeChrome(
  options: { sync?: Record<string, unknown>; local?: Record<string, unknown>; tree?: unknown } = {},
): FakeChrome {
  const storageListeners = new Set<StorageChangeListener>();
  const bookmarkListeners = new Map<BookmarkEventName, Set<() => void>>();
  const state = { tree: options.tree as unknown };

  const bookmarksEvents = {} as Record<BookmarkEventName, FakeBookmarkEvent>;
  for (const name of BOOKMARK_EVENT_NAMES) {
    const listeners = new Set<() => void>();
    bookmarkListeners.set(name, listeners);
    bookmarksEvents[name] = {
      listeners,
      addListener: vi.fn((listener: () => void) => {
        listeners.add(listener);
      }),
      removeListener: vi.fn((listener: () => void) => {
        listeners.delete(listener);
      }),
    };
  }

  const storage: FakeStorage = {
    sync: createFakeStorageArea(options.sync),
    local: createFakeStorageArea(options.local),
    onChanged: {
      listeners: storageListeners,
      addListener: vi.fn((listener: StorageChangeListener) => {
        storageListeners.add(listener);
      }),
      removeListener: vi.fn((listener: StorageChangeListener) => {
        storageListeners.delete(listener);
      }),
    },
    emit(area, key, newValue, oldValue) {
      for (const listener of [...storageListeners]) {
        listener({ [key]: { newValue: clone(newValue), oldValue: clone(oldValue) } }, area);
      }
    },
  };

  const chrome: FakeChrome = {
    runtime: { getURL: (path: string) => `chrome-extension://fake/${path}` },
    storage,
    bookmarks: {
      ...bookmarksEvents,
      getTree: vi.fn(async () => clone(state.tree)),
      listeners: bookmarkListeners,
      setTree(next: unknown) {
        state.tree = next;
      },
    },
    install() {
      (globalThis as { chrome?: unknown }).chrome = chrome as unknown;
    },
    fireBookmarkEvent(name) {
      const listeners = bookmarkListeners.get(name);
      if (!listeners) throw new Error(`unknown bookmark event: ${name}`);
      for (const listener of [...listeners]) listener();
    },
  };

  return chrome;
}

/** Storage-compatible object usable with `vi.stubGlobal('localStorage', …)`. */
export function createFakeLocalStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  const storage = {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  };
  return storage as unknown as Storage;
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets queued microtasks (`await` chains) settle before the next assertion. */
export async function flushMicrotasks(times = 3): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}
