import type { ComponentChildren, JSX } from 'preact';
import type { LinkItem } from '@/core/state/selectors';
import { t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { useIncremental } from '@/ui/hooks/useIncremental';
import { formatNumber } from '@/ui/format';
import { LinkCard } from './LinkCard';
import styles from './LinkGrid.module.css';

export interface LinkGridProps {
  items: readonly LinkItem[];
  /** Rendered when `items` is empty. */
  empty?: ComponentChildren;
  showHost?: boolean;
  /** Items rendered before the "show more" step kicks in. */
  window?: number;
  class?: string;
}

/** Responsive grid of bookmark cards with bounded rendering. */
export function LinkGrid({ items, empty, showHost = true, window = 60, class: className }: LinkGridProps): JSX.Element {
  const incremental = useIncremental(items.length, window, window);

  if (items.length === 0) {
    return <div class={className}>{empty ?? null}</div>;
  }

  return (
    <div class={className}>
      <div class={styles.grid}>
        {items.slice(0, incremental.limit).map((item) => (
          <LinkCard key={item.bookmarkId ?? item.url} item={item} showHost={showHost} />
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
