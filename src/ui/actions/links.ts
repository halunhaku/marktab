import { copyText } from '@/core/appearance';
import { refreshBookmarksNow } from '@/core/bookmarks/store';
import {
  createBookmark,
  moveBookmark,
  openBookmarkManager,
  removeBookmark,
  renameBookmark,
} from '@/core/platform/bookmarks';
import { hostOf } from '@/core/util/url';
import { t } from '@/locales';
import { pinnedItems, type LinkItem } from '@/core/state/selectors';
import { forgetRecent, refreshPinTitle, togglePinFor } from '@/core/userdata/store';
import { openDialog, openMenu, openMenuAt, type MenuItemSpec } from '../state/overlay';
import { showToast } from '../state/toast';
import { navigate } from '../state/router';
import { openLink } from '../features/links/open';

export type { OpenDisposition } from '../features/links/open';
export { openLink } from '../features/links/open';

export function togglePin(item: Pick<LinkItem, 'url' | 'title'>): boolean {
  const pinned = togglePinFor(item.url, item.title);
  showToast(pinned ? t('toast.pinned') : t('toast.unpinned'), { tone: pinned ? 'success' : 'default' });
  return pinned;
}

export async function copyLink(url: string): Promise<void> {
  const ok = await copyText(url);
  showToast(ok ? t('toast.copied') : t('toast.copyFailed'), { tone: ok ? 'success' : 'error' });
}

export async function copyTitle(title: string): Promise<void> {
  const ok = await copyText(title);
  showToast(ok ? t('toast.copied') : t('toast.copyFailed'), { tone: ok ? 'success' : 'error' });
}

export function revealInFolder(): void {
  openBookmarkManager();
}

export function openSettingsRoute(): void {
  navigate({ kind: 'settings' });
}

export function openManager(): void {
  openBookmarkManager();
}

/**
 * Deletes a bookmark and offers an in-place undo.
 *
 * Only nodes that exist in the browser tree can be deleted; a pinned URL whose
 * bookmark was removed elsewhere is simply unpinned. The toast carries the exact
 * restore payload, so undo recreates the node in the same parent instead of
 * asking the user where it went.
 */
export async function deleteBookmark(item: LinkItem): Promise<void> {
  if (!item.bookmarkId) {
    togglePinFor(item.url, item.title);
    showToast(t('toast.unpinned'));
    return;
  }
  const parentId = item.folderId ?? undefined;
  const { title, url } = item;
  const result = await removeBookmark(item.bookmarkId);
  if (!result.ok) {
    showToast(t('toast.bookmarkAddFailed'), { tone: 'error' });
    return;
  }
  showToast(t('toast.removed', { title }), {
    action: {
      label: t('common.undo'),
      onSelect: () => {
        void createBookmark({ title, url, ...(parentId ? { parentId } : {}) }).then((restored) => {
          if (!restored.ok) {
            showToast(t('toast.bookmarkAddFailed'), { tone: 'error' });
            return;
          }
          showToast(t('toast.restored'), { tone: 'success' });
        });
      },
    },
  });
}

export async function renameLink(item: LinkItem, title: string): Promise<boolean> {
  if (!item.bookmarkId) return false;
  const result = await renameBookmark(item.bookmarkId, title);
  if (!result.ok) {
    showToast(t('toast.bookmarkAddFailed'), { tone: 'error' });
    return false;
  }
  await refreshBookmarksNow();
  // Pinned copies keep their own title so a tile never regresses to a raw URL.
  refreshPinTitle(item.url, title);
  return true;
}

export async function moveLink(item: LinkItem, parentId: string): Promise<boolean> {
  if (!item.bookmarkId) return false;
  const result = await moveBookmark(item.bookmarkId, { parentId });
  if (!result.ok) {
    showToast(t('toast.bookmarkAddFailed'), { tone: 'error' });
    return false;
  }
  await refreshBookmarksNow();
  return true;
}

export function forgetRecentItem(url: string): void {
  forgetRecent(url);
}

/* ---- menus ------------------------------------------------------------- */

export function buildLinkMenu(item: LinkItem): MenuItemSpec[] {
  const items: MenuItemSpec[] = [
    {
      id: 'open',
      label: t('item.open'),
      icon: 'arrowUpRight',
      shortcut: 'Enter',
      onSelect: () => openLink(item, 'current'),
    },
    {
      id: 'open-newtab',
      label: t('item.openNewTab'),
      icon: 'externalLink',
      shortcut: 'Shift+Enter',
      onSelect: () => openLink(item, 'newTab'),
    },
    {
      id: 'open-newwindow',
      label: t('item.openNewWindow'),
      icon: 'externalLink',
      onSelect: () => openLink(item, 'newWindow'),
    },
    {
      id: 'copy',
      label: t('item.copyUrl'),
      icon: 'link',
      shortcut: 'Mod+C',
      newGroup: true,
      onSelect: () => void copyLink(item.url),
    },
    {
      id: 'copy-title',
      label: t('item.copyTitle'),
      icon: 'copy',
      onSelect: () => void copyTitle(item.title),
    },
    {
      id: 'pin',
      label: item.pinned ? t('item.unpin') : t('item.pin'),
      icon: item.pinned ? 'pinFilled' : 'pin',
      shortcut: 'P',
      onSelect: () => togglePin(item),
    },
  ];

  if (item.bookmarkId) {
    items.push(
      {
        id: 'rename',
        label: t('item.rename'),
        icon: 'pencil',
        shortcut: 'R',
        newGroup: true,
        onSelect: () => openDialog({ kind: 'rename', target: item }),
      },
      {
        id: 'move',
        label: t('item.move'),
        icon: 'folderMove',
        shortcut: 'M',
        onSelect: () => openDialog({ kind: 'move', target: item }),
      },
      {
        id: 'reveal',
        label: t('item.reveal'),
        icon: 'folder',
        onSelect: () => revealInFolder(),
      },
      {
        id: 'delete',
        label: t('item.remove'),
        icon: 'trash',
        danger: true,
        newGroup: true,
        onSelect: () => openDialog({ kind: 'delete', target: item }),
      },
    );
  }

  return items;
}

export function openLinkMenu(item: LinkItem, target: EventTarget | null): void {
  openMenuAt(target, buildLinkMenu(item), item.title, 'end');
}

export function openMenuFromPoint(item: LinkItem, event: MouseEvent): void {
  event.preventDefault();
  openMenu({
    items: buildLinkMenu(item),
    label: item.title,
    align: 'start',
    anchor: { x: event.clientX, y: event.clientY, width: 0, height: 0 },
  });
}

/** Domain shown as the secondary line of a link row or card. */
export function hostLabel(item: Pick<LinkItem, 'host' | 'url'>): string {
  return item.host || hostOf(item.url);
}

export function pinnedUrls(): Set<string> {
  return new Set(pinnedItems.value.map((item) => item.url));
}
