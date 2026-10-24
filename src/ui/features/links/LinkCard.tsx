import type { JSX } from 'preact';
import { Favicon } from '@/ui/components/Favicon';
import { IconButton } from '@/ui/components/Button';
import { cx } from '@/ui/components/cx';
import type { LinkItem } from '@/core/state/selectors';
import { t } from '@/locales';
import { openLinkMenu, openMenuFromPoint, togglePin } from '@/ui/actions/links';
import { linkAnchorProps } from './open';
import styles from './LinkCard.module.css';

export interface LinkCardProps {
  item: LinkItem;
  /** Shown under the title; hidden where the surrounding context already says it. */
  showHost?: boolean;
  class?: string;
}

/**
 * Grid card for a bookmark.
 *
 * The anchor covers the card body and the controls sit outside it, so the markup
 * stays valid (no nested interactive elements) while the whole surface remains
 * clickable.
 */
export function LinkCard({ item, showHost = true, class: className }: LinkCardProps): JSX.Element {
  const anchor = linkAnchorProps({ item });
  return (
    <article
      class={cx(styles.card, item.pinned && styles.pinned, className)}
      onContextMenu={(event) => openMenuFromPoint(item, event)}
      data-url={item.url}
    >
      <a {...anchor} class={styles.main} title={item.url}>
        <span class={styles.icon}>
          <Favicon url={item.url} title={item.title} size={24} />
        </span>
        <span class={styles.copy}>
          <span class={styles.title}>{item.title}</span>
          {showHost ? <span class={styles.host}>{item.host}</span> : null}
        </span>
      </a>
      <div class={styles.actions}>
        <IconButton
          icon={item.pinned ? 'pinFilled' : 'pin'}
          label={item.pinned ? t('item.unpin') : t('item.pin')}
          size="sm"
          active={item.pinned}
          class={cx(styles.pinButton, item.pinned && styles.pinActive)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            togglePin(item);
          }}
        />
        <IconButton
          icon="moreVertical"
          label={t('item.more')}
          size="sm"
          class={styles.more}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openLinkMenu(item, event.currentTarget);
          }}
        />
      </div>
    </article>
  );
}
