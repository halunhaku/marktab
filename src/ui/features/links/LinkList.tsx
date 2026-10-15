import type { ComponentChildren, JSX } from 'preact';
import type { LinkItem } from '@/core/state/selectors';
import { t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { useIncremental } from '@/ui/hooks/useIncremental';
import { formatNumber } from '@/ui/format';
import { LinkRow } from './LinkRow';
import styles from './LinkList.module.css';

export interface LinkListProps {
  items: readonly LinkItem[];
  empty?: ComponentChildren;
  showPath?: boolean;
  showOpened?: boolean;
  window?: number;
  class?: string;
}

/** Vertical list of bookmark rows with bounded rendering. */
export function LinkList({
  items,
  empty,
  showPath = false,
  showOpened = false,
  window = 100,
  class: className,
}: LinkListProps): JSX.Element {
  const incremental = useIncremental(items.length, window, window);

  if (items.length === 0) {
    return <div class={className}>{empty ?? null}</div>;
  }

  return (
    <div class={className}>
      <div class={styles.list} role="list">
        {items.slice(0, incremental.limit).map((item) => (
          <div role="listitem" key={item.bookmarkId ?? item.url}>
            <LinkRow item={item} showPath={showPath} showOpened={showOpened} />
          </div>
        ))}
      </div>
      {incremental.hasMore ? (
        <div class={styles.more}>
          <Button size="sm" onClick={incremental.showMore}>
            {t('common.showMore', { count: formatNumber(incremental.remaining) })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
