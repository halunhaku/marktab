import { useEffect, useRef } from 'preact/hooks';
import { useComputed, useSignal } from '@preact/signals';
import type { JSX } from 'preact';
import { openUrl, prefersDark, prefersReducedMotion, resolveAppearance } from '@/core/appearance';
import { highlightRanges, searchIndex, type BookmarkHit } from '@/core/bookmarks/search';
import { settings, updateSettings } from '@/core/settings/store';
import type { ThemeMode } from '@/core/settings/types';
import { bookmarkIndex, searchWeights } from '@/core/state/signals';
import {
  entryToLinkItem,
  hiddenFolderSet,
  linkContext,
  pinnedPreview,
  recentPreview,
  type LinkContext,
  type LinkItem,
} from '@/core/state/selectors';
import { clearRecentHistory } from '@/core/userdata/store';
import { buildSearchUrl, hostOf, looksLikeUrl, normalizeInputToUrl } from '@/core/util/url';
import { t, tCount } from '@/locales';
import { copyLink, openLink, openManager, openMenuFromPoint, togglePin } from '@/ui/actions/links';
import { IconButton } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Kbd } from '@/ui/components/Kbd';
import { formatNumber } from '@/ui/format';
import { useOverlayMotion } from '@/ui/hooks/useOverlayMotion';
import { openDialog } from '@/ui/state/overlay';
import { closePalette, navigate, paletteInitialQuery, paletteOpen } from '@/ui/state/router';
import { showToast } from '@/ui/state/toast';
import {
  PALETTE_LIST_ID,
  PaletteSections,
  resolveActiveKey,
  rowId,
  type PaletteActionRow,
  type PaletteRow,
  type PaletteSection,
} from './rows';
import styles from './palette.module.css';

/**
 * Command palette.
 *
 * One field over bookmarks, folders, navigation and commands, plus the two
 * "leave MarkTab" rows: the destination typed into the field and the web search
 * for it. Rows are derived from signals inside a computed, so typing recomputes
 * the list instead of remounting it; the query itself stays local to the open
 * palette and is reset on the next open.
 */
export function CommandPalette(): JSX.Element | null {
  if (!paletteOpen.value) return null;
  return <PalettePanel />;
}

interface PaletteModel {
  sections: PaletteSection[];
  /** Every navigable row, in visual order. */
  rows: PaletteRow[];
  /** Rows offered as a result: everything except the always-present web search. */
  count: number;
  /** Query is empty, so the palette offers suggestions instead of matches. */
  idle: boolean;
  /** Query matched nothing but the web search. */
  empty: boolean;
}

/** How many recently opened / pinned bookmarks an idle palette offers. */
const PREVIEW_CAP = 5;

/* ---- actions ----------------------------------------------------------- */

const COMMANDS: readonly string[] = ['settings', 'theme', 'manager', 'clearRecent'];
const NAVIGATION: readonly string[] = ['home', 'recent', 'pinned'];
const BROWSE: readonly string[] = ['home', 'recent', 'pinned', 'settings'];

interface ActionSpec {
  id: string;
  icon: IconName;
  label: string;
  run: () => void;
}

function actionSpec(id: string): ActionSpec {
  switch (id) {
    case 'theme': {
      const resolved = resolveAppearance(settings.value, prefersDark(), prefersReducedMotion()).theme;
      const next: ThemeMode = resolved === 'dark' ? 'light' : 'dark';
      return {
        id,
        icon: next === 'dark' ? 'moon' : 'sun',
        label: t('action.toggleTheme', {
          theme: t(next === 'dark' ? 'settings.theme.dark' : 'settings.theme.light'),
        }),
        run: () => updateSettings({ theme: next }),
      };
    }
    case 'manager':
      return {
        id,
        icon: 'externalLink',
        label: t('action.openManager'),
        run: () => {
          closePalette();
          openManager();
        },
      };
    case 'clearRecent':
      return {
        id,
        icon: 'trash',
        label: t('action.clearRecent'),
        run: () => {
          clearRecentHistory();
          showToast(t('toast.dataCleared'));
        },
      };
    case 'home':
      return { id, icon: 'home', label: t('nav.home'), run: () => navigate({ kind: 'home' }) };
    case 'recent':
      return { id, icon: 'clock', label: t('nav.recent'), run: () => navigate({ kind: 'recent' }) };
    case 'pinned':
      return { id, icon: 'pin', label: t('nav.pinned'), run: () => navigate({ kind: 'pinned' }) };
    default:
      return {
        id,
        icon: 'sliders',
        label: t('action.openSettings'),
        run: () => navigate({ kind: 'settings' }),
      };
  }
}

