import type { JSX } from 'preact';
import { indexStatus, reloadBookmarks } from '@/core/bookmarks/store';
import { settings } from '@/core/settings/store';
import { pinnedItems, pinnedPreview, recentItems, recentPreview, rootFolderCards } from '@/core/state/selectors';
import { clockReading, greetingFor } from '@/core/util/time';
import { currentLocale, localeTag, t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { CardGrid } from '@/ui/components/CardGrid';
import { EmptyState } from '@/ui/components/EmptyState';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { openFolderMenu } from '@/ui/actions/folders';
import { openManager } from '@/ui/actions/links';
import { LinkCard } from '@/ui/features/links/LinkCard';
import { itemCountLabel } from '@/ui/format';
import { useNow } from '@/ui/hooks/useNow';
import { navigate, openPalette } from '@/ui/state/router';
import { onboardingDismissed } from '@/ui/state/onboarding';
import { FolderTileGrid } from './FolderTile';
import { HomeEmpty, HomeSkeleton, Hero } from './Hero';
import { Onboarding } from './Onboarding';
import { dayProgress } from './daylight';
import styles from './HomeView.module.css';

/** Pinned and recent rows stay one row tall; the full views handle volume. */
const HOME_ROW_LIMIT = 12;
/** Folder tiles shown on home before the user is sent to the rail or manager. */
const HOME_FOLDER_LIMIT = 12;

/**
 * Home surface.
 *
 * Ordered by how often it is used: what the user pinned themselves, then what they
 * opened most recently, then the folder map. Each row is capped so home never
 * becomes a second, worse folder browser — "View all" leads to the view built for
 * that volume.
 */
export function HomeView(): JSX.Element {
  const home = settings.value.home;
  const now = useNow(home.showClock);
  const reading = clockReading(now, localeTag(currentLocale.value));
  const pinned = pinnedPreview.value.slice(0, HOME_ROW_LIMIT);
  const recent = recentPreview.value.slice(0, HOME_ROW_LIMIT);
  const folderCards = rootFolderCards.value;
  const status = indexStatus.value;
  const showOnboarding =
    status === 'ready' &&
    !onboardingDismissed.value &&
    pinnedItems.value.length === 0 &&
    recentItems.value.length === 0;

  return (
    <section class={styles.home} aria-labelledby="home-greeting">
      <Hero
        greeting={t(`home.greeting.${greetingFor(now)}`)}
        tagline={t('app.tagline')}
        date={reading.date}
        time={reading.time}
        dayProgress={dayProgress(now)}
        showClock={home.showClock}
        clockLabel={t('a11y.clock')}
        searchLabel={t('search.placeholder')}
        searchShortcut="Mod+K"
        onSearch={() => openPalette()}
      />

      {status === 'loading' || status === 'idle' ? <HomeSkeleton rows={2} /> : null}

      {status === 'error' ? (
        <EmptyState
          icon="alert"
          title={t('error.bookmarks.title')}
          description={t('error.bookmarks.description')}
          action={
            <Button variant="primary" icon="refresh" onClick={() => void reloadBookmarks()}>
              {t('error.retry')}
            </Button>
          }
        />
      ) : null}

      {status === 'empty' ? (
        <HomeEmpty
          title={t('folders.empty.title')}
          description={t('folders.empty.description')}
          actionLabel={t('settings.openManager')}
          onAction={openManager}
        />
      ) : null}

      {showOnboarding ? <Onboarding onDismiss={() => undefined} /> : null}

      {status === 'ready' && home.showPinned ? (
        <div class={styles.section}>
          <SectionHeader
            title={t('home.section.pinned')}
            meta={pinnedItems.value.length > 0 ? itemCountLabel(pinnedItems.value.length) : undefined}
            action={
              pinnedItems.value.length > HOME_ROW_LIMIT ? (
                <Button size="sm" variant="ghost" onClick={() => navigate({ kind: 'pinned' })}>
                  {t('home.viewAll')}
                </Button>
              ) : undefined
            }
          />
          {pinned.length === 0 ? (
            <EmptyState
              size="inline"
              icon="pin"
              title={t('home.empty.pinned.title')}
              description={t('home.empty.pinned.description')}
            />
          ) : (
            <CardGrid>
              {pinned.map((item) => (
                <LinkCard key={item.url} item={item} showHost={false} />
              ))}
            </CardGrid>
          )}
        </div>
      ) : null}

      {status === 'ready' && home.showRecent ? (
        <div class={styles.section}>
          <SectionHeader
            title={t('home.section.recent')}
            meta={recentItems.value.length > 0 ? itemCountLabel(recentItems.value.length) : undefined}
            action={
              recentItems.value.length > HOME_ROW_LIMIT ? (
                <Button size="sm" variant="ghost" onClick={() => navigate({ kind: 'recent' })}>
                  {t('home.viewAll')}
                </Button>
              ) : undefined
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              size="inline"
              icon="history"
              title={t('home.empty.recent.title')}
              description={t('home.empty.recent.description')}
            />
          ) : (
            <CardGrid>
              {recent.map((item) => (
                <LinkCard key={item.url} item={item} />
              ))}
            </CardGrid>
          )}
        </div>
      ) : null}

      {status === 'ready' && home.showFolders ? (
        <div class={styles.section}>
          <SectionHeader
            title={t('home.section.folders')}
            meta={folderCards.length > 0 ? itemCountLabel(folderCards.length) : undefined}
            action={
              <Button size="sm" variant="ghost" icon="folder" onClick={openManager}>
                {t('settings.openManager')}
              </Button>
            }
          />
          {folderCards.length === 0 ? (
            <p class={styles.muted}>{t('folders.empty.description')}</p>
          ) : (
            <FolderTileGrid
              cards={folderCards.slice(0, HOME_FOLDER_LIMIT)}
              onSelect={(id) => navigate({ kind: 'folder', id })}
              onMenu={(id, event) => {
                const card = folderCards.find((candidate) => candidate.folder.id === id);
                if (!card) return;
                event.preventDefault();
                openFolderMenu(event.currentTarget, card.folder, {
                  onOpen: () => navigate({ kind: 'folder', id }),
                });
              }}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
