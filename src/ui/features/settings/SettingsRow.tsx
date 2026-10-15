import type { ComponentChildren, JSX } from 'preact';
import { cx } from '@/ui/components/cx';
import styles from './SettingsRow.module.css';

export interface SettingsRowProps {
  label: string;
  /** Secondary line under the label; carries the consequence of the control. */
  description?: string;
  children?: ComponentChildren;
  class?: string;
}

/**
 * One label/control pair inside a settings card.
 *
 * The label is a plain element rather than a `<label>`: every control used here
 * brings its own label association, and a second label pointing at the same
 * control would make assistive technology read the name twice.
 */
export function SettingsRow({ label, description, children, class: className }: SettingsRowProps): JSX.Element {
  return (
    <div class={cx(styles.row, className)}>
      <div class={styles.copy}>
        <span class={styles.label}>{label}</span>
        {description ? <p class={styles.description}>{description}</p> : null}
      </div>
      {children ? <div class={styles.control}>{children}</div> : null}
    </div>
  );
}
