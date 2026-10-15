import { describe, expect, it } from 'vitest';
import {
  EMPTY_INDEX,
  allBookmarks,
  bookmarksInFolder,
  buildIndex,
  childFoldersOf,
  descendantFolders,
  expandHiddenFolders,
  folderBreadcrumb,
  isIndexEmpty,
  rootFolderOf,
} from '@/core/bookmarks';
import type { BookmarkEntry, BookmarkIndexData, FolderEntry, RawBookmarkNode } from '@/core/bookmarks/types';

/** A realistic Chrome tree: bar + other bookmarks, nested folders, one empty. */
const TREE: RawBookmarkNode[] = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        dateAdded: 100,
        children: [
          { id: '10', title: 'GitHub', url: 'https://github.com/', dateAdded: 500 },
          { id: '12', title: 'alpha', url: 'https://alpha.example/', dateAdded: 600 },
          { id: '13', title: 'Zulu', url: 'https://zulu.example/', dateAdded: 800 },
          {
            id: '11',
            title: 'Dev',
            dateAdded: 200,
            children: [
              { id: '110', title: 'React', url: 'https://github.com/react', dateAdded: 700 },
              {
                id: '111',
                title: 'Docs',
                dateAdded: 300,
                children: [
                  {
                    id: '1110',
                    title: 'MDN',
                    url: 'https://developer.mozilla.org/en-US/',
                    dateAdded: 900,
                  },
                ],
              },
            ],
          },
          { id: '14', title: 'Empty', dateAdded: 400, children: [] },
        ],
      },
      {
        id: '2',
        title: 'Other bookmarks',
        dateAdded: 150,
        children: [
          { id: '20', title: 'News', url: 'https://news.ycombinator.com/', dateAdded: 400 },
          { id: '30', title: '', url: 'https://untitled.example/x', dateAdded: 450 },
        ],
      },
    ],
  },
];

const NOW = 4_242;

function build(): BookmarkIndexData {
  return buildIndex(TREE, NOW);
}

function folder(index: BookmarkIndexData, id: string): FolderEntry {
  const found = index.folderById.get(id);
  if (!found) throw new Error(`missing folder ${id}`);
  return found;
}

function bookmark(index: BookmarkIndexData, id: string): BookmarkEntry {
  const found = index.byId.get(id);
  if (!found) throw new Error(`missing bookmark ${id}`);
  return found;
}

function ids(entries: readonly { id: string }[]): string[] {
  return entries.map((entry) => entry.id);
}

