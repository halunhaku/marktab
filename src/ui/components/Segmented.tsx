import type { JSX } from 'preact';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  size?: 'sm' | 'md';
  /** Hide the text and keep only the icons (still labelled through `title`). */
  iconsOnly?: boolean;
  class?: string;
}

/**
 * Small mutually-exclusive choice control.
 *
 * Behaves like a radio group: one tab stop, arrow keys move the selection, and
 * the pressed state is exposed with `aria-checked` so screen readers announce it.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  iconsOnly = false,
  class: className,
}: SegmentedProps<T>): JSX.Element {
  const move = (direction: 1 | -1): void => {
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + direction + options.length) % options.length];
    if (next) onChange(next.value);
  };

  return (
    <div
      class={cx(styles.group, size === 'sm' && styles.sm, className)}
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected ? 'true' : 'false'}
            tabIndex={selected ? 0 : -1}
            title={option.label}
            class={cx(styles.segment, selected && styles.selected)}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? <Icon name={option.icon} size={size === 'sm' ? 14 : 15} /> : null}
            {iconsOnly ? <span class="visually-hidden">{option.label}</span> : <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
