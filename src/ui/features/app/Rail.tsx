import type { JSX } from 'preact';
import { Icon, type IconName } from '@/ui/components/Icon';
import { cx } from '@/ui/components/cx';
import styles from './Rail.module.css';

export interface RailNavItem {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
  active: boolean;
  onSelect: () => void;
}

export interface RailFolderItem {
  id: string;
  label: string;
  depth: number;
  count: number;
  active: boolean;
  onSelect: () => void;
}

export interface RailProps {
  collapsed: boolean;
  navItems: readonly RailNavItem[];
  folderItems: readonly RailFolderItem[];
  /** Group label rendered above the folder tree. */
  foldersLabel: string;
  /** Footer content: library counts and secondary actions. */
  footer: JSX.Element;
  brandLabel: string;
  tagline: string;
  onHome: () => void;
  onToggleCollapsed: () => void;
  collapseLabel: string;
  expandLabel: string;
  navLabel: string;
  foldersListLabel: string;
}

/**
 * Left navigation rail.
 *
 * The rail is the only always-visible navigation surface, so it holds the whole
 * map of the library: the three library views plus the real folder tree, indented
 * by depth. It collapses to icons (persisted in settings) and becomes an overlay
 * drawer below 1200px, where the content area shows a floating toggle instead.
 */
export function Rail({
  collapsed,
  navItems,
  folderItems,
  foldersLabel,
  footer,
  brandLabel,
  tagline,
  onHome,
  onToggleCollapsed,
  collapseLabel,
  expandLabel,
  navLabel,
  foldersListLabel,
}: RailProps): JSX.Element {
  return (
    <aside class={cx(styles.rail, collapsed && styles.collapsed)} aria-label={navLabel}>
      <div class={styles.top}>
        <button type="button" class={styles.brand} onClick={onHome} title={brandLabel}>
          <span class={styles.mark} aria-hidden="true">
            <span class={styles.markCore} />
          </span>
          <span class={styles.brandCopy}>
            <span class={styles.brandName}>{brandLabel}</span>
            <span class={styles.tagline}>{tagline}</span>
          </span>
        </button>
        <button
          type="button"
          class={styles.collapse}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? expandLabel : collapseLabel}
          title={collapsed ? expandLabel : collapseLabel}
        >
          <Icon name="panelLeft" size={16} />
        </button>
      </div>

      <nav class={styles.nav} aria-label={navLabel}>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            class={cx(styles.item, item.active && styles.active)}
            onClick={item.onSelect}
            aria-current={item.active ? 'page' : undefined}
            title={item.count === undefined ? item.label : `${item.label} · ${item.count}`}
          >
            <Icon name={item.icon} size={17} />
            <span class={styles.itemLabel}>{item.label}</span>
            {item.count === undefined ? null : (
              <span class={styles.count} aria-hidden="true">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div class={styles.tree}>
        <p class={styles.treeLabel} id="rail-folders-label">
          {foldersLabel}
        </p>
        <div class={styles.treeScroll} role="list" aria-labelledby="rail-folders-label" aria-label={foldersListLabel}>
          {folderItems.map((folder) => (
            <div role="listitem" key={folder.id}>
              <button
                type="button"
                class={cx(styles.folder, folder.active && styles.active)}
                style={{ paddingInlineStart: `${10 + Math.min(folder.depth, 5) * 12}px` }}
                onClick={folder.onSelect}
                aria-current={folder.active ? 'page' : undefined}
                title={`${folder.label} · ${folder.count}`}
              >
                <Icon name="folder" size={15} class={styles.folderIcon} />
                <span class={styles.folderLabel}>{folder.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div class={styles.footer}>{footer}</div>
    </aside>
  );
}