describe('buildIndex', () => {
  const index = build();

  it('flattens the synthetic root into top-level folder ids, in browser order', () => {
    expect(index.rootIds).toEqual(['1', '2']);
    expect(index.counts).toEqual({ bookmarks: 7, folders: 5 });
    expect(index.builtAt).toBe(NOW);
  });

  it('records the folder chain of every folder without repeating its own title', () => {
    expect(folder(index, '1').path).toBe('');
    expect(folder(index, '2').path).toBe('');
    expect(folder(index, '11').path).toBe('Bookmarks bar');
    expect(folder(index, '111').path).toBe('Bookmarks bar / Dev');
  });

  it('records depth, index and dateAdded for folders', () => {
    expect([folder(index, '1').depth, folder(index, '1').index, folder(index, '1').dateAdded]).toEqual([
      0, 0, 100,
    ]);
    expect([folder(index, '11').depth, folder(index, '11').index, folder(index, '11').dateAdded]).toEqual([
      1, 3, 200,
    ]);
    expect(folder(index, '111').depth).toBe(2);
    expect(folder(index, '2').depth).toBe(0);
    expect(folder(index, '2').index).toBe(1);
  });

  it('counts the bookmarks directly inside every folder', () => {
    expect([folder(index, '1').count, folder(index, '11').count, folder(index, '111').count]).toEqual([
      3, 1, 1,
    ]);
    expect(folder(index, '14').count).toBe(0);
    expect(folder(index, '2').count).toBe(2);
  });

  it('sums a folder total from its own bookmarks and every descendant', () => {
    // Folder 1 holds three bookmarks directly and two more inside folder 11,
    // so its total is 5 while its own count stays 3.
    expect([folder(index, '1').total, folder(index, '2').total, folder(index, '11').total]).toEqual([
      5, 2, 2,
    ]);
    expect(folder(index, '1').count).toBe(3);
    expect(folder(index, '111').total).toBe(1);
    expect(folder(index, '14').total).toBe(0);
  });

  it('keeps every bookmark in depth-first browser order', () => {
    expect(ids(index.bookmarks)).toEqual(['10', '12', '13', '110', '1110', '20', '30']);
    expect(ids(allBookmarks(index))).toEqual(ids(index.bookmarks));
  });

  it('pre-computes the lowercase fields the matcher reads', () => {
    const entry = bookmark(index, '10');
    expect(entry.sTitle).toBe('github');
    expect(entry.sUrl).toBe('https://github.com/');
    expect(entry.sHost).toBe('github.com');
    expect(entry.sPath).toBe('bookmarks bar');
  });

  it('joins the parent chain into the bookmark path and host', () => {
    expect(bookmark(index, '10')).toMatchObject({
      parentId: '1',
      folderTitle: 'Bookmarks bar',
      path: 'Bookmarks bar',
      host: 'github.com',
      index: 0,
      dateAdded: 500,
    });
    expect(bookmark(index, '1110')).toMatchObject({
      path: 'Bookmarks bar / Dev / Docs',
      host: 'developer.mozilla.org',
    });
    expect(bookmark(index, '20')).toMatchObject({ path: 'Other bookmarks', host: 'news.ycombinator.com' });
  });

  it('falls back to the url as the title when a bookmark has none', () => {
    expect(bookmark(index, '30')).toMatchObject({
      title: 'https://untitled.example/x',
      sTitle: 'https://untitled.example/x',
    });
  });

  it('accepts a bare array of root nodes', () => {
    const bare = buildIndex([
      {
        id: '1',
        title: 'Bar',
        children: [{ id: '10', title: 'X', url: 'https://x.example/' }],
      },
    ]);
    expect(bare.rootIds).toEqual(['1']);
    expect(folder(bare, '1').parentId).toBeNull();
    expect(bookmark(bare, '10').path).toBe('Bar');
  });

  it('treats a node without a url as a folder, even when the url is empty', () => {
    const sparse = buildIndex([{ id: '1', title: 'Sparse', children: [{ id: '10', title: 'X', url: '' }] }]);
    expect(sparse.counts.bookmarks).toBe(0);
    expect(sparse.counts.folders).toBe(2);
  });
});

describe('isIndexEmpty', () => {
  it('is true for the empty index and for a tree without bookmarks', () => {
    expect(isIndexEmpty(EMPTY_INDEX)).toBe(true);
    expect(EMPTY_INDEX.builtAt).toBe(0);
    expect(isIndexEmpty(buildIndex([]))).toBe(true);
  });

  it('is false as soon as one bookmark or one folder exists', () => {
    expect(isIndexEmpty(buildIndex([{ id: '1', title: 'Empty folder' }]))).toBe(false);
    expect(
      isIndexEmpty(buildIndex([{ id: '1', title: 'Bar', children: [{ id: '10', title: 'X', url: 'https://x.example' }] }])),
    ).toBe(false);
  });
});

