import { describe, expect, it } from 'vitest';
import { buildIndex } from '@/core/bookmarks';
import { highlightRanges, searchIndex } from '@/core/bookmarks/search';
import type { BookmarkHit, SearchOutcome } from '@/core/bookmarks/search';
import type { BookmarkIndexData, RawBookmarkNode } from '@/core/bookmarks/types';

function node(id: string, title: string, url?: string): RawBookmarkNode {
  return url === undefined ? { id, title } : { id, title, url };
}

function folderNode(id: string, title: string, children: RawBookmarkNode[]): RawBookmarkNode {
  return { id, title, children };
}

function ids(hits: readonly { entry: { id: string } }[]): string[] {
  return hits.map((hit) => hit.entry.id);
}

function hitFor(outcome: SearchOutcome, id: string): BookmarkHit {
  const hit = outcome.bookmarks.find((candidate) => candidate.entry.id === id);
  if (!hit) throw new Error(`expected a hit for ${id}`);
  return hit;
}

/**
 * One bookmark per match field, each matching `react` with the same "inside a
 * word, not at a word boundary" quality so the field weight is the only thing
 * deciding the order: title `zzreact` > host `myreact` > folder path `xzreact`
 * > url suffix `zzreact`.
 */
const RANK_TREE: RawBookmarkNode[] = [
  folderNode('0', '', [
    folderNode('f1', 'Bookmarks bar', [
      node('t1', 'zzreact guide', 'https://docs.example.com/intro'),
      node('h1', 'Intro', 'https://myreact.example.net/x'),
      node('u1', 'Intro', 'https://other.example.org/zzreact'),
      node('g1', 'React', 'https://github.com/react'),
      folderNode('df', 'Deep', [node('d1', 'Deep link', 'https://deep.example/')]),
    ]),
    folderNode('xzreact', 'xzreact', [node('p1', 'Intro', 'https://plain.example.org/intro')]),
  ]),
];

const RANK = buildIndex(RANK_TREE, 0);

const FREQ_TREE: RawBookmarkNode[] = [
  folderNode('0', '', [
    folderNode('f1', 'Bar', [
      node('a1', 'Alpha tool', 'https://alpha.example/'),
      node('b1', 'Beta tool', 'https://beta.example/'),
    ]),
  ]),
];

const LIMIT_TREE: RawBookmarkNode[] = [
  folderNode('0', '', [
    folderNode('f1', 'Dev alpha', [node('b1', 'Dev one', 'https://dev1.example/')]),
    folderNode('f2', 'Dev beta', [node('b2', 'Dev two', 'https://dev2.example/')]),
    folderNode('f3', 'Dev gamma', [node('b3', 'Dev three', 'https://dev3.example/')]),
  ]),
];

describe('searchIndex field ranking', () => {
  it('ranks title over host over path over url for the same match quality', () => {
    const outcome = searchIndex(RANK, 'react');

    expect(hitFor(outcome, 't1').field).toBe('title');
    expect(hitFor(outcome, 'h1').field).toBe('host');
    expect(hitFor(outcome, 'p1').field).toBe('path');
    expect(hitFor(outcome, 'u1').field).toBe('url');

    expect(hitFor(outcome, 't1').score).toBeGreaterThan(hitFor(outcome, 'h1').score);
    expect(hitFor(outcome, 'h1').score).toBeGreaterThan(hitFor(outcome, 'p1').score);
    expect(hitFor(outcome, 'p1').score).toBeGreaterThan(hitFor(outcome, 'u1').score);
  });

  it('puts an exact whole-title match first, bonuses included', () => {
    expect(ids(searchIndex(RANK, 'react').bookmarks)).toEqual(['g1', 't1', 'h1', 'p1', 'u1']);
  });

  it('scores a folder title match above a folder path match', () => {
    const outcome = searchIndex(RANK, 'bookmarks');
    const byId = new Map(outcome.folders.map((hit) => [hit.folder.id, hit]));

    expect(byId.get('f1')?.field).toBe('title');
    expect(byId.get('df')?.field).toBe('path');
    expect(byId.get('f1')?.score).toBeGreaterThan(byId.get('df')?.score ?? 0);
  });

  it('returns folder hits for the folder path of every matching bookmark', () => {
    const outcome = searchIndex(RANK, 'react');
    expect(outcome.folders.map((hit) => hit.folder.id)).toEqual(['xzreact']);
    expect(outcome.folders[0]?.field).toBe('title');
    expect(outcome.totalFolders).toBe(1);
  });
});

