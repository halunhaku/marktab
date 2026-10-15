import type { JSX } from 'preact';
import { cx } from './cx';
import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Secondary line under the label. */
  description?: string;
  disabled?: boolean;
  class?: string;
}

/** Labelled toggle. The whole row is the hit target, matching native settings rows. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  class: className,
}: SwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      disabled={disabled}
      class={cx(styles.row, className)}
      onClick={() => onChange(!checked)}
    >
      <span class={styles.copy}>
        <span class={styles.label}>{label}</span>
        {description ? <span class={styles.description}>{description}</span> : null}
      </span>
      <span class={styles.track} aria-hidden="true">
        <span class={styles.thumb} />
      </span>
    </button>
  );
}
