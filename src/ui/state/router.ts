import { signal } from '@preact/signals';

/**
 * Application routing.
 *
 * Routes are plain state rather than URL fragments: a new tab page has no
 * history semantics a user expects (the back button should not walk through
 * views), and resetting to Home on every tab open is the behaviour people want.
 * `folder` carries the browser folder id so a route can be restored from recents.
 */
export type Route =
  | { kind: 'home' }
  | { kind: 'recent' }
  | { kind: 'pinned' }
  | { kind: 'folder'; id: string }
  | { kind: 'settings' };

export const route = signal<Route>({ kind: 'home' });

/** Folder-local filter text; cleared whenever the route changes. */
export const folderFilter = signal('');

export function navigate(next: Route): void {
  folderFilter.value = '';
  paletteOpen.value = false;
  route.value = next;
  if (typeof document !== 'undefined') document.title = documentTitle(next);
}

export function goHome(): void {
  navigate({ kind: 'home' });
}

function documentTitle(current: Route): string {
  switch (current.kind) {
    case 'settings':
      return 'Settings — MarkTab';
    case 'recent':
      return 'Recent — MarkTab';
    case 'pinned':
      return 'Pinned — MarkTab';
    case 'folder':
      return 'Folder — MarkTab';
    default:
      return 'MarkTab';
  }
}

/* ---- command palette --------------------------------------------------- */

export const paletteOpen = signal(false);
const paletteQuery = signal('');

export function openPalette(query = ''): void {
  paletteQuery.value = query;
  paletteOpen.value = true;
}

export function closePalette(): void {
  if (!paletteOpen.value) return;
  paletteOpen.value = false;
  paletteQuery.value = '';
}

/** Initial text the palette should start with when it next opens. */
export function paletteInitialQuery(): string {
  return paletteQuery.value;
}

/** Test seam: resets routing and overlay state. */
export function resetNavigationForTests(): void {
  route.value = { kind: 'home' };
  folderFilter.value = '';
  paletteOpen.value = false;
  paletteQuery.value = '';
}
