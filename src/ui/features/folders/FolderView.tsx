import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import { childFoldersOf, bookmarksInFolder } from '@/core/bookmarks';
import { ROOT_PARENT_ID, type BookmarkEntry } from '@/core/bookmarks/types';
import { reloadBookmarks } from '@/core/bookmarks/store';
import { updateSettings } from '@/core/settings/store';
import type { Settings } from '@/core/settings/types';
import { bookmarkIndex, indexStatus, settings } from '@/core/state/signals';
import { breadcrumbFor, entryToLinkItem, linkContext } from '@/core/state/selectors';
import { tokenize } from '@/core/util/fuzzy';
import { t } from '@/locales';
import { openManager } from '@/ui/actions/links';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { LinkGrid } from '@/ui/features/links/LinkGrid';
import { LinkList } from '@/ui/features/links/LinkList';
import { itemCountLabel } from '@/ui/format';
import { folderFilter, goHome, navigate, route } from '@/ui/state/router';
import { showToast } from '@/ui/state/toast';
import { FolderBreadcrumb } from './FolderBreadcrumb';
import { FolderChips } from './FolderChips';
import { FolderPlaceholder } from './FolderPlaceholder';
import { FolderToolbar } from './FolderToolbar';
import styles from './FolderView.module.css';

type SortMode = Settings['folders']['sort'];
type ViewMode = Settings['folders']['view'];

export interface FolderViewProps {
  /**
   * Browser folder id. The empty string (or the browser's synthetic root id)
   * renders the root-less "All bookmarks" surface: every bookmark, top-level
   * subfolders, and no visibility toggle because there is nothing to hide.
   */
  folderId: string;
}

/** Every token must appear somewhere in the combined title/url/host haystack. */
function matchesFilter(entry: BookmarkEntry, tokens: readonly string[]): boolean {
  const haystack = `${entry.sTitle} ${entry.sUrl} ${entry.sHost}`;
  return tokens.every((token) => haystack.includes(token));
}

function hideFolder(folderId: string): void {
  const hidden = settings.value.folders.hiddenIds;
  if (!hidden.includes(folderId)) {
    updateSettings({ folders: { hiddenIds: [...hidden, folderId] } });
  }
  showToast(t('toast.folderHidden'), {
    action: { label: t('common.undo'), onSelect: () => unhideFolder(folderId) },
  });
  const current = route.value;
  if (current.kind === 'folder' && current.id === folderId) goHome();
}

function unhideFolder(folderId: string): void {
  const hidden = settings.value.folders.hiddenIds;
  if (!hidden.includes(folderId)) return;
  updateSettings({ folders: { hiddenIds: hidden.filter((id) => id !== folderId) } });
}

/**
 * Everything needed to work inside one browser folder: where you are, how the
 * contents are ordered and shown, the subfolders, and the bookmarks themselves.
 *
 * The view never mutates the bookmark tree — hiding a folder only removes it
 * from MarkTab's own navigation, and the browser's data stays untouched.
 */
export function FolderView({ folderId }: FolderViewProps): JSX.Element {
  const index = bookmarkIndex.value;
  const status = indexStatus.value;
  const settingsValue = settings.value;
  const filter = folderFilter.value;
  const context = linkContext.value;

  const sort = settingsValue.folders.sort;
  const view = settingsValue.folders.view;
  const rootless = folderId === '' || folderId === ROOT_PARENT_ID;
  const scopeId = rootless ? null : folderId;
  const folder = rootless ? undefined : index.folderById.get(folderId);
  const loading = status === 'loading' || status === 'idle';
  const failed = status === 'error';
  const unknown = !loading && !failed && !folder && !rootless;

  const crumbs = useMemo(() => breadcrumbFor(scopeId), [index, scopeId]);
  const entries = useMemo(() => bookmarksInFolder(index, scopeId, sort), [index, scopeId, sort]);
  const tokens = useMemo(() => tokenize(filter), [filter]);
  const visible = useMemo(
    () => (tokens.length === 0 ? entries : entries.filter((entry) => matchesFilter(entry, tokens))),
    [entries, tokens],
  );
  const items = useMemo(() => visible.map((entry) => entryToLinkItem(entry, context)), [visible, context]);
  const children = useMemo(() => childFoldersOf(index, scopeId), [index, scopeId]);
  const hiddenIds = useMemo(
    () => new Set(settingsValue.folders.hiddenIds),
    [settingsValue.folders.hiddenIds],
  );

  const title = folder ? folder.title || t('common.untitled') : rootless ? t('folders.titleAll') : t('nav.folders');
  const meta = loading ? undefined : itemCountLabel(visible.length);

  const clearFilter = (): void => {
    folderFilter.value = '';
  };

  /** Escape empties a non-empty filter and stops there: no navigation side effect. */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || folderFilter.value === '') return;
    clearFilter();
    event.stopPropagation();
  };

  const body = (): JSX.Element => {
    if (loading) return <FolderPlaceholder variant="loading" view={view} />;
    if (failed) return <FolderPlaceholder variant="error" onRetry={() => void reloadBookmarks()} />;
    if (unknown) return <FolderPlaceholder variant="unknown" onGoHome={goHome} />;
    if (visible.length === 0) {
      return filter.trim()
        ? <FolderPlaceholder variant="emptySearch" onClearFilter={clearFilter} />
        : <FolderPlaceholder variant="empty" onOpenManager={openManager} />;
    }
    return view === 'list' ? <LinkList items={items} showPath={false} /> : <LinkGrid items={items} />;
  };

  return (
    <section class={styles.view} aria-label={t('a11y.folders')} onKeyDown={handleKeyDown}>
      <FolderBreadcrumb
        crumbs={crumbs}
        onNavigate={(id) => navigate({ kind: 'folder', id })}
      />
      <SectionHeader level="page" title={title} meta={meta} />
      <FolderToolbar
        filter={filter}
        onFilter={(value) => {
          folderFilter.value = value;
        }}
        onFilterEscape={handleKeyDown}
        sort={sort}
        onSort={(next: SortMode) => updateSettings({ folders: { sort: next } })}
        view={view}
        onView={(next: ViewMode) => updateSettings({ folders: { view: next } })}
        hideToggle={
          folder
            ? {
                hidden: hiddenIds.has(folder.id),
                onToggle: () => (hiddenIds.has(folder.id) ? unhideFolder(folder.id) : hideFolder(folder.id)),
              }
            : undefined
        }
      />
      <FolderChips
        folders={children}
        hiddenIds={hiddenIds}
        onOpen={(id) => navigate({ kind: 'folder', id })}
        onHide={(child) => hideFolder(child.id)}
        onUnhide={(child) => unhideFolder(child.id)}
      />
      <section class={styles.items} aria-label={t('a11y.results')}>
        {body()}
      </section>
    </section>
  );
}
