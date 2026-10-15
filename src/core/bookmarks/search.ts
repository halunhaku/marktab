import { atWordBoundary, indexOfHit, subsequenceHit, tokenize } from '../util/fuzzy';
import type { BookmarkEntry, BookmarkIndexData, FolderEntry } from './types';

export type MatchField = 'title' | 'host' | 'path' | 'url';

export interface BookmarkHit {
  kind: 'bookmark';
  entry: BookmarkEntry;
  score: number;
  field: MatchField;
}

export interface FolderHit {
  kind: 'folder';
  folder: FolderEntry;
  score: number;
  field: 'title' | 'path';
}

export interface SearchOptions {
  /** Maximum bookmark hits returned (scoring still covers the whole index). */
  limit?: number;
  folderLimit?: number;
  /** Frecency bonus per URL, derived from pins and recent visits. */
  weights?: Map<string, number>;
  /** Restrict results to these folder ids (folder + descendants). */
  scopeFolderIds?: Set<string> | null;
  /** Folder ids to skip entirely (hidden folders and their subtrees). */
  excludeFolders?: Set<string>;
}

export interface SearchOutcome {
  bookmarks: BookmarkHit[];
  folders: FolderHit[];
  tokens: string[];
  /** Total bookmark matches before `limit` was applied. */
  totalBookmarks: number;
  totalFolders: number;
  elapsedMs: number;
}

const FIELD_BASE: Record<MatchField, number> = { title: 1000, host: 620, path: 420, url: 260 };
const FIELD_ORDER: readonly MatchField[] = ['title', 'host', 'path', 'url'];

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Match quality for one token in one field.
 *
 * Branch-light and allocation-free: the whole index is scored on every
 * keystroke, so this runs hundreds of thousands of times per search.
 */
function fieldScore(hay: string, token: string, base: number): number {
  const index = indexOfHit(hay, token);
  if (index >= 0) {
    if (index === 0 && hay.length === token.length) return base * 2.2;
    if (index === 0) return base * 1.6;
    if (atWordBoundary(hay, index)) return base * 1.25;
    return base;
  }
  if (token.length < 3 || token.length > 16) return 0;
  const compactness = subsequenceHit(hay, token);
  if (compactness < 0) return 0;
  return base * compactness * 0.45;
}

interface TokenMatch {
  score: number;
  field: MatchField;
}

const NO_MATCH: TokenMatch = { score: 0, field: 'title' };
/** Folder hits only ever match on a title or a folder path. */
const FOLDER_NO_MATCH: { score: number; field: 'title' | 'path' } = { score: 0, field: 'title' };

function bestField(entry: BookmarkEntry, token: string): TokenMatch | null {
  let bestScore = 0;
  let bestField: MatchField = 'title';
  for (let i = 0; i < FIELD_ORDER.length; i += 1) {
    const field = FIELD_ORDER[i] as MatchField;
    const hay =
      field === 'title'
        ? entry.sTitle
        : field === 'host'
          ? entry.sHost
          : field === 'path'
            ? entry.sPath
            : entry.sUrl;
    if (!hay) continue;
    const score = fieldScore(hay, token, FIELD_BASE[field]);
    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }
  return bestScore > 0 ? { score: bestScore, field: bestField } : null;
}

function folderMatch(
  folder: FolderEntry,
  token: string,
): { score: number; field: 'title' | 'path' } | null {
  const titleScore = fieldScore(folder.sTitle, token, FIELD_BASE.title);
  const pathScore = folder.sPath ? fieldScore(folder.sPath, token, FIELD_BASE.path) : 0;
  if (titleScore === 0 && pathScore === 0) return null;
  return titleScore >= pathScore
    ? { score: titleScore, field: 'title' }
    : { score: pathScore, field: 'path' };
}

/**
 * Ranks bookmarks and folders for a query.
 *
 * Semantics: every token must match somewhere (AND), each token contributes its
 * best field score, and whole-query bonuses (title prefix, host equality,
 * frecency) break ties the way a launcher should.
 */
