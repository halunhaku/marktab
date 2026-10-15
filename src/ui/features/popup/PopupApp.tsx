import type { JSX } from 'preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { openUrl } from '@/core/appearance';
import { refreshBookmarksNow } from '@/core/bookmarks/store';
import { createBookmark, readActivePage, type CurrentPage } from '@/core/platform/bookmarks';
import { getChrome, getTabsApi, runtimeUrl } from '@/core/platform/chrome';
import { settings, updateSettings } from '@/core/settings/store';
import { bootstrapState } from '@/core/state/bootstrap';
import { bookmarkByUrl, folderOptions, stats } from '@/core/state/selectors';
import { indexStatus } from '@/core/state/signals';
import type { Settings } from '@/core/settings/types';
import { hostOf } from '@/core/util/url';
import { t } from '@/locales';
import { openManager } from '@/ui/actions/links';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { Skeleton } from '@/ui/components/Skeleton';
import { SelectField, TextField } from '@/ui/components/TextField';
import { cx } from '@/ui/components/cx';
import { formatNumber } from '@/ui/format';
import styles from './PopupApp.module.css';

/**
 * Toolbar popup.
 *
 * The popup is a window, not a page: everything it shows has to be reachable
 * without a router and without the shell. That is why it renders its own
 * header, an inline status line instead of a toast (an overlay host is not
 * mounted here), and no rail.
 *
 * Two rules shape the code below:
 *  - it must work when `chrome.*` is absent (unit tests, plain web preview) and
 *    never reject into render, so every extension call is guarded;
 *  - bookmark writes go through `@/core/platform/bookmarks`, which is the only
 *    module allowed to touch the browser tree.
 */

const NEW_TAB_PAGE = 'newtab.html';

/** Cycle order for the one-click theme switch: light and dark are one step apart. */
const THEME_CYCLE: readonly Settings['theme'][] = ['system', 'light', 'dark'];
const THEME_LABEL_KEYS = {
  system: 'settings.theme.system',
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
} as const;
const THEME_ICONS = { system: 'monitor', light: 'sun', dark: 'moon' } as const;

/** The page the action was invoked on; `loading` only until the first query. */
type PageState =
  | { status: 'loading' }
  | { status: 'ready'; page: CurrentPage }
  | { status: 'blocked'; reason: 'noTab' | 'cannotBookmark' };

type AddState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'added' } | { kind: 'failed' };

function newTabUrl(): string {
  return runtimeUrl(NEW_TAB_PAGE) ?? NEW_TAB_PAGE;
}

let cachedVersion: string | null = null;

/** Manifest version, read once; empty outside an installed extension. */
function extensionVersion(): string {
  if (cachedVersion === null) {
    try {
      cachedVersion = getChrome()?.runtime?.getManifest?.().version ?? '';
    } catch {
      cachedVersion = '';
    }
  }
  return cachedVersion;
}

/** Opens the new tab page, with an optional pre-filled search query. */
function openNewTab(query = ''): void {
  const base = newTabUrl();
  openUrl(query ? `${base}?q=${encodeURIComponent(query)}` : base, 'newTab');
}

function closePopup(): void {
  try {
    window.close();
  } catch {
    /* unit tests and plain pages cannot close themselves */
  }
}

