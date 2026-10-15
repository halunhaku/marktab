import type { JSX } from 'preact';
import type { FolderEntry } from '@/core/bookmarks/types';
import { t } from '@/locales';
import { openManager } from '@/ui/actions/links';
import { IconButton } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { cx } from '@/ui/components/cx';
import { itemCountLabel } from '@/ui/format';
import { openMenu, openMenuAt, type MenuItemSpec } from '@/ui/state/overlay';
import styles from './FolderChips.module.css';

export interface FolderChipsProps {
  folders: readonly FolderEntry[];
  /** Folders hidden from the rail; drives whether the menu offers hide or unhide. */
  hiddenIds: ReadonlySet<string>;
  onOpen: (folderId: string) => void;
  onHide: (folder: FolderEntry) => void;
  onUnhide: (folder: FolderEntry) => void;
}

/**
 * One horizontal row of subfolder cards.
 *
 * A folder can hold dozens of children and the row never wraps, so it scrolls
 * sideways instead of pushing the bookmarks below the fold.
 */
export function FolderChips({
  folders,
  hiddenIds,
  onOpen,
  onHide,
  onUnhide,
}: FolderChipsProps): JSX.Element | null {
  if (folders.length === 0) return null;

  const menuFor = (folder: FolderEntry): MenuItemSpec[] => {
    const item: MenuItemSpec = hiddenIds.has(folder.id)
      ? { id: 'unhide', label: t('folders.unhide'), icon: 'folder', onSelect: () => onUnhide(folder) }
      : { id: 'hide', label: t('folders.hide'), icon: 'eyeOff', onSelect: () => onHide(folder) };
    return [
      item,
      {
        id: 'manager',
        label: t('action.openManager'),
        icon: 'folderMove',
        newGroup: true,
        onSelect: () => openManager(),
      },
    ];
  };

  return (
    <section class={styles.root} aria-label={t('folders.subfolders')}>
      <SectionHeader title={t('folders.subfolders')} />
      <ul class={styles.row}>
        {folders.map((folder) => {
          const hidden = hiddenIds.has(folder.id);
          const label = folder.title || t('common.untitled');
          return (
            <li class={styles.item} key={folder.id}>
              <div
                class={cx(styles.card, hidden && styles.cardHidden)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openMenu({
                    items: menuFor(folder),
                    label,
                    anchor: { x: event.clientX, y: event.clientY, width: 0, height: 0 },
                  });
                }}
              >
                <button
                  type="button"
                  class={styles.open}
                  title={folder.path || label}
                  onClick={() => onOpen(folder.id)}
                >
                  <span class={styles.icon}>
                    <Icon name="folder" size={17} />
                  </span>
                  <span class={styles.copy}>
                    <span class={styles.title}>{label}</span>
                    <span class={styles.count}>
                      {hidden ? <Icon name="eyeOff" size={11} title={t('folders.unhide')} /> : null}
                      {itemCountLabel(folder.total)}
                    </span>
                  </span>
                </button>
                <IconButton
                  class={styles.more}
                  icon="moreVertical"
                  size="sm"
                  label={`${label}: ${t('item.more')}`}
                  onClick={(event) => openMenuAt(event.currentTarget, menuFor(folder), label, 'end')}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
