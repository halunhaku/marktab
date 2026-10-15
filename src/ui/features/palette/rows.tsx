import type { JSX } from 'preact';
import type { HighlightRange } from '@/core/bookmarks/search';
import type { FolderEntry } from '@/core/bookmarks/types';
import type { LinkItem } from '@/core/state/selectors';
import { Favicon } from '@/ui/components/Favicon';
import { Icon, type IconName } from '@/ui/components/Icon';
import { cx } from '@/ui/components/cx';
import { t } from '@/locales';
import styles from './palette.module.css';

/**
 * Row model for the command palette.
 *
 * Rows are plain data: the palette builds them from signals inside a computed, so
 * a keystroke recomputes the list without touching component state and Preact can
 * reconcile by `key` instead of remounting. Every row carries the stable key that
 * the flattened list, `aria-activedescendant` and the DOM id share.
 */
export type PaletteRow =
  | {
      kind: 'bookmark';
      key: string;
      item: LinkItem;
      /** Title ranges matched by the query, for inline emphasis. */
      title: readonly HighlightRange[];
      /** Folder-path ranges matched by the query. */
      path: readonly HighlightRange[];
    }
  | { kind: 'folder'; key: string; folder: FolderEntry; title: readonly HighlightRange[] }
  | { kind: 'action'; key: string; icon: IconName; label: string; run: () => void }
  | { kind: 'url'; key: string; url: string; host: string; label: string }
  | { kind: 'web'; key: string; url: string; host: string; label: string };

/** The command variant of a row, so action builders keep their payload typed. */
export type PaletteActionRow = Extract<PaletteRow, { kind: 'action' }>;

export interface PaletteSection {
  key: string;
  /** Section heading; empty for the single-row URL / web offers. */
  title: string;
  /** Right-aligned meta for the heading, e.g. the "showing the top 40 of 812" hint. */
  meta?: string;
  rows: PaletteRow[];
}

export const PALETTE_LIST_ID = 'palette-listbox';

/** DOM id of one row, shared by `aria-activedescendant` and the scroller. */
export function rowId(rowKey: string): string {
  return `palette-row-${rowKey.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}

/**
 * Selection is stored as a row key rather than an index.
 *
 * Rows churn on every keystroke and on every pin or visit; a key survives that,
 * so the palette never highlights a row the user did not choose.
 */
export function resolveActiveKey(selected: string | null, rows: readonly PaletteRow[]): string | null {
  if (selected !== null && rows.some((row) => row.key === selected)) return selected;
  return rows.at(0)?.key ?? null;
}

function Emphasised({ text, ranges }: { text: string; ranges: readonly HighlightRange[] }): JSX.Element {
  if (ranges.length === 0) return <>{text}</>;
  const parts: JSX.Element[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) parts.push(<span key={`plain-${cursor}`}>{text.slice(cursor, range.start)}</span>);
    parts.push(
      <mark key={`match-${range.start}`} class={styles.mark}>
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) parts.push(<span key={`plain-${cursor}`}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

export interface PaletteRowProps {
  row: PaletteRow;
  active: boolean;
  showFavicons: boolean;
  onHover: (key: string) => void;
  onActivate: (row: PaletteRow) => void;
  onContextMenu: (row: PaletteRow, event: MouseEvent) => void;
}

/** One navigable line. Options never take focus: the query field keeps it and points here. */
function PaletteRowItem({
  row,
  active,
  showFavicons,
  onHover,
  onActivate,
  onContextMenu,
}: PaletteRowProps): JSX.Element {
  const host = row.kind === 'bookmark' ? row.item.host : row.kind === 'url' || row.kind === 'web' ? row.host : '';

  return (
    <div
      id={rowId(row.key)}
      role="option"
      aria-selected={active}
      data-kind={row.kind}
      data-url={row.kind === 'bookmark' ? row.item.url : undefined}
      class={cx(styles.row, active && styles.active)}
      onMouseEnter={() => onHover(row.key)}
      onClick={() => onActivate(row)}
      onContextMenu={row.kind === 'bookmark' ? (event: MouseEvent) => onContextMenu(row, event) : undefined}
    >
      {row.kind === 'bookmark' ? (
        <>
          <Favicon url={row.item.url} title={row.item.title} size={18} enabled={showFavicons} />
          <span class={styles.title}>
            <Emphasised text={row.item.title} ranges={row.title} />
          </span>
          <span class={styles.trailing}>
            {row.item.path ? (
              <span class={styles.path}>
                <Emphasised text={row.item.path} ranges={row.path} />
              </span>
            ) : null}
            {host ? <span class={styles.host}>{host}</span> : null}
            {row.item.pinned ? (
              <span class={styles.pin}>
                <Icon name="pinFilled" size={13} />
                <span class="visually-hidden">{t('item.pinned')}</span>
              </span>
            ) : null}
          </span>
        </>
      ) : null}

      {row.kind === 'folder' ? (
        <>
          <Icon name="folder" size={16} class={styles.rowIcon} />
          <span class={styles.title}>
            <Emphasised text={row.folder.title} ranges={row.title} />
          </span>
          <span class={styles.trailing}>
            <span class={styles.path}>{row.folder.path}</span>
          </span>
        </>
      ) : null}

      {row.kind === 'action' ? (
        <>
          <Icon name={row.icon} size={16} class={styles.rowIcon} />
          <span class={styles.title}>{row.label}</span>
        </>
      ) : null}

      {row.kind === 'url' || row.kind === 'web' ? (
        <>
          <Icon name={row.kind === 'web' ? 'globe' : 'arrowUpRight'} size={16} class={styles.rowIcon} />
          <span class={styles.title}>{row.label}</span>
          {host ? (
            <span class={styles.trailing}>
              <span class={styles.host}>{host}</span>
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export interface PaletteSectionsProps {
  sections: readonly PaletteSection[];
  activeKey: string | null;
  showFavicons: boolean;
  onHover: (key: string) => void;
  onActivate: (row: PaletteRow) => void;
  onContextMenu: (row: PaletteRow, event: MouseEvent) => void;
}

/** Renders every section, in order, as labelled groups inside the listbox. */
export function PaletteSections({
  sections,
  activeKey,
  showFavicons,
  onHover,
  onActivate,
  onContextMenu,
}: PaletteSectionsProps): JSX.Element {
  return (
    <>
      {sections.map((section) => (
        <div
          key={section.key}
          class={styles.group}
          role={section.title ? 'group' : undefined}
          aria-label={section.title || undefined}
        >
          {section.title ? (
            <div class={styles.groupTitle} aria-hidden="true">
              {section.title}
              {section.meta ? <span class={styles.groupMeta}>{section.meta}</span> : null}
            </div>
          ) : null}
          {section.rows.map((row) => (
            <PaletteRowItem
              key={row.key}
              row={row}
              active={row.key === activeKey}
              showFavicons={showFavicons}
              onHover={onHover}
              onActivate={onActivate}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      ))}
    </>
  );
}
