import type { JSX } from 'preact';
import type { Settings } from '@/core/settings/types';
import { t } from '@/locales';
import { IconButton } from '@/ui/components/Button';
import { Segmented, type SegmentedOption } from '@/ui/components/Segmented';
import { TextField } from '@/ui/components/TextField';
import { cx } from '@/ui/components/cx';
import styles from './FolderToolbar.module.css';

type SortMode = Settings['folders']['sort'];
type ViewMode = Settings['folders']['view'];

export interface FolderToolbarProps {
  filter: string;
  onFilter: (value: string) => void;
  /** Escape clears a non-empty filter without leaving the field. */
  onFilterEscape: (event: KeyboardEvent) => void;
  sort: SortMode;
  onSort: (sort: SortMode) => void;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  /** Present only when the route points at a real browser folder. */
  hideToggle?: { hidden: boolean; onToggle: () => void };
  class?: string;
}

/** Filter, sort, view and visibility for one folder. */
export function FolderToolbar({
  filter,
  onFilter,
  onFilterEscape,
  sort,
  onSort,
  view,
  onView,
  hideToggle,
  class: className,
}: FolderToolbarProps): JSX.Element {
  const sortOptions: SegmentedOption<SortMode>[] = [
    { value: 'manual', label: t('folders.sort.manual') },
    { value: 'title', label: t('folders.sort.title') },
    { value: 'recent', label: t('folders.sort.recent') },
  ];
  const viewOptions: SegmentedOption<ViewMode>[] = [
    { value: 'grid', label: t('folders.view.grid'), icon: 'grid' },
    { value: 'list', label: t('folders.view.list'), icon: 'list' },
  ];

  return (
    <div class={cx(styles.toolbar, className)}>
      <div class={styles.filterWrap}>
        <TextField
          class={styles.filter}
          label={t('folders.filter')}
          hideLabel
          placeholder={t('folders.filter')}
          value={filter}
          onInput={onFilter}
          onKeyDown={onFilterEscape}
        />
        {filter ? (
          <IconButton
            class={styles.clear}
            icon="close"
            label={t('common.clear')}
            size="sm"
            onClick={() => onFilter('')}
          />
        ) : null}
      </div>
      <Segmented value={sort} options={sortOptions} onChange={onSort} label={t('folders.sort.label')} size="sm" />
      <Segmented
        value={view}
        options={viewOptions}
        onChange={onView}
        label={t('folders.view.label')}
        size="sm"
        iconsOnly
      />
      {hideToggle ? (
        <IconButton
          icon={hideToggle.hidden ? 'folder' : 'eyeOff'}
          label={hideToggle.hidden ? t('folders.unhide') : t('folders.hide')}
          size="sm"
          active={hideToggle.hidden}
          onClick={hideToggle.onToggle}
        />
      ) : null}
    </div>
  );
}
