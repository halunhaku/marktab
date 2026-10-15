import { hostOf } from '../util/url';
import {
  ROOT_PARENT_ID,
  type BookmarkEntry,
  type BookmarkIndexData,
  type FolderEntry,
  type FolderSortMode,
  type RawBookmarkNode,
} from './types';

export const EMPTY_INDEX: BookmarkIndexData = {
  bookmarks: [],
  folders: [],
  rootIds: [],
  byId: new Map(),
  byFolder: new Map(),
  childFolders: new Map(),
  folderById: new Map(),
  counts: { bookmarks: 0, folders: 0 },
  builtAt: 0,
};

interface Frame {
  node: RawBookmarkNode;
  parentId: string;
  parentTitle: string;
  parentPath: string;
  depth: number;
  index: number;
  dateAdded: number;
}

function joinPath(parentPath: string, title: string): string {
  if (!parentPath) return title;
  if (!title) return parentPath;
  return `${parentPath} / ${title}`;
}

/**
 * Turns `chrome.bookmarks.getTree()` output into a flat, search-ready index.
 *
 * Single pass over the tree, no recursion (deep trees stay safe), and every
 * string that the matcher needs is lower-cased exactly once.
 */
export function buildIndex(
  tree: readonly RawBookmarkNode[],
  now: number = Date.now(),
): BookmarkIndexData {
  const bookmarks: BookmarkEntry[] = [];
  const folders: FolderEntry[] = [];
  const byId = new Map<string, BookmarkEntry>();
  const byFolder = new Map<string, BookmarkEntry[]>();
  const childFolders = new Map<string, FolderEntry[]>();
  const folderById = new Map<string, FolderEntry>();
  const rootIds: string[] = [];

  const roots: RawBookmarkNode[] =
    tree.length === 1 && tree[0]?.id === ROOT_PARENT_ID
      ? (tree[0]?.children ?? [])
      : tree.filter((node) => !node.url);

  const stack: Frame[] = [];
  for (let index = roots.length - 1; index >= 0; index -= 1) {
    const node = roots[index] as RawBookmarkNode;
    stack.push({
      node,
      parentId: ROOT_PARENT_ID,
      parentTitle: '',
      parentPath: '',
      depth: 0,
      index,
      dateAdded: node.dateAdded ?? 0,
    });
  }

  while (stack.length > 0) {
    const frame = stack.pop() as Frame;
    const { node } = frame;
    const title = node.title ?? '';
    const isFolder = !node.url;

    if (isFolder) {
      if (frame.parentId === ROOT_PARENT_ID) rootIds.push(node.id);
      const folder: FolderEntry = {
        id: node.id,
        parentId: frame.parentId === ROOT_PARENT_ID ? null : frame.parentId,
        title,
        path: frame.parentPath,
        depth: frame.depth,
        index: frame.index,
        dateAdded: node.dateAdded ?? 0,
        count: 0,
        total: 0,
        sTitle: title.toLowerCase(),
        sPath: frame.parentPath.toLowerCase(),
      };
      folders.push(folder);
      folderById.set(folder.id, folder);
      const siblings = frame.parentId ? childFolders.get(frame.parentId) : undefined;
      if (siblings) siblings.push(folder);
      else if (frame.parentId) childFolders.set(frame.parentId, [folder]);

      const children = node.children ?? [];
      const childPath = joinPath(frame.parentPath, title);
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index] as RawBookmarkNode;
        stack.push({
          node: child,
          parentId: node.id,
          parentTitle: title,
          parentPath: childPath,
          depth: frame.depth + 1,
          index,
          dateAdded: child.dateAdded ?? 0,
        });
      }
      continue;
    }

    const url = node.url ?? '';
    if (!url) continue;
    const entry: BookmarkEntry = {
      id: node.id,
      parentId: frame.parentId,
      folderTitle: frame.parentTitle,
      path: frame.parentPath,
      title: title || url,
      url,
      host: hostOf(url),
      index: frame.index,
      dateAdded: frame.dateAdded,
      sTitle: (title || url).toLowerCase(),
      sUrl: url.toLowerCase(),
      sHost: hostOf(url),
      sPath: frame.parentPath.toLowerCase(),
    };
    bookmarks.push(entry);
    byId.set(entry.id, entry);
    const siblings = byFolder.get(entry.parentId);
    if (siblings) siblings.push(entry);
    else byFolder.set(entry.parentId, [entry]);
    const folder = folderById.get(entry.parentId);
    if (folder) folder.count += 1;
  }

  for (const list of byFolder.values()) list.sort((a, b) => a.index - b.index);
  for (const list of childFolders.values()) list.sort((a, b) => a.index - b.index);
  folders.sort((a, b) => a.depth - b.depth || a.index - b.index || a.title.localeCompare(b.title));

  // Bottom-up totals: deepest folders first so children are already summed.
  // `+=` (not `=`) is what preserves the contributions a folder has already
  // collected from its descendants by the time its own frame is visited.
  for (let index = folders.length - 1; index >= 0; index -= 1) {
    const folder = folders[index] as FolderEntry;
    folder.total += folder.count;
    const parent = folder.parentId ? folderById.get(folder.parentId) : undefined;
    if (parent) parent.total += folder.total;
  }

  folders.sort((a, b) => a.path.localeCompare(b.path) || a.index - b.index);

  return {
    bookmarks,
    folders,
    rootIds,
    byId,
    byFolder,
    childFolders,
    folderById,
    counts: { bookmarks: bookmarks.length, folders: folders.length },
    builtAt: now,
  };
}

