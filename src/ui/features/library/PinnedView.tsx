import type { JSX } from 'preact';
import { pinnedItems } from '@/core/state/selectors';
import { movePinnedTo } from '@/core/userdata/store';
import { t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { CardGrid } from '@/ui/components/CardGrid';
import { EmptyState } from '@/ui/components/EmptyState';
import { IconButton } from '@/ui/components/Button';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { itemCountLabel } from '@/ui/format';
import { openPalette } from '@/ui/state/router';
import { LinkCard } from '@/ui/features/links/LinkCard';
import styles from './library.module.css';

/**
 * Pinned view.
 *
 * The same cards as home, plus the ordering controls home deliberately omits: pins
 * are a hand-curated list, so reordering belongs where the whole list is visible.
 * Order lives in `userData.pins[].order` and survives restarts.
 */
export function PinnedView(): JSX.Element {
  const items = pinnedItems.value;

  return (
    <section class={styles.view} aria-label={t('nav.pinned')}>
      <SectionHeader
        level="page"
        title={t('nav.pinned')}
        meta={items.length > 0 ? itemCountLabel(items.length) : undefined}
        action={
          <Button size="sm" icon="search" onClick={() => openPalette()}>
            {t('common.search')}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="pin"
          title={t('pinned.empty.title')}
          description={t('pinned.empty.description')}
          action={
            <Button variant="primary" icon="search" onClick={() => openPalette()}>
              {t('common.search')}
            </Button>
          }
        />
      ) : (
        <CardGrid>
          {items.map((item, index) => (
            <div class={styles.pinnedSlot} key={item.url}>
              <span class={styles.order} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <LinkCard item={item} class={styles.pinnedCard} />
              <div class={styles.reorder}>
                <IconButton
                  size="sm"
                  icon="chevronLeft"
                  // The control is a sibling of the card, so its name has to carry
                  // the item: "Move up" alone does not say which bookmark moves.
                  label={`${item.title}: ${t('item.moveEarlier')}`}
                  disabled={index === 0}
                  onClick={() => movePinnedTo(index, index - 1)}
                />
                <IconButton
                  size="sm"
                  icon="chevronRight"
                  label={`${item.title}: ${t('item.moveLater')}`}
                  disabled={index === items.length - 1}
                  onClick={() => movePinnedTo(index, index + 1)}
                />
              </div>
            </div>
          ))}
        </CardGrid>
      )}
    </section>
  );
}