export function searchIndex(
  index: BookmarkIndexData,
  query: string,
  options: SearchOptions = {},
): SearchOutcome {
  const started = nowMs();
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return {
      bookmarks: [],
      folders: [],
      tokens: [],
      totalBookmarks: 0,
      totalFolders: 0,
      elapsedMs: 0,
    };
  }

  const limit = options.limit ?? 60;
  const folderLimit = options.folderLimit ?? 12;
  const weights = options.weights;
  const excluded = options.excludeFolders;
  const scope = options.scopeFolderIds ?? null;
  const fullQuery = tokens.join(' ');

  const bookmarkHits: BookmarkHit[] = [];
  let totalBookmarks = 0;

  const bookmarks = index.bookmarks;
  for (let i = 0; i < bookmarks.length; i += 1) {
    const entry = bookmarks[i] as BookmarkEntry;
    if (excluded?.has(entry.parentId)) continue;
    if (scope && !scope.has(entry.parentId)) continue;

    let total = 0;
    let matchedField: MatchField = 'title';
    let allMatched = true;
    for (let t = 0; t < tokens.length; t += 1) {
      const match = bestField(entry, tokens[t] as string) ?? NO_MATCH;
      if (match.score === 0) {
        allMatched = false;
        break;
      }
      total += match.score;
      matchedField = match.field;
    }
    if (!allMatched) continue;

    if (entry.sTitle.startsWith(fullQuery)) total += 600;
    if (entry.sHost === fullQuery) total += 420;
    else if (entry.sUrl.startsWith(fullQuery)) total += 120;
    const bonus = weights?.get(entry.url);
    if (bonus) total += bonus;

    totalBookmarks += 1;
    bookmarkHits.push({ kind: 'bookmark', entry, score: total, field: matchedField });
  }

  bookmarkHits.sort(byBookmarkScore);
  if (bookmarkHits.length > limit) bookmarkHits.length = limit;

  const folderHits: FolderHit[] = [];
  let totalFolders = 0;
  const folders = index.folders;
  for (let i = 0; i < folders.length; i += 1) {
    const folder = folders[i] as FolderEntry;
    if (excluded?.has(folder.id)) continue;
    let total = 0;
    let matchedField: 'title' | 'path' = 'title';
    let allMatched = true;
    for (let t = 0; t < tokens.length; t += 1) {
      const match = folderMatch(folder, tokens[t] as string) ?? FOLDER_NO_MATCH;
      if (match.score === 0) {
        allMatched = false;
        break;
      }
      total += match.score;
      matchedField = match.field;
    }
    if (!allMatched) continue;
    if (folder.sTitle.startsWith(fullQuery)) total += 500;
    total += Math.min(80, Math.log2(folder.total + 1) * 18);
    totalFolders += 1;
    folderHits.push({ kind: 'folder', folder, score: total, field: matchedField });
  }
  folderHits.sort(byFolderScore);
  if (folderHits.length > folderLimit) folderHits.length = folderLimit;

  return {
    bookmarks: bookmarkHits,
    folders: folderHits,
    tokens,
    totalBookmarks,
    totalFolders,
    elapsedMs: nowMs() - started,
  };
}

function byBookmarkScore(a: BookmarkHit, b: BookmarkHit): number {
  if (b.score !== a.score) return b.score - a.score;
  const byTitle = a.entry.sTitle.localeCompare(b.entry.sTitle);
  if (byTitle !== 0) return byTitle;
  return a.entry.url.localeCompare(b.entry.url);
}

function byFolderScore(a: FolderHit, b: FolderHit): number {
  if (b.score !== a.score) return b.score - a.score;
  const byTitle = a.folder.sTitle.localeCompare(b.folder.sTitle);
  if (byTitle !== 0) return byTitle;
  return a.folder.id.localeCompare(b.folder.id);
}

export interface HighlightRange {
  start: number;
  end: number;
}

/** Case-insensitive ranges of `text` matched by `tokens`, merged and sorted. */
export function highlightRanges(text: string, tokens: readonly string[]): HighlightRange[] {
  if (!text || tokens.length === 0) return [];
  const hay = text.toLowerCase();
  const ranges: HighlightRange[] = [];
  for (const token of tokens) {
    if (!token) continue;
    let from = 0;
    for (;;) {
      const at = hay.indexOf(token, from);
      if (at === -1) break;
      ranges.push({ start: at, end: at + token.length });
      from = at + token.length;
      if (ranges.length > 64) break;
    }
  }
  if (ranges.length === 0) return [];
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: HighlightRange[] = [ranges[0] as HighlightRange];
  for (let i = 1; i < ranges.length; i += 1) {
    const range = ranges[i] as HighlightRange;
    const last = merged[merged.length - 1] as HighlightRange;
    if (range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push(range);
  }
  return merged;
}