describe('bookmarksInFolder', () => {
  const index = build();

  it('returns browser order for the manual mode', () => {
    expect(ids(bookmarksInFolder(index, '1', 'manual'))).toEqual(['10', '12', '13']);
  });

  it('returns the empty list for an unknown folder', () => {
    expect(bookmarksInFolder(index, 'nope', 'manual')).toEqual([]);
    expect(bookmarksInFolder(index, 'nope', 'title')).toEqual([]);
  });

  it('sorts by title case-insensitively', () => {
    expect(ids(bookmarksInFolder(index, '1', 'title'))).toEqual(['12', '10', '13']);
  });

  it('sorts by most recently added first', () => {
    expect(ids(bookmarksInFolder(index, '1', 'recent'))).toEqual(['13', '12', '10']);
  });

  it('lists every bookmark when no folder is given, in browser order', () => {
    expect(ids(bookmarksInFolder(index, null, 'manual'))).toEqual(ids(index.bookmarks));
    expect(ids(bookmarksInFolder(index, null, 'recent'))).toEqual([
      '1110', '13', '110', '12', '10', '30', '20',
    ]);
  });

  it('does not mutate the stored order for the sorted modes', () => {
    bookmarksInFolder(index, '1', 'title');
    bookmarksInFolder(index, '1', 'recent');
    expect(ids(bookmarksInFolder(index, '1', 'manual'))).toEqual(['10', '12', '13']);
  });
});

describe('childFoldersOf', () => {
  const index = build();

  it('returns top-level folders in browser order when no parent is given', () => {
    expect(ids(childFoldersOf(index, null))).toEqual(['1', '2']);
  });

  it('returns direct children only, ordered by their browser index', () => {
    expect(ids(childFoldersOf(index, '1'))).toEqual(['11', '14']);
    expect(ids(childFoldersOf(index, '11'))).toEqual(['111']);
  });

  it('returns nothing for a leaf, an unknown id or a bookmark id', () => {
    expect(childFoldersOf(index, '111')).toEqual([]);
    expect(childFoldersOf(index, 'nope')).toEqual([]);
    expect(childFoldersOf(index, '10')).toEqual([]);
  });
});

describe('folderBreadcrumb', () => {
  const index = build();

  it('walks from the root folder down to the requested folder', () => {
    expect(ids(folderBreadcrumb(index, '111'))).toEqual(['1', '11', '111']);
    expect(ids(folderBreadcrumb(index, '1'))).toEqual(['1']);
    expect(ids(folderBreadcrumb(index, '14'))).toEqual(['1', '14']);
  });

  it('returns nothing for an unknown folder', () => {
    expect(folderBreadcrumb(index, 'nope')).toEqual([]);
  });
});

describe('rootFolderOf', () => {
  const index = build();

  it('walks up to the top-level folder', () => {
    expect(rootFolderOf(index, '111')?.id).toBe('1');
    expect(rootFolderOf(index, '11')?.id).toBe('1');
    expect(rootFolderOf(index, '1')?.id).toBe('1');
    expect(rootFolderOf(index, '2')?.id).toBe('2');
  });

  it('returns undefined for an unknown folder', () => {
    expect(rootFolderOf(index, 'nope')).toBeUndefined();
  });
});

describe('descendantFolders', () => {
  const index = build();

  it('collects every nested folder', () => {
    expect(ids(descendantFolders(index, '1')).sort()).toEqual(['11', '111', '14']);
    expect(ids(descendantFolders(index, '11'))).toEqual(['111']);
  });

  it('returns nothing for a leaf or an unknown folder', () => {
    expect(descendantFolders(index, '111')).toEqual([]);
    expect(descendantFolders(index, 'nope')).toEqual([]);
  });
});

describe('expandHiddenFolders', () => {
  const index = build();

  it('adds the descendants of every hidden folder', () => {
    expect([...expandHiddenFolders(index, ['11'])].sort()).toEqual(['11', '111']);
    expect([...expandHiddenFolders(index, ['1'])].sort()).toEqual(['1', '11', '111', '14']);
  });

  it('deduplicates overlapping selections and tolerates unknown ids', () => {
    expect([...expandHiddenFolders(index, ['11', '111', '11'])].sort()).toEqual(['11', '111']);
    expect([...expandHiddenFolders(index, ['nope'])]).toEqual(['nope']);
    expect(expandHiddenFolders(index, []).size).toBe(0);
  });
});