describe('searchIndex abbreviations', () => {
  it('finds github.com/react from the abbreviation ghr', () => {
    const outcome = searchIndex(RANK, 'ghr');
    expect(ids(outcome.bookmarks)).toEqual(['g1']);
    expect(outcome.bookmarks[0]?.field).toBe('url');
  });

  it('prefers the host when the abbreviation is tighter there', () => {
    const index = buildIndex([
      folderNode('0', '', [
        folderNode('f1', 'Bar', [node('m1', 'MDN', 'https://developer.mozilla.org/en-US/')]),
      ]),
    ]);
    const outcome = searchIndex(index, 'dmo');
    expect(ids(outcome.bookmarks)).toEqual(['m1']);
    expect(outcome.bookmarks[0]?.field).toBe('host');
  });

  it('does not fall back to subsequences for very short tokens', () => {
    // `hr` is a subsequence of plenty of urls but shorter than the floor.
    expect(searchIndex(RANK, 'hr').bookmarks).toEqual([]);
  });

  it('never matches characters out of order', () => {
    expect(searchIndex(RANK, 'rctr').bookmarks).toEqual([]);
  });
});

describe('searchIndex multi-token queries', () => {
  it('requires every token to match somewhere (AND)', () => {
    expect(ids(searchIndex(RANK, 'react').bookmarks)).toEqual(['g1', 't1', 'h1', 'p1', 'u1']);
    expect(ids(searchIndex(RANK, 'react guide').bookmarks)).toEqual(['t1']);
    expect(ids(searchIndex(RANK, 'guide').bookmarks)).toEqual(['t1']);
  });

  it('is independent of token order', () => {
    expect(ids(searchIndex(RANK, 'guide react').bookmarks)).toEqual(['t1']);
  });

  it('matches tokens in different fields of the same bookmark', () => {
    expect(ids(searchIndex(RANK, 'react docs').bookmarks)).toEqual(['t1']);
    expect(ids(searchIndex(RANK, 'react intro').bookmarks)).toEqual(['h1', 'p1', 'u1', 't1']);
    expect(ids(searchIndex(RANK, 'react zzreact').bookmarks)).toEqual(['t1', 'u1']);
  });
});

describe('searchIndex scoping and exclusion', () => {
  it('scopes bookmark hits to the given parent folders (no subtree expansion)', () => {
    const scoped = searchIndex(RANK, 'react', { scopeFolderIds: new Set(['f1']) });
    expect(ids(scoped.bookmarks).sort()).toEqual(['g1', 'h1', 't1', 'u1']);
    expect(ids(scoped.bookmarks)).not.toContain('p1');
  });

  it('still matches folders when scoping bookmarks', () => {
    const scoped = searchIndex(RANK, 'react', { scopeFolderIds: new Set(['xzreact']) });
    expect(ids(scoped.bookmarks)).toEqual(['p1']);
    expect(scoped.folders.map((hit) => hit.folder.id)).toEqual(['xzreact']);
  });

  it('drops bookmarks whose parent folder is excluded', () => {
    const outcome = searchIndex(RANK, 'react', { excludeFolders: new Set(['f1']) });
    expect(ids(outcome.bookmarks)).toEqual(['p1']);
    expect(outcome.bookmarks.every((hit) => hit.entry.parentId !== 'f1')).toBe(true);
  });

  it('drops excluded folders from the folder results', () => {
    const outcome = searchIndex(RANK, 'react', { excludeFolders: new Set(['xzreact']) });
    expect(outcome.folders).toEqual([]);
    expect(outcome.totalFolders).toBe(0);
    expect(ids(outcome.bookmarks)).toEqual(['g1', 't1', 'h1', 'u1']);
  });
});

