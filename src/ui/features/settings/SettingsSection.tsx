import type { ComponentChildren, JSX } from 'preact';
import { SectionHeader } from '@/ui/components/SectionHeader';
import styles from './SettingsSection.module.css';

export interface SettingsSectionProps {
  /** Anchor target; the sticky navigation scrolls to it. */
  id: string;
  title: string;
  children: ComponentChildren;
}

/**
 * One titled block of settings.
 *
 * Focusable so the section navigation can hand the caret over after scrolling,
 * which keeps the jump meaningful for keyboard and screen-reader users.
 */
export function SettingsSection({ id, title, children }: SettingsSectionProps): JSX.Element {
  return (
    <section class={styles.section} id={id} tabIndex={-1} aria-label={title}>
      <SectionHeader title={title} />
      <div class={styles.card}>{children}</div>
    </section>
  );
}