export function isIndexEmpty(index: BookmarkIndexData): boolean {
  return index.counts.bookmarks === 0 && index.counts.folders === 0;
}

/** Bookmarks of a folder, ordered by the requested sort mode. */
export function bookmarksInFolder(
  index: BookmarkIndexData,
  folderId: string | null,
  sort: FolderSortMode,
): BookmarkEntry[] {
  const list = folderId === null ? allBookmarks(index) : (index.byFolder.get(folderId) ?? []);
  if (sort === 'manual') return list;
  const copy = [...list];
  if (sort === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } else {
    copy.sort((a, b) => b.dateAdded - a.dateAdded);
  }
  return copy;
}

/** Every bookmark, browser order (depth-first). */
export function allBookmarks(index: BookmarkIndexData): BookmarkEntry[] {
  return index.bookmarks;
}

export function childFoldersOf(index: BookmarkIndexData, folderId: string | null): FolderEntry[] {
  if (folderId === null) {
    return index.rootIds
      .map((id) => index.folderById.get(id))
      .filter((folder): folder is FolderEntry => Boolean(folder));
  }
  return index.childFolders.get(folderId) ?? [];
}

/** Folder chain from a root folder down to `folderId` (inclusive). */
export function folderBreadcrumb(index: BookmarkIndexData, folderId: string): FolderEntry[] {
  const chain: FolderEntry[] = [];
  let current = index.folderById.get(folderId);
  let guard = 0;
  while (current && guard < 64) {
    chain.unshift(current);
    current = current.parentId ? index.folderById.get(current.parentId) : undefined;
    guard += 1;
  }
  return chain;
}

/** Root folder that contains `folderId`, used for rail highlighting. */
export function rootFolderOf(index: BookmarkIndexData, folderId: string): FolderEntry | undefined {
  let current = index.folderById.get(folderId);
  let guard = 0;
  while (current?.parentId && guard < 64) {
    current = index.folderById.get(current.parentId);
    guard += 1;
  }
  return current;
}

/** All descendants of a folder (folders only), depth-first. */
export function descendantFolders(index: BookmarkIndexData, folderId: string): FolderEntry[] {
  const out: FolderEntry[] = [];
  const stack = [...(index.childFolders.get(folderId) ?? [])];
  while (stack.length > 0) {
    const folder = stack.pop() as FolderEntry;
    out.push(folder);
    const children = index.childFolders.get(folder.id);
    if (children) stack.push(...children);
  }
  return out;
}

/** Folders matching a set of hidden ids plus all of their descendants. */
export function expandHiddenFolders(
  index: BookmarkIndexData,
  hiddenIds: readonly string[],
): Set<string> {
  const hidden = new Set<string>();
  for (const id of hiddenIds) {
    if (hidden.has(id)) continue;
    hidden.add(id);
    for (const child of descendantFolders(index, id)) hidden.add(child.id);
  }
  return hidden;
}
