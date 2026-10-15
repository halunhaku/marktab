import { settings } from '@/core/settings/store';
import { updateSettings } from '@/core/settings/store';
import { t } from '@/locales';
import { openMenuAt, type MenuItemSpec } from '../state/overlay';
import { showToast } from '../state/toast';
import { goHome } from '../state/router';

/**
 * Folder visibility commands.
 *
 * Hiding is the only destructive-looking action on a folder, and it is fully
 * reversible: the id lands in `settings.folders.hiddenIds` (which also hides the
 * subtree through `expandHiddenFolders`) and the toast carries the exact undo.
 * Browser bookmarks are never touched by any of this.
 */
export function hiddenFolderIds(): readonly string[] {
  return settings.value.folders.hiddenIds;
}

export function isFolderHidden(folderId: string): boolean {
  return settings.value.folders.hiddenIds.includes(folderId);
}

export function hideFolder(folderId: string, label: string): void {
  const current = settings.value.folders.hiddenIds;
  if (current.includes(folderId)) return;
  updateSettings({ folders: { hiddenIds: [...current, folderId] } });
  showToast(t('folders.hiddenNotice', { folder: label }), {
    action: { label: t('common.undo'), onSelect: () => unhideFolder(folderId) },
  });
}

export function unhideFolder(folderId: string): void {
  const current = settings.value.folders.hiddenIds;
  if (!current.includes(folderId)) return;
  updateSettings({ folders: { hiddenIds: current.filter((id) => id !== folderId) } });
}

/** Hides a folder and leaves the folder view when it is the one being hidden. */
export function hideFolderAndLeave(folderId: string, label: string, activeFolderId: string | null): void {
  hideFolder(folderId, label);
  if (activeFolderId === folderId) goHome();
}

/** Menu shared by every folder affordance (rail tiles, breadcrumbs, home tiles). */
export function openFolderMenu(
  target: EventTarget | null,
  folder: { id: string; title: string },
  options: { onOpen?: () => void; extra?: MenuItemSpec[] } = {},
): void {
  const hidden = isFolderHidden(folder.id);
  const items: MenuItemSpec[] = [];
  if (options.onOpen) {
    items.push({
      id: 'open-folder',
      label: t('item.open'),
      icon: 'arrowUpRight',
      onSelect: options.onOpen,
    });
  }
  items.push({
    id: 'toggle-hidden',
    label: hidden ? t('folders.unhide') : t('folders.hide'),
    icon: hidden ? 'folder' : 'eyeOff',
    newGroup: items.length > 0,
    onSelect: () => {
      if (hidden) {
        unhideFolder(folder.id);
        return;
      }
      hideFolder(folder.id, folder.title);
    },
  });
  items.push(...(options.extra ?? []));
  openMenuAt(target, items, folder.title, 'end');
}
