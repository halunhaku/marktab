import type { JSX } from 'preact';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  /** Primary recovery action; every empty state should offer a way forward. */
  action?: JSX.Element;
  /** `inline` keeps the block compact for panels and popovers. */
  size?: 'inline' | 'block';
  class?: string;
}

export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  action,
  size = 'block',
  class: className,
}: EmptyStateProps): JSX.Element {
  return (
    <div class={cx(styles.root, size === 'inline' && styles.inline, className)} role="status">
      <span class={styles.icon}>
        <Icon name={icon} size={size === 'inline' ? 16 : 20} />
      </span>
      <p class={styles.title}>{title}</p>
      {description ? <p class={styles.description}>{description}</p> : null}
      {action ? <div class={styles.action}>{action}</div> : null}
    </div>
  );
}
