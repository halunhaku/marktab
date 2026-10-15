import { computed } from '@preact/signals';
import { bookmarkIndex, indexRevision, pins, recent, settings, userData } from './signals';
import { descendantFolders, expandHiddenFolders, folderBreadcrumb, rootFolderOf } from '../bookmarks';
import type { BookmarkEntry, FolderEntry } from '../bookmarks/types';
import { hostOf } from '../util/url';

/** Uniform shape rendered by every bookmark card, row and palette entry. */
export interface LinkItem {
  url: string;
  title: string;
  host: string;
  /** Folder chain without the bookmark title, e.g. `Bookmarks bar / Dev`. */
  path: string;
  folderId: string | null;
  bookmarkId: string | null;
  pinned: boolean;
  lastOpened: number | null;
  dateAdded: number;
}

export interface FolderRow {
  folder: FolderEntry;
  depth: number;
}

export interface FolderOption {
  id: string;
  label: string;
  depth: number;
  path: string;
}

export interface LinkContext {
  pinSet: Map<string, true>;
  recentMap: Map<string, number>;
}

export const linkContext = computed<LinkContext>(() => {
  const pinSet = new Map<string, true>();
  for (const pin of userData.value.pins) pinSet.set(pin.url, true);
  const recentMap = new Map<string, number>();
  for (const item of userData.value.recent) recentMap.set(item.url, item.ts);
  return { pinSet, recentMap };
});

export const bookmarkByUrl = computed(() => {
  indexRevision.value;
  const map = new Map<string, BookmarkEntry>();
  for (const entry of bookmarkIndex.value.bookmarks) {
    if (!map.has(entry.url)) map.set(entry.url, entry);
  }
  return map;
});

export const hiddenFolderSet = computed(() =>
  expandHiddenFolders(bookmarkIndex.value, settings.value.folders.hiddenIds),
);

export const visibleFolders = computed(() =>
  bookmarkIndex.value.folders.filter((folder) => !hiddenFolderSet.value.has(folder.id)),
);

/** Depth-labelled folder list for the navigation rail, hidden subtrees removed. */
export const folderRows = computed<FolderRow[]>(() => {
  const hidden = hiddenFolderSet.value;
  const rows: FolderRow[] = [];
  const walk = (folder: FolderEntry): void => {
    if (hidden.has(folder.id)) return;
    rows.push({ folder, depth: folder.depth });
    for (const child of bookmarkIndex.value.childFolders.get(folder.id) ?? []) walk(child);
  };
  for (const rootId of bookmarkIndex.value.rootIds) {
    const folder = bookmarkIndex.value.folderById.get(rootId);
    if (folder) walk(folder);
  }
  return rows;
});

export const folderOptions = computed<FolderOption[]>(() =>
  folderRows.value.map(({ folder, depth }) => ({
    id: folder.id,
    label: folder.title || folder.path,
    depth,
    path: folder.path,
  })),
);

export const visibleBookmarkCount = computed(() => {
  const hidden = hiddenFolderSet.value;
  let hiddenDirect = 0;
  for (const folder of bookmarkIndex.value.folders) {
    if (hidden.has(folder.id)) hiddenDirect += folder.count;
  }
  return Math.max(0, bookmarkIndex.value.counts.bookmarks - hiddenDirect);
});

export interface LibraryStats {
  bookmarks: number;
  folders: number;
  visibleBookmarks: number;
  visibleFolders: number;
  pinned: number;
  recent: number;
}

export const stats = computed<LibraryStats>(() => ({
  bookmarks: bookmarkIndex.value.counts.bookmarks,
  folders: bookmarkIndex.value.counts.folders,
  visibleBookmarks: visibleBookmarkCount.value,
  visibleFolders: visibleFolders.value.length,
  pinned: userData.value.pins.length,
  recent: userData.value.recent.length,
}));

function resolveTitle(url: string, storedTitle: string): string {
  const entry = bookmarkByUrl.value.get(url);
  return storedTitle || entry?.title || url;
}

function linkItemFor(url: string, context: LinkContext, storedTitle = ''): LinkItem {
  const entry = bookmarkByUrl.value.get(url);
  const folder = entry ? bookmarkIndex.value.folderById.get(entry.parentId) : undefined;
  return {
    url,
    title: resolveTitle(url, storedTitle),
    host: entry?.host ?? hostOf(url),
    path: folder?.path ?? entry?.path ?? '',
    folderId: entry?.parentId ?? null,
    bookmarkId: entry?.id ?? null,
    pinned: context.pinSet.has(url),
    lastOpened: context.recentMap.get(url) ?? null,
    dateAdded: entry?.dateAdded ?? 0,
  };
}

export function entryToLinkItem(entry: BookmarkEntry, context: LinkContext): LinkItem {
  const folder = bookmarkIndex.value.folderById.get(entry.parentId);
  return {
    url: entry.url,
    title: entry.title,
    host: entry.host,
    path: folder?.path ?? entry.path,
    folderId: entry.parentId,
    bookmarkId: entry.id,
    pinned: context.pinSet.has(entry.url),
    lastOpened: context.recentMap.get(entry.url) ?? null,
    dateAdded: entry.dateAdded,
  };
}

/** Pinned bookmarks in user-defined order; dead URLs survive with their own host. */
export const pinnedItems = computed<LinkItem[]>(() => {
  const context = linkContext.value;
  return userData.value.pins.map((pin) => linkItemFor(pin.url, context, pin.title));
});

export const recentItems = computed<LinkItem[]>(() => {
  const context = linkContext.value;
  return userData.value.recent.map((item) => ({
    ...linkItemFor(item.url, context, item.title),
    lastOpened: item.ts,
  }));
});

export const recentPreview = computed<LinkItem[]>(() =>
  recentItems.value.slice(0, settings.value.home.recentCount),
);

export const pinnedPreview = computed<LinkItem[]>(() =>
  pinnedItems.value.slice(0, settings.value.home.pinnedLimit),
);

export interface FolderCard {
  folder: FolderEntry;
  total: number;
}

/** Top-level folder cards shown on the home surface. */
export const rootFolderCards = computed<FolderCard[]>(() => {
  const hidden = hiddenFolderSet.value;
  const cards: FolderCard[] = [];
  for (const rootId of bookmarkIndex.value.rootIds) {
    const folder = bookmarkIndex.value.folderById.get(rootId);
    if (!folder || hidden.has(folder.id)) continue;
    cards.push({ folder, total: folder.total });
  }
  return cards;
});

export function breadcrumbFor(folderId: string | null): FolderEntry[] {
  if (!folderId) return [];
  return folderBreadcrumb(bookmarkIndex.value, folderId);
}

export function rootOf(folderId: string | null): FolderEntry | undefined {
  if (!folderId) return undefined;
  return rootFolderOf(bookmarkIndex.value, folderId);
}

/** Folder ids for `folderId` plus every descendant, used for scoped search. */
export function subtreeFolderIds(folderId: string): Set<string> {
  const ids = new Set<string>([folderId]);
  for (const folder of descendantFolders(bookmarkIndex.value, folderId)) ids.add(folder.id);
  return ids;
}

export const pinnedCount = computed(() => pins.value.length);
export const recentCount = computed(() => recent.value.length);
