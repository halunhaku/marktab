import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { reloadBookmarks, startBookmarkSync } from '@/core/bookmarks/store';
import { settings, updateSettings } from '@/core/settings/store';
import { bootstrapState } from '@/core/state/bootstrap';
import { folderRows, stats } from '@/core/state/selectors';
import { watchUserData } from '@/core/userdata/store';
import { t } from '@/locales';
import { IconButton } from '@/ui/components/Button';
import { MenuHost } from '@/ui/components/Menu';
import { ToastHost } from '@/ui/components/Toast';
import { cx } from '@/ui/components/cx';
import { FolderView } from '@/ui/features/folders/FolderView';
import { HomeView } from '@/ui/features/home/HomeView';
import { PinnedView } from '@/ui/features/library/PinnedView';
import { RecentView } from '@/ui/features/library/RecentView';
import { CommandPalette } from '@/ui/features/palette/CommandPalette';
import { SettingsView } from '@/ui/features/settings/SettingsView';
import { useAppearance } from '@/ui/hooks/useAppearance';
import { useMediaQuery } from '@/ui/hooks/useMediaQuery';
import { closeDialog, closeMenu, dialogState, menuState } from '@/ui/state/overlay';
import { closePalette, goHome, navigate, openPalette, paletteOpen, route } from '@/ui/state/router';
import { DialogHost } from './DialogHost';
import { Rail, type RailFolderItem, type RailNavItem } from './Rail';
import styles from './App.module.css';

/** Product name: a proper noun, so it is not translated. */
const BRAND = 'MarkTab';
/** Must match the drawer media query in `App.module.css`. */
const DRAWER_QUERY = '(max-width: 1200px)';

/**
 * Application root for the new tab page.
 *
 * Owns exactly the things that must exist once: state hydration and the
 * bookmark/storage subscriptions, the global keyboard map, the route switch, and
 * the overlay hosts. Views render inside the content column and read the core
 * signals directly, so nothing here re-renders because a view's data changed.
 */
