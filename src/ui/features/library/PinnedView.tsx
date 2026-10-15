import type { JSX } from 'preact';
import { pinnedItems } from '@/core/state/selectors';
import { movePinnedTo } from '@/core/userdata/store';
import { t } from '@/locales';
import { Button } from '@/ui/components/Button';
import { CardGrid } from '@/ui/components/CardGrid';
import { EmptyState } from '@/ui/components/EmptyState';
import { IconButton } from '@/ui/components/Button';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { buildLinkMenu } from '@/ui/actions/links';
import { itemCountLabel } from '@/ui/format';
import { openMenuAt } from '@/ui/state/overlay';
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
                  label={t('item.moveEarlier')}
                  disabled={index === 0}
                  onClick={() => movePinnedTo(index, index - 1)}
                />
                <IconButton
                  size="sm"
                  icon="chevronRight"
                  label={t('item.moveLater')}
                  disabled={index === items.length - 1}
                  onClick={() => movePinnedTo(index, index + 1)}
                />
                <span class={styles.spacer} />
                <IconButton
                  size="sm"
                  icon="moreVertical"
                  label={t('item.more')}
                  onClick={(event) => {
                    const extras = [
                      {
                        id: 'move-earlier',
                        label: t('item.moveEarlier'),
                        icon: 'chevronLeft' as const,
                        newGroup: true,
                        disabled: index === 0,
                        onSelect: () => movePinnedTo(index, index - 1),
                      },
                      {
                        id: 'move-later',
                        label: t('item.moveLater'),
                        icon: 'chevronRight' as const,
                        disabled: index === items.length - 1,
                        onSelect: () => movePinnedTo(index, index + 1),
                      },
                    ];
                    openMenuAt(event.currentTarget, [...buildLinkMenu(item), ...extras], item.title, 'end');
                  }}
                />
              </div>
            </div>
          ))}
        </CardGrid>
      )}
    </section>
  );
}
