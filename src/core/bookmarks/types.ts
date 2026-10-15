/** Raw shape of `chrome.bookmarks.BookmarkTreeNode` that the index relies on. */
export interface RawBookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: RawBookmarkNode[];
}

export interface BookmarkEntry {
  id: string;
  parentId: string;
  folderTitle: string;
  /** Human readable folder chain, e.g. `Bookmarks bar / Dev`. */
  path: string;
  title: string;
  url: string;
  host: string;
  index: number;
  dateAdded: number;
  /* Pre-computed lowercase fields for the matcher. */
  sTitle: string;
  sUrl: string;
  sHost: string;
  sPath: string;
}

export interface FolderEntry {
  id: string;
  parentId: string | null;
  title: string;
  path: string;
  depth: number;
  index: number;
  dateAdded: number;
  /** Bookmarks directly inside. */
  count: number;
  /** Bookmarks inside including descendants. */
  total: number;
  sTitle: string;
  sPath: string;
}

export interface BookmarkIndexData {
  bookmarks: BookmarkEntry[];
  folders: FolderEntry[];
  /** Top-level folders (children of the browser's synthetic root). */
  rootIds: string[];
  byId: Map<string, BookmarkEntry>;
  byFolder: Map<string, BookmarkEntry[]>;
  childFolders: Map<string, FolderEntry[]>;
  folderById: Map<string, FolderEntry>;
  counts: { bookmarks: number; folders: number };
  builtAt: number;
}

export type IndexStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export type FolderSortMode = 'manual' | 'title' | 'recent';

export const ROOT_PARENT_ID = '0';
