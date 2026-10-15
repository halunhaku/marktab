import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { indexStatus, reloadBookmarks } from '@/core/bookmarks/store';
import { recentItems } from '@/core/state/selectors';
import { clearRecentHistory } from '@/core/userdata/store';
import { t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import { EmptyState } from '@/ui/components/EmptyState';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { openManager } from '@/ui/actions/links';
import { itemCountLabel } from '@/ui/format';
import { LinkRow } from '@/ui/features/links/LinkRow';
import { openPalette } from '@/ui/state/router';
import { showToast } from '@/ui/state/toast';
import styles from './library.module.css';

/**
 * Recently opened.
 *
 * Ordered by when MarkTab opened the link — a different question from "what did I
 * bookmark recently" — so each row states the relative time and its folder, and
 * entries whose bookmark no longer exists are kept (this is history, not a
 * bookmark list). Nothing here touches the browser's bookmark tree.
 */
export function RecentView(): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const items = recentItems.value;
  const status = indexStatus.value;

  return (
    <section class={styles.view} aria-label={t('nav.recent')}>
      <SectionHeader
        level="page"
        title={t('nav.recent')}
        meta={items.length > 0 ? itemCountLabel(items.length) : undefined}
        action={
          <>
            <Button size="sm" icon="search" onClick={() => openPalette()}>
              {t('common.search')}
            </Button>
            <Button
              size="sm"
              icon="trash"
              variant="danger"
              disabled={items.length === 0}
              onClick={() => setConfirming(true)}
            >
              {t('action.clearRecent')}
            </Button>
          </>
        }
      />

      {status === 'loading' || status === 'idle' ? (
        <div class={styles.skeletonList} role="status" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height="var(--row-h)" radius="var(--radius-md)" />
          ))}
        </div>
      ) : null}

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

      {status === 'ready' && items.length === 0 ? (
        <EmptyState
          icon="history"
          title={t('recent.empty.title')}
          description={t('recent.empty.description')}
          action={
            <Button variant="secondary" icon="folder" onClick={openManager}>
              {t('settings.openManager')}
            </Button>
          }
        />
      ) : null}

      {status === 'ready' && items.length > 0 ? (
        <div class={styles.list} role="list">
          {items.map((item) => (
            <div role="listitem" key={item.url}>
              <LinkRow item={item} showPath showOpened />
            </div>
          ))}
        </div>
      ) : null}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('recent.clearTitle')}
        footer={
          <>
            <Button onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                clearRecentHistory();
                setConfirming(false);
                showToast(t('toast.recentCleared'), { tone: 'success' });
              }}
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <p class={styles.note}>{t('recent.clearBody')}</p>
      </Dialog>
    </section>
  );
}
