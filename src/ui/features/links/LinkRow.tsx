import type { JSX } from 'preact';
import { Favicon } from '@/ui/components/Favicon';
import { IconButton } from '@/ui/components/Button';
import { cx } from '@/ui/components/cx';
import type { LinkItem } from '@/core/state/selectors';
import { t } from '@/locales';
import { relativeLabel } from '@/ui/format';
import { openLinkMenu, openMenuFromPoint, togglePin } from '@/ui/actions/links';
import { linkAnchorProps } from './open';
import styles from './LinkRow.module.css';

export interface LinkRowProps {
  item: LinkItem;
  /** Renders the folder breadcrumb instead of the host. */
  showPath?: boolean;
  /** Renders "opened 3 min ago" for the recent list. */
  showOpened?: boolean;
  class?: string;
}

/** List row for a bookmark. Rows keep the same anchor/action split as cards. */
export function LinkRow({
  item,
  showPath = false,
  showOpened = false,
  class: className,
}: LinkRowProps): JSX.Element {
  const anchor = linkAnchorProps({ item });
  return (
    <div
      class={cx(styles.row, item.pinned && styles.pinned, className)}
      onContextMenu={(event) => openMenuFromPoint(item, event)}
      data-url={item.url}
    >
      <a {...anchor} class={styles.main} title={item.url}>
        <Favicon url={item.url} title={item.title} size={20} />
        <span class={styles.copy}>
          <span class={styles.title}>{item.title}</span>
          {showPath && item.path ? <span class={styles.path}>{item.path}</span> : null}
        </span>
      </a>
      <span class={styles.host}>{item.host}</span>
      {showOpened && item.lastOpened ? <span class={styles.opened}>{relativeLabel(item.lastOpened)}</span> : null}
      <div class={styles.actions}>
        <IconButton
          icon={item.pinned ? 'pinFilled' : 'pin'}
          label={item.pinned ? t('item.unpin') : t('item.pin')}
          size="sm"
          active={item.pinned}
          class={cx(styles.pinButton, item.pinned && styles.pinActive)}
          onClick={() => togglePin(item)}
        />
        <IconButton
          icon="moreVertical"
          label={t('item.more')}
          size="sm"
          onClick={(event) => openLinkMenu(item, event.currentTarget)}
        />
      </div>
    </div>
  );
}