describe('searchIndex limits', () => {
  const index = buildIndex(LIMIT_TREE, 0);

  it('caps bookmark hits but keeps counting every match', () => {
    const outcome = searchIndex(index, 'dev', { limit: 2 });
    expect(outcome.bookmarks).toHaveLength(2);
    expect(outcome.totalBookmarks).toBe(3);
  });

  it('caps folder hits independently', () => {
    const outcome = searchIndex(index, 'dev', { folderLimit: 1 });
    expect(outcome.folders).toHaveLength(1);
    expect(outcome.totalFolders).toBe(3);
    expect(outcome.bookmarks).toHaveLength(3);
  });

  it('returns every match under the default limits', () => {
    const outcome = searchIndex(index, 'dev');
    expect(outcome.bookmarks).toHaveLength(3);
    expect(outcome.folders).toHaveLength(3);
  });

  it('returns an empty outcome for a blank query without touching the index', () => {
    expect(searchIndex(index, '   \t ')).toEqual({
      bookmarks: [],
      folders: [],
      tokens: [],
      totalBookmarks: 0,
      totalFolders: 0,
      elapsedMs: 0,
    });
  });
});

describe('searchIndex frecency weights', () => {
  const index = buildIndex(FREQ_TREE, 0);

  it('breaks ties by title when no weights are supplied', () => {
    expect(ids(searchIndex(index, 'tool').bookmarks)).toEqual(['a1', 'b1']);
  });

  it('promotes a weighted url above an equally-scored one', () => {
    const weights = new Map([['https://beta.example/', 500]]);
    expect(ids(searchIndex(index, 'tool', { weights }).bookmarks)).toEqual(['b1', 'a1']);
  });

  it('ignores weights for urls that did not match', () => {
    const weights = new Map([['https://elsewhere.example/', 100_000]]);
    expect(ids(searchIndex(index, 'tool', { weights }).bookmarks)).toEqual(['a1', 'b1']);
  });
});

describe('highlightRanges', () => {
  it('returns nothing without text or tokens', () => {
    expect(highlightRanges('', ['a'])).toEqual([]);
    expect(highlightRanges('text', [])).toEqual([]);
    expect(highlightRanges('text', [''])).toEqual([]);
  });

  it('finds every occurrence case-insensitively', () => {
    expect(highlightRanges('React and react', ['react'])).toEqual([
      { start: 0, end: 5 },
      { start: 10, end: 15 },
    ]);
    expect(highlightRanges('ReAct', ['react'])).toEqual([{ start: 0, end: 5 }]);
  });

  it('returns ranges sorted by position regardless of token order', () => {
    expect(highlightRanges('and react', ['react', 'and'])).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 9 },
    ]);
  });

  it('merges overlapping and adjacent ranges', () => {
    expect(highlightRanges('react', ['rea', 'eact'])).toEqual([{ start: 0, end: 5 }]);
    expect(highlightRanges('github', ['git', 'github'])).toEqual([{ start: 0, end: 6 }]);
    expect(highlightRanges('reactreact', ['react'])).toEqual([{ start: 0, end: 10 }]);
  });

  it('returns no ranges when nothing matches', () => {
    expect(highlightRanges('github', ['react'])).toEqual([]);
  });
});

const PERF_FOLDERS = 200;
const PERF_PER_FOLDER = 100;

function perfTree(): RawBookmarkNode[] {
  const children: RawBookmarkNode[] = [];
  for (let f = 0; f < PERF_FOLDERS; f += 1) {
    const bookmarks: RawBookmarkNode[] = [];
    for (let i = 0; i < PERF_PER_FOLDER; i += 1) {
      const title = i % 100 === 0 ? `Mozilla project ${f}-${i}` : `Site ${f}-${i} docs`;
      bookmarks.push(node(`b${f}-${i}`, title, `https://site-${f}-${i}.example.com/doc/${i}`));
    }
    children.push(folderNode(`f${f}`, `Folder ${f}`, bookmarks));
  }
  return [folderNode('0', '', children)];
}

const PERF_INDEX: BookmarkIndexData = buildIndex(perfTree(), 0);

describe('searchIndex performance', () => {
  it(`searches ${PERF_INDEX.counts.bookmarks} bookmarks in one frame`, () => {
    searchIndex(PERF_INDEX, 'mozilla');
    const started = performance.now();
    const outcome = searchIndex(PERF_INDEX, 'mozilla');
    const ms = performance.now() - started;
    console.log(
      `searchIndex over ${PERF_INDEX.counts.bookmarks} bookmarks took ${ms.toFixed(1)} ms`,
    );

    expect(PERF_INDEX.counts.bookmarks).toBe(20_000);
    expect(outcome.totalBookmarks).toBe(200);
    expect(ms).toBeLessThan(150);
  });
});
