import type { JSX } from 'preact';
import type { FolderEntry } from '@/core/bookmarks/types';
import { t } from '@/locales';
import styles from './FolderBreadcrumb.module.css';

export interface FolderBreadcrumbProps {
  /** Chain from the root folder down to the current one. Empty renders nothing. */
  crumbs: readonly FolderEntry[];
  onNavigate: (folderId: string) => void;
}

/** How many crumbs stay visible at each end once a chain gets deep. */
const HEAD = 1;
const TAIL = 2;

type Slot = { kind: 'folder'; folder: FolderEntry } | { kind: 'gap' };

function toSlots(folders: readonly FolderEntry[]): Slot[] {
  return folders.map((folder) => ({ kind: 'folder', folder }));
}

/**
 * Folder ancestry trail.
 *
 * Ancestors are buttons that navigate; the current folder is plain text because
 * it is where the user already is. Deep chains drop their middle segments — a
 * twenty-level path is unreadable at any width, and the first and last steps are
 * the only ones people use.
 */
export function FolderBreadcrumb({ crumbs, onNavigate }: FolderBreadcrumbProps): JSX.Element | null {
  if (crumbs.length === 0) return null;

  const collapsed = crumbs.length > HEAD + TAIL + 1;
  const slots: Slot[] = collapsed
    ? [...toSlots(crumbs.slice(0, HEAD)), { kind: 'gap' }, ...toSlots(crumbs.slice(-TAIL))]
    : toSlots(crumbs);

  return (
    <nav class={styles.nav} aria-label={t('nav.folders')}>
      <ol class={styles.list}>
        {slots.map((slot, index) => {
          const last = index === slots.length - 1;
          return (
            <li class={styles.item} key={slot.kind === 'folder' ? slot.folder.id : `gap-${index}`}>
              {slot.kind === 'gap' ? (
                <span class={styles.gap} aria-hidden="true">
                  …
                </span>
              ) : last ? (
                <span class={styles.current} title={slot.folder.title} aria-current="page">
                  {slot.folder.title || t('common.untitled')}
                </span>
              ) : (
                <button
                  type="button"
                  class={styles.crumb}
                  title={slot.folder.path || slot.folder.title}
                  onClick={() => onNavigate(slot.folder.id)}
                >
                  {slot.folder.title || t('common.untitled')}
                </button>
              )}
              {last ? null : (
                <span class={styles.separator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
