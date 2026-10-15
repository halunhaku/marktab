import { getBookmarksApi, getChrome } from './chrome';

/**
 * Write-side access to the browser's bookmark tree.
 *
 * Reads go through `core/bookmarks` (the search index); mutations live here so
 * that every call site gets the same promise shape and the same failure
 * reporting. Nothing in this module touches MarkTab's own storage, and no
 * bookmark is ever deleted except by an explicit user action.
 */

export interface BookmarkMutation {
  ok: boolean;
  id?: string;
  error?: string;
}

function fail(error: unknown): BookmarkMutation {
  return { ok: false, error: String(error) };
}

export interface CreateBookmarkInput {
  title: string;
  url: string;
  parentId?: string;
  index?: number;
}

export async function createBookmark(input: CreateBookmarkInput): Promise<BookmarkMutation> {
  const api = getBookmarksApi();
  if (!api?.create) return fail('bookmarks-unavailable');
  try {
    const created = await api.create({
      title: input.title,
      url: input.url,
      ...(input.parentId ? { parentId: input.parentId } : {}),
      ...(input.index === undefined ? {} : { index: input.index }),
    });
    return { ok: true, id: created?.id };
  } catch (error) {
    return fail(error);
  }
}

export async function removeBookmark(id: string): Promise<BookmarkMutation> {
  const api = getBookmarksApi();
  if (!api?.remove) return fail('bookmarks-unavailable');
  try {
    await api.remove(id);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function renameBookmark(id: string, title: string): Promise<BookmarkMutation> {
  const api = getBookmarksApi();
  if (!api?.update) return fail('bookmarks-unavailable');
  try {
    await api.update(id, { title });
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function moveBookmark(
  id: string,
  destination: { parentId: string; index?: number },
): Promise<BookmarkMutation> {
  const api = getBookmarksApi();
  if (!api?.move) return fail('bookmarks-unavailable');
  try {
    await api.move(id, destination);
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

/** Opens the browser's own bookmark manager in a tab. */
export function openBookmarkManager(): void {
  const api = getChrome();
  const url = 'chrome://bookmarks/';
  if (api?.tabs?.create) {
    void api.tabs.create({ url });
    return;
  }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
}

export interface CurrentPage {
  title: string;
  url: string;
  id?: number;
}

/**
 * The page the toolbar action was invoked on.
 *
 * Only works from the popup: clicking the action grants `activeTab` for that one
 * tab, which is exactly the scope this needs. The new tab page deliberately does
 * not attempt it — reading other tabs' URLs would require the `tabs` permission.
 */
export async function readActivePage(fallbackUrl: string): Promise<CurrentPage | null> {
  const api = getChrome();
  if (!api?.tabs?.query) return fallbackUrl ? { title: '', url: fallbackUrl } : null;
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs.find((candidate) => typeof candidate.url === 'string' && candidate.url.length > 0);
    if (!tab?.url) return fallbackUrl ? { title: '', url: fallbackUrl } : null;
    if (!/^https?:/i.test(tab.url)) return null;
    return { title: tab.title ?? '', url: tab.url, ...(tab.id === undefined ? {} : { id: tab.id }) };
  } catch {
    return fallbackUrl ? { title: '', url: fallbackUrl } : null;
  }
}