export function App(): JSX.Element {
  useAppearance();

  const narrow = useMediaQuery(DRAWER_QUERY);
  const drawerOpen = useSignal(false);

  // Hydrate once, then keep the bookmark index and cross-tab state in sync.
  useEffect(() => {
    const stopSync = startBookmarkSync();
    const stopUserData = watchUserData();
    let cancelled = false;
    void bootstrapState()
      .then(() => {
        if (!cancelled) return reloadBookmarks();
        return undefined;
      })
      .catch(() => {
        /* storage unavailable: the views surface the error state instead */
      });
    return () => {
      cancelled = true;
      stopSync();
      stopUserData();
    };
  }, []);

  // The toolbar popup hands its query over as `?q=`, so "search" there lands in
  // the palette here. The parameter is consumed, never left behind in the URL.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get('q');
    if (!query) return;
    openPalette(query);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Global key map. Everything documented in Settings → Keyboard lives here.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        drawerOpen.value = false;
        if (paletteOpen.value) {
          closePalette();
          return;
        }
        if (menuState.value) {
          closeMenu();
          return;
        }
        if (dialogState.value) closeDialog();
        return;
      }

      if (!event.metaKey && !event.ctrlKey) return;
      const key = event.key.toLowerCase();
      const inPalette = paletteOpen.value;

      if (key === 'k') {
        event.preventDefault();
        if (inPalette) closePalette();
        else openPalette();
        return;
      }
      // Section jumps stay out of the way of the palette's own Enter/typing.
      if (inPalette) return;

      switch (key) {
        case ',':
          event.preventDefault();
          navigate({ kind: 'settings' });
          break;
        case '1':
          event.preventDefault();
          goHome();
          break;
        case '2':
          event.preventDefault();
          navigate({ kind: 'recent' });
          break;
        case '3':
          event.preventDefault();
          navigate({ kind: 'pinned' });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const current = route.value;
  const collapsed = settings.value.railCollapsed;
  const library = stats.value;
  const isDrawer = narrow.value;

  // A drawer is transient: it closes on navigation and when the window grows.
  useEffect(() => {
    drawerOpen.value = false;
  }, [narrow.value, current, drawerOpen]);

  const toggleRail = (): void => {
    if (isDrawer) {
      drawerOpen.value = !drawerOpen.value;
      return;
    }
    updateSettings({ railCollapsed: !collapsed });
  };

  const navItems: RailNavItem[] = [
    { id: 'home', label: t('nav.home'), icon: 'home', active: current.kind === 'home', onSelect: goHome },
    {
      id: 'recent',
      label: t('nav.recent'),
      icon: 'clock',
      count: library.recent,
      active: current.kind === 'recent',
      onSelect: () => navigate({ kind: 'recent' }),
    },
    {
      id: 'pinned',
      label: t('nav.pinned'),
      icon: 'pin',
      count: library.pinned,
      active: current.kind === 'pinned',
      onSelect: () => navigate({ kind: 'pinned' }),
    },
  ];

  const folderItems: RailFolderItem[] = folderRows.value.map(({ folder, depth }) => ({
    id: folder.id,
    label: folder.title || t('common.untitled'),
    depth,
    count: folder.total,
    active: current.kind === 'folder' && current.id === folder.id,
    onSelect: () => navigate({ kind: 'folder', id: folder.id }),
  }));

  const footer = (
    <div class={styles.footer}>
      <p class={styles.footerStats}>
        <span class={styles.stat}>
          <b class={styles.statValue}>{library.visibleBookmarks}</b>
          <span class={styles.statLabel}>{t('nav.bookmarks')}</span>
        </span>
        <span class={styles.stat}>
          <b class={styles.statValue}>{library.visibleFolders}</b>
          <span class={styles.statLabel}>{t('nav.foldersCount')}</span>
        </span>
      </p>
      <IconButton
        icon="sliders"
        label={t('nav.settings')}
        title={t('nav.settings')}
        variant="ghost"
        size="sm"
        active={current.kind === 'settings'}
        onClick={() => navigate({ kind: 'settings' })}
      />
    </div>
  );

  return (
    <div
      class={cx(
        styles.shell,
        collapsed && !isDrawer && styles.railCollapsed,
        isDrawer && drawerOpen.value && styles.drawerOpen,
      )}
    >
      <a class={styles.skip} href="#marktab-content">
        {t('a11y.skipToContent')}
      </a>

      {isDrawer && drawerOpen.value ? (
        <div class={styles.scrim} aria-hidden="true" onClick={() => (drawerOpen.value = false)} />
      ) : null}

      <div class={styles.railSlot}>
        <Rail
          collapsed={collapsed && !isDrawer}
          navItems={navItems}
          folderItems={folderItems}
          foldersLabel={t('nav.folders')}
          footer={footer}
          brandLabel={BRAND}
          tagline={t('app.tagline')}
          onHome={goHome}
          onToggleCollapsed={toggleRail}
          collapseLabel={t('nav.collapse')}
          expandLabel={t('nav.expand')}
          navLabel={t('a11y.mainNav')}
          foldersListLabel={t('a11y.folders')}
        />
      </div>

      {isDrawer ? (
        <IconButton
          class={styles.drawerToggle}
          icon="panelLeft"
          label={t('nav.expand')}
          title={t('nav.expand')}
          variant="secondary"
          onClick={() => (drawerOpen.value = true)}
        />
      ) : null}

      <main class={styles.content} id="marktab-content" tabIndex={-1}>
        <div class={styles.inner}>
          {current.kind === 'recent' ? (
            <RecentView />
          ) : current.kind === 'pinned' ? (
            <PinnedView />
          ) : current.kind === 'settings' ? (
            <SettingsView />
          ) : current.kind === 'folder' ? (
            <FolderView folderId={current.id} />
          ) : (
            <HomeView />
          )}
        </div>
      </main>

      <CommandPalette />
      <MenuHost />
      <DialogHost />
      <ToastHost />
    </div>
  );
}