export function PopupApp(): JSX.Element {
  const query = useSignal('');
  const destination = useSignal('');
  const page = useSignal<PageState>({ status: 'loading' });
  const addition = useSignal<AddState>({ kind: 'idle' });

  // Storage migration and hydration first, then the bookmark index: the popup
  // shows skeleton stats until the index reports ready, empty or error.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await bootstrapState();
      } catch {
        /* defaults are already in place; the popup renders regardless */
      }
      if (!alive) return;
      void refreshBookmarksNow().catch(() => {
        /* reloadBookmarks reports failures through indexStatus */
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  // The active tab is only readable here: the action click granted `activeTab`
  // for exactly one tab, for as long as the popup is open.
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!getTabsApi()?.query) {
        page.value = { status: 'blocked', reason: 'noTab' };
        return;
      }
      let active: CurrentPage | null = null;
      try {
        active = await readActivePage(newTabUrl());
      } catch {
        active = null;
      }
      if (!alive) return;
      if (!active) {
        page.value = { status: 'blocked', reason: 'cannotBookmark' };
        return;
      }
      // `readActivePage` answers with the fallback URL when no tab was readable.
      if (!active.title && active.url === newTabUrl()) {
        page.value = { status: 'blocked', reason: 'noTab' };
        return;
      }
      page.value = { status: 'ready', page: active };
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = page.value;
  const saved = current.status === 'ready' ? bookmarkByUrl.value.get(current.page.url) : undefined;
  const status = indexStatus.value;
  // The index is the only source of truth for "already saved", so the action
  // stays disabled until it has answered.
  const loading = status === 'idle' || status === 'loading';

  const library = stats.value;
  const cells = [
    { label: t('nav.bookmarks'), value: library.bookmarks },
    { label: t('nav.foldersCount'), value: library.folders },
    { label: t('nav.pinned'), value: library.pinned },
    { label: t('nav.recent'), value: library.recent },
  ];

  const theme = settings.value.theme;
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length] ?? 'system';
  const themeLabel = t('action.toggleTheme', { theme: t(THEME_LABEL_KEYS[nextTheme]) });

  // Built every render: the folder list is bounded and the index is a signal.
  const destinations = [
    { value: '', label: t('popup.addToFolder') },
    ...folderOptions.value
      .filter((option) => option.depth <= 2)
      .map((option) => ({ value: option.id, label: option.path || option.label })),
  ];

  const version = extensionVersion();
  const busy = addition.value.kind === 'busy';

  function submitSearch(): void {
    openNewTab(query.value.trim());
    closePopup();
  }

  async function addCurrentPage(): Promise<void> {
    if (current.status !== 'ready' || saved || busy || loading) return;
    const title = current.page.title.trim() || hostOf(current.page.url);
    const parentId = destination.value;
    addition.value = { kind: 'busy' };
    try {
      const result = await createBookmark({
        title,
        url: current.page.url,
        ...(parentId ? { parentId } : {}),
      });
      if (!result.ok) {
        addition.value = { kind: 'failed' };
        return;
      }
      addition.value = { kind: 'added' };
      // Rebuild so the panel switches to the "already saved" state.
      void refreshBookmarksNow().catch(() => {});
    } catch {
      addition.value = { kind: 'failed' };
    }
  }

  return (
    <div class={styles.panel}>
      <header class={styles.header}>
        <span class={styles.mark} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linejoin="round"
          >
            <path d="M7 3.8h10a1 1 0 0 1 1 1v15.4l-6-3.7-6 3.7V4.8a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        <h1 class={styles.title}>MarkTab</h1>
        {version ? <span class={styles.version}>v{version}</span> : null}
      </header>

      <div class={styles.body}>
        <TextField
          label={t('popup.searchPlaceholder')}
          hideLabel
          autofocus
          value={query.value}
          placeholder={t('popup.searchPlaceholder')}
          onInput={(value) => {
            query.value = value;
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            submitSearch();
          }}
        />

        <section class={styles.stats} aria-label={t('popup.stats')}>
          {status === 'error' ? (
            <p class={styles.error}>{t('error.bookmarks.description')}</p>
          ) : loading ? (
            <div class={styles.statsGrid} aria-hidden="true">
              {[0, 1, 2, 3].map((cell) => (
                <span key={cell} class={styles.stat}>
                  <Skeleton width="4.5rem" height="0.875rem" />
                </span>
              ))}
            </div>
          ) : (
            <ul class={styles.statsGrid}>
              {cells.map((cell) => (
                <li key={cell.label} class={styles.stat}>
                  <span class={styles.statValue}>{formatNumber(cell.value)}</span>
                  <span class={styles.statLabel}>{cell.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section class={styles.card} aria-label={t('popup.addCurrent')}>
          {current.status === 'loading' ? (
            <Skeleton width="12rem" height="0.875rem" />
          ) : current.status === 'blocked' ? (
            <p class={styles.status}>
              <Icon name="info" size={14} />
              <span>
                {current.reason === 'noTab' ? t('popup.noTab') : t('popup.cannotBookmark')}
              </span>
            </p>
          ) : (
            <>
              <div class={styles.pageRow}>
                <span class={styles.pageTitle}>
                  {current.page.title.trim() || hostOf(current.page.url)}
                </span>
                <span class={styles.pageHost}>{hostOf(current.page.url)}</span>
              </div>

              {saved ? (
                <p class={styles.savedNote}>
                  <Icon name="check" size={14} />
                  <span>{saved.path || t('popup.added')}</span>
                </p>
              ) : (
                <SelectField
                  label={t('popup.addToFolder')}
                  value={destination.value}
                  options={destinations}
                  disabled={busy}
                  onChange={(value) => {
                    destination.value = value;
                  }}
                />
              )}

              <Button
                variant="primary"
                block
                icon="bookmarkPlus"
                busy={busy}
                disabled={Boolean(saved) || busy || loading}
                onClick={() => {
                  void addCurrentPage();
                }}
              >
                {t('popup.addCurrent')}
              </Button>

              {addition.value.kind === 'added' && !saved ? (
                <p class={cx(styles.status, styles.statusSuccess)} role="status">
                  <Icon name="check" size={14} />
                  <span>{t('popup.added')}</span>
                </p>
              ) : null}
              {addition.value.kind === 'failed' ? (
                <p class={cx(styles.status, styles.statusError)} role="status">
                  <Icon name="alert" size={14} />
                  <span>{t('popup.addFailed')}</span>
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>

      <footer class={styles.footer}>
        <div class={styles.footerActions}>
          <Button
            variant="ghost"
            size="sm"
            icon="arrowUpRight"
            onClick={() => {
              openNewTab();
              closePopup();
            }}
          >
            {t('popup.openNewTab')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="externalLink"
            onClick={() => {
              openManager();
              closePopup();
            }}
          >
            {t('popup.manage')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={THEME_ICONS[nextTheme]}
            title={themeLabel}
            // The visible label is part of the name (WCAG 2.5.3): the button
            // reads "Toggle theme — Switch to Dark theme", not just the target.
            aria-label={`${t('popup.themeToggle')} — ${themeLabel}`}
            onClick={() => {
              updateSettings({ theme: nextTheme });
            }}
          >
            {t('popup.themeToggle')}
          </Button>
        </div>
        <p class={styles.privacy}>
          <Icon name="shield" size={13} />
          <span>{t('popup.privacy')}</span>
        </p>
      </footer>
    </div>
  );
}
