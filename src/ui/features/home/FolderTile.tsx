import type { JSX } from 'preact';
import { Icon } from '@/ui/components/Icon';
import { cx } from '@/ui/components/cx';
import type { FolderCard } from '@/core/state/selectors';
import { itemCountLabel } from '@/ui/format';
import styles from './FolderTile.module.css';

export interface FolderTileProps {
  card: FolderCard;
  onSelect: () => void;
  onMenu?: (event: MouseEvent) => void;
}

/**
 * Folder entry point on the home surface.
 *
 * Folder depth is conveyed by the plate behind the tile — the card behind the
 * card, its bottom edge showing — the same way the count is stated in words
 * underneath; no invented iconography.
 */
export function FolderTile({ card, onSelect, onMenu }: FolderTileProps): JSX.Element {
  // The real recursive total: a tile that said "99 items" for a 3 000-item folder
  // would be lying about the one number it exists to report.
  const total = card.folder.total;
  return (
    <div
      class={styles.tile}
      onContextMenu={onMenu}
      data-folder-id={card.folder.id}
    >
      {/* The plate peeks 4px below the button and is tucked under it on the other
          three sides, so the tile reads as one card behind another. It is a
          sibling *behind* the button, not a child of it: as a positioned child it
          would paint over the tile's own text (which is static, so it loses the
          paint-order tie) and veil the label. */}
      <span class={styles.plate} aria-hidden="true" />
      <button type="button" class={styles.button} onClick={onSelect} title={card.folder.path}>
        <span class={styles.head}>
          <Icon name="folder" size={16} class={styles.icon} />
          <span class={styles.title}>{card.folder.title}</span>
        </span>
        <span class={styles.meta}>
          <span class={styles.count}>{itemCountLabel(total)}</span>
          <Icon name="chevronRight" size={14} class={styles.chevron} />
        </span>
      </button>
    </div>
  );
}

export interface FolderTileGridProps {
  cards: readonly FolderCard[];
  onSelect: (id: string) => void;
  onMenu?: (id: string, event: MouseEvent) => void;
}

export function FolderTileGrid({ cards, onSelect, onMenu }: FolderTileGridProps): JSX.Element {
  return (
    <div class={cx(styles.grid)} role="list">
      {cards.map((card) => (
        <div role="listitem" key={card.folder.id}>
          <FolderTile
            card={card}
            onSelect={() => onSelect(card.folder.id)}
            {...(onMenu ? { onMenu: (event: MouseEvent) => onMenu(card.folder.id, event) } : {})}
          />
        </div>
      ))}
    </div>
  );
}
