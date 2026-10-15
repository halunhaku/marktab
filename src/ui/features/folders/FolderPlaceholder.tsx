import type { JSX } from 'preact';
import type { Settings } from '@/core/settings/types';
import { t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import { cx } from '@/ui/components/cx';
import styles from './FolderPlaceholder.module.css';

type ViewMode = Settings['folders']['view'];

/**
 * Every non-list state a folder view can be in.
 *
 * The loading shape follows the persisted view mode so the page does not jump
 * when the index lands: rows for `list`, cards for `grid`.
 */
export type FolderPlaceholderProps =
  | { variant: 'loading'; view: ViewMode }
  | { variant: 'error'; onRetry: () => void }
  | { variant: 'empty'; onOpenManager: () => void }
  | { variant: 'emptySearch'; onClearFilter: () => void }
  | { variant: 'unknown'; onGoHome: () => void };

const SKELETON_ROWS = 6;
const SKELETON_CARDS = 8;

export function FolderPlaceholder(props: FolderPlaceholderProps): JSX.Element {
  switch (props.variant) {
    case 'loading': {
      const card = props.view === 'grid';
      const count = card ? SKELETON_CARDS : SKELETON_ROWS;
      return (
        <div
          class={cx(styles.skeleton, card && styles.skeletonGrid)}
          role="status"
          aria-label={t('common.loading')}
        >
          {Array.from({ length: count }, (_, index) => (
            <Skeleton
              key={index}
              height={card ? '88px' : 'var(--row-h)'}
              radius="var(--radius-lg)"
            />
          ))}
        </div>
      );
    }
    case 'error':
      return (
        <EmptyState
          icon="alert"
          title={t('error.bookmarks.title')}
          description={t('error.bookmarks.description')}
          action={
            <Button variant="primary" icon="refresh" onClick={props.onRetry}>
              {t('error.retry')}
            </Button>
          }
        />
      );
    case 'emptySearch':
      return (
        <EmptyState
          icon="filter"
          title={t('folders.emptySearch.title')}
          description={t('folders.emptySearch.description')}
          action={
            <Button icon="close" onClick={props.onClearFilter}>
              {t('common.clear')}
            </Button>
          }
        />
      );
    case 'unknown':
      return (
        <EmptyState
          icon="alert"
          title={t('folders.empty.title')}
          action={
            <Button icon="home" onClick={props.onGoHome}>
              {t('nav.home')}
            </Button>
          }
        />
      );
    default:
      return (
        <EmptyState
          icon="folder"
          title={t('folders.empty.title')}
          description={t('folders.empty.description')}
          action={
            <Button icon="folderMove" onClick={props.onOpenManager}>
              {t('action.openManager')}
            </Button>
          }
        />
      );
  }
}
