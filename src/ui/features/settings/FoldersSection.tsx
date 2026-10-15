import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Segmented, type SegmentedOption } from '@/ui/components/Segmented';
import { updateSettings } from '@/core/settings/store';
import { settings, bookmarkIndex } from '@/core/state/signals';
import type { FolderSortMode, FolderView } from '@/core/settings/types';
import { unhideFolder } from '@/ui/actions/folders';
import { formatNumber } from '@/ui/format';
import { useIncremental } from '@/ui/hooks/useIncremental';
import { t } from '@/locales';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';
import { SETTINGS_FOLDERS_ID } from './sections';
import styles from './sections.module.css';

function viewOptions(): readonly SegmentedOption<FolderView>[] {
  return [
    { value: 'grid', label: t('folders.view.grid'), icon: 'grid' },
    { value: 'list', label: t('folders.view.list'), icon: 'list' },
  ];
}

function sortOptions(): readonly SegmentedOption<FolderSortMode>[] {
  return [
    { value: 'manual', label: t('folders.sort.manual') },
    { value: 'title', label: t('folders.sort.title') },
    { value: 'recent', label: t('folders.sort.recent') },
  ];
}

/**
 * Folder display defaults and the hidden-folder recovery list.
 *
 * Unhiding lives here on purpose: hiding a folder is only announced by a toast,
 * so this list is where a folder hidden by accident becomes visible again.
 */
export function FoldersSection(): JSX.Element {
  const folders = settings.value.folders;
  const index = bookmarkIndex.value;
  const incremental = useIncremental(folders.hiddenIds.length, 20, 20);
  const rows = folders.hiddenIds.slice(0, incremental.limit).map((id) => {
    const folder = index.folderById.get(id);
    return { id, title: folder?.title || id, path: folder?.path ?? '' };
  });

  return (
    <SettingsSection id={SETTINGS_FOLDERS_ID} title={t('settings.section.folders')}>
      <SettingsRow label={t('nav.folders')}>
        <Segmented
          label={t('nav.folders')}
          value={folders.view}
          options={viewOptions()}
          onChange={(view) => updateSettings({ folders: { view } })}
        />
      </SettingsRow>
      <SettingsRow label={t('folders.sort.label')}>
        <Segmented
          label={t('folders.sort.label')}
          value={folders.sort}
          options={sortOptions()}
          onChange={(sort) => updateSettings({ folders: { sort } })}
        />
      </SettingsRow>
      <div class={styles.block}>
        <h3 class={styles.subhead}>
          {t('settings.hiddenFolders')}
          {folders.hiddenIds.length > 0 ? (
            <span class={styles.count}>{formatNumber(folders.hiddenIds.length)}</span>
          ) : null}
        </h3>
        {folders.hiddenIds.length === 0 ? (
          <p class={styles.muted}>{t('settings.hiddenFolders.empty')}</p>
        ) : (
          <>
            <ul class={styles.list}>
              {rows.map((row) => (
                <li class={styles.listRow} key={row.id}>
                  <span class={styles.listCopy}>
                    <span class={styles.listTitle}>{row.title}</span>
                    {row.path ? <span class={styles.listMeta}>{row.path}</span> : null}
                  </span>
                  <Button size="sm" icon="undo" onClick={() => unhideFolder(row.id)}>
                    {t('settings.hiddenFolders.show')}
                  </Button>
                </li>
              ))}
            </ul>
            {incremental.hasMore ? (
              <div class={styles.listMore}>
                <Button size="sm" onClick={incremental.showMore}>
                  {t('common.showMore', { count: formatNumber(incremental.remaining) })}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SettingsSection>
  );
}