function actionRows(sectionKey: string, ids: readonly string[]): PaletteActionRow[] {
  return ids.map((id) => {
    const spec = actionSpec(id);
    return { kind: 'action', key: `${sectionKey}:${spec.id}`, icon: spec.icon, label: spec.label, run: spec.run };
  });
}

/* ---- row builders ------------------------------------------------------ */

function previewRow(sectionKey: string, item: LinkItem): PaletteRow {
  return { kind: 'bookmark', key: `${sectionKey}:${item.url}`, item, title: [], path: [] };
}

function bookmarkRow(hit: BookmarkHit, tokens: readonly string[], context: LinkContext): PaletteRow {
  const item = entryToLinkItem(hit.entry, context);
  return {
    kind: 'bookmark',
    key: `hits:${hit.entry.id}`,
    item,
    title: highlightRanges(item.title, tokens),
    path: highlightRanges(item.path, tokens),
  };
}

function labelMatches(label: string, tokens: readonly string[]): boolean {
  const hay = label.toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

/**
 * Follows a row to its destination.
 *
 * Bookmarks honour "always open results in a new tab" (or a forced Shift+Enter);
 * a typed destination follows the same preference, while the web search always
 * leaves the new tab page in place.
 */
function activateRow(row: PaletteRow, forceNewTab = false): void {
  switch (row.kind) {
    case 'bookmark': {
      const newTab = forceNewTab || settings.value.search.openInNewTab;
      closePalette();
      openLink(row.item, newTab ? 'newTab' : 'current');
      return;
    }
    case 'folder':
      navigate({ kind: 'folder', id: row.folder.id });
      return;
    case 'action':
      row.run();
      return;
    case 'url':
      closePalette();
      openUrl(row.url, settings.value.search.openInNewTab ? 'newTab' : 'current');
      return;
    case 'web':
      closePalette();
      openUrl(row.url, 'newTab');
  }
}

/** Mod+Enter: the query leaves for the configured search engine, whatever is selected. */
function runWebSearch(rawQuery: string): void {
  const trimmed = rawQuery.trim();
  if (trimmed.length === 0) return;
  const search = settings.value.search;
  const url = buildSearchUrl(trimmed, search.engine, search.customTemplate);
  closePalette();
  openUrl(url, 'newTab');
}

function buildModel(query: string): PaletteModel {
  const trimmed = query.trim();
  const sections: PaletteSection[] = [];

  if (trimmed.length === 0) {
    const recent = recentPreview.value.slice(0, PREVIEW_CAP);
    const pinned = pinnedPreview.value.slice(0, PREVIEW_CAP);
    if (recent.length > 0) {
      sections.push({
        key: 'recent',
        title: t('search.section.recent'),
        rows: recent.map((item) => previewRow('recent', item)),
      });
    }
    if (pinned.length > 0) {
      sections.push({
        key: 'pinned',
        title: t('search.section.pinned'),
        rows: pinned.map((item) => previewRow('pinned', item)),
      });
    }
    sections.push({ key: 'browse', title: t('search.section.browse'), rows: actionRows('browse', BROWSE) });
    sections.push({ key: 'commands', title: t('search.section.actions'), rows: actionRows('commands', COMMANDS) });
  } else {
    const search = settings.value.search;
    const results = searchIndex(bookmarkIndex.value, trimmed, {
      limit: 40,
      folderLimit: 8,
      weights: searchWeights.value,
      excludeFolders: hiddenFolderSet.value,
    });
    const context = linkContext.value;

    if (looksLikeUrl(trimmed)) {
      const url = normalizeInputToUrl(trimmed);
      sections.push({
        key: 'url',
        title: '',
        rows: [{ kind: 'url', key: 'url', url, host: hostOf(url) || url, label: t('search.openUrl', { url }) }],
      });
    }

    if (results.bookmarks.length > 0) {
      sections.push({
        key: 'hits',
        title: t('search.section.bookmarks'),
        meta:
          results.totalBookmarks > results.bookmarks.length
            ? t('search.limitHint', { count: results.bookmarks.length, total: results.totalBookmarks })
            : undefined,
        rows: results.bookmarks.map((hit) => bookmarkRow(hit, results.tokens, context)),
      });
    }

    if (results.folders.length > 0) {
      sections.push({
        key: 'folders',
        title: t('search.section.folders'),
        rows: results.folders.map((hit) => ({
          kind: 'folder',
          key: `folders:${hit.folder.id}`,
          folder: hit.folder,
          title: highlightRanges(hit.folder.title, results.tokens),
        })),
      });
    }

    const actions = [...actionRows('commands', COMMANDS), ...actionRows('nav', NAVIGATION)].filter((row) =>
      labelMatches(row.label, results.tokens),
    );
    if (actions.length > 0) {
      sections.push({ key: 'actions', title: t('search.section.actions'), rows: actions });
    }

    const url = buildSearchUrl(trimmed, search.engine, search.customTemplate);
    sections.push({
      key: 'web',
      title: '',
      rows: [{ kind: 'web', key: 'web', url, host: hostOf(url) || url, label: t('search.webFor', { query: trimmed }) }],
    });
  }

  const rows = sections.flatMap((section) => section.rows);
  const count = rows.filter((row) => row.kind !== 'web').length;
  return { sections, rows, count, idle: trimmed.length === 0, empty: trimmed.length > 0 && count === 0 };
}

/* ---- panel ------------------------------------------------------------- */

function PalettePanel(): JSX.Element {
  const query = useSignal(paletteInitialQuery());
  const selection = useSignal<string | null>(null);
  /**
   * Single-letter shortcuts (P / R / M from the bookmark menu) are armed only by
   * deliberate keyboard navigation of the list. Typing therefore never fires
   * them — a query may contain p, r or m — and a row sliding under a resting
   * pointer cannot arm them either.
   */
  const armed = useSignal(false);
  const input = useRef<HTMLInputElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  useOverlayMotion(panel, root);

  const model = useComputed<PaletteModel>(() => buildModel(query.value));
  const { sections, rows, count, idle, empty } = model.value;
  const activeKey = resolveActiveKey(selection.value, rows);

  useEffect(() => {
    document.body.dataset['scrollLocked'] = 'true';
    const field = input.current;
    if (field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
    return () => {
      delete document.body.dataset['scrollLocked'];
    };
  }, []);

  useEffect(() => {
    if (activeKey === null) return;
    document.getElementById(rowId(activeKey))?.scrollIntoView({ block: 'nearest' });
  }, [activeKey, rows]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const list = model.value.rows;
      const key = resolveActiveKey(selection.value, list);
      const index = key === null ? -1 : list.findIndex((row) => row.key === key);
      const current = index >= 0 ? list.at(index) : undefined;
      const mod = event.metaKey || event.ctrlKey;
      const inside = panel.current !== null && event.target instanceof Node && panel.current.contains(event.target);

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (query.value.length > 0) {
          query.value = '';
          selection.value = null;
          armed.value = false;
        } else {
          closePalette();
        }
        return;
      }

      if (!inside) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (list.length === 0) return;
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        selection.value = list.at(index < 0 ? 0 : (index + step + list.length) % list.length)?.key ?? null;
        armed.value = true;
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        if (list.length === 0) return;
        event.preventDefault();
        selection.value = (event.key === 'Home' ? list.at(0) : list.at(-1))?.key ?? null;
        armed.value = true;
        return;
      }

      if (event.key === 'Enter') {
        if (mod) {
          event.preventDefault();
          runWebSearch(query.value);
          return;
        }
        if (!current) return;
        event.preventDefault();
        activateRow(current, event.shiftKey);
        return;
      }

      if (mod && event.key.toLowerCase() === 'c') {
        if (current?.kind !== 'bookmark') return;
        event.preventDefault();
        void copyLink(current.item.url);
        return;
      }

      if (mod || event.shiftKey || event.altKey || !armed.value) return;

      const letter = event.key.toLowerCase();
      if (current?.kind !== 'bookmark' || (letter !== 'p' && letter !== 'r' && letter !== 'm')) return;
      event.preventDefault();
      if (letter === 'p') {
        togglePin(current.item);
        return;
      }
      closePalette();
      if (letter === 'r') {
        openDialog({ kind: 'rename', target: current.item });
        return;
      }
      openDialog({ kind: 'move', target: current.item });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [model, query, selection, armed]);

  const handleHover = (rowKey: string): void => {
    selection.value = rowKey;
  };

  const handleActivate = (row: PaletteRow): void => activateRow(row);

  const handleContextMenu = (row: PaletteRow, event: MouseEvent): void => {
    if (row.kind !== 'bookmark') return;
    // The palette sits above the menu layer, so it steps aside for the menu.
    closePalette();
    openMenuFromPoint(row.item, event);
  };

  return (
    <div
      class={styles.root}
      ref={root}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePalette();
      }}
    >
      <div
        class={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('a11y.search')}
        ref={panel}
        onMouseDown={(event) => {
          // Keep the caret in the field when a row or a section is clicked.
          if (event.target !== input.current) event.preventDefault();
        }}
      >
        <div class={styles.header}>
          <Icon name="search" size={18} class={styles.fieldIcon} />
          <input
            ref={input}
            id="palette-query"
            class={styles.input}
            type="text"
            value={query.value}
            placeholder={t('search.placeholder')}
            autocomplete="off"
            spellcheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls={PALETTE_LIST_ID}
            aria-autocomplete="list"
            aria-label={t('a11y.search')}
            aria-activedescendant={activeKey === null ? undefined : rowId(activeKey)}
            onInput={(event) => {
              query.value = event.currentTarget.value;
              armed.value = false;
            }}
            onKeyDown={undefined}
          />
          <IconButton icon="close" label={t('common.close')} size="sm" onClick={closePalette} />
        </div>

        <div class={styles.meta}>
          <p class={styles.count} aria-live="polite">
            {idle ? '' : tCount('search.resultsCount', count, { count: formatNumber(count) })}
          </p>
        </div>

        <div class={styles.results}>
          {idle ? (
            <EmptyState
              class={styles.idle}
              size="inline"
              icon="command"
              title={t('search.idle.title')}
              description={t('search.idle.description')}
            />
          ) : null}
          {empty ? (
            <EmptyState
              class={styles.idle}
              size="inline"
              icon="search"
              title={t('search.empty.title', { query: query.value.trim() })}
              description={t('search.empty.description')}
            />
          ) : null}
          <div id={PALETTE_LIST_ID} role="listbox" aria-label={t('a11y.results')}>
            <PaletteSections
              sections={sections}
              activeKey={activeKey}
              showFavicons={settings.value.search.showFavicons}
              onHover={handleHover}
              onActivate={handleActivate}
              onContextMenu={handleContextMenu}
            />
          </div>
        </div>

        <footer class={styles.footer}>
          <span class={styles.hint}>
            <Kbd shortcut="Enter" />
            {t('search.hint.open')}
          </span>
          <span class={styles.hint}>
            <Kbd shortcut="Shift+Enter" />
            {t('search.hint.newTab')}
          </span>
          <span class={styles.hint}>
            <Kbd shortcut="Mod+Enter" />
            {t('search.hint.web')}
          </span>
          <span class={styles.hint}>
            <Kbd shortcut="ArrowUp+ArrowDown" />
            {t('search.hint.move')}
          </span>
          <span class={styles.hint}>
            <Kbd shortcut="Escape" />
            {t('search.hint.close')}
          </span>
        </footer>
      </div>
    </div>
  );
}
