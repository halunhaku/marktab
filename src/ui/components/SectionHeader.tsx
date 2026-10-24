import type { ComponentChildren, JSX } from 'preact';
import { cx } from '../components/cx';
import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: string;
  /** Right-aligned meta line, e.g. "24 items". */
  meta?: string;
  /** Trailing control, usually a "View all" button. */
  action?: ComponentChildren;
  /** Renders the title at page scale (used by folder and library views). */
  level?: 'section' | 'page';
  class?: string;
}

export function SectionHeader({
  title,
  meta,
  action,
  level = 'section',
  class: className,
}: SectionHeaderProps): JSX.Element {
  const Heading = level === 'page' ? 'h1' : 'h2';
  return (
    <div class={cx(styles.header, level === 'page' && styles.page, className)}>
      <Heading class={cx(styles.title, level === 'page' && 'serif-heading')}>{title}</Heading>
      {meta ? <span class={styles.meta}>{meta}</span> : null}
      <span class={styles.spacer} />
      {action ? <div class={styles.action}>{action}</div> : null}
    </div>
  );
}
