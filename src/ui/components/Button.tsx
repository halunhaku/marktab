import type { ComponentProps, JSX } from 'preact';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

type NativeButtonProps = Omit<ComponentProps<'button'>, 'size' | 'icon' | 'children' | 'class'>;

export interface ButtonProps extends NativeButtonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  /** Stretch to the container width (dialogs, popup). */
  block?: boolean;
  /** Keeps the label width stable while the leading icon becomes a static busy glyph. */
  busy?: boolean;
  class?: string;
  children?: JSX.Element | JSX.Element[] | string | number | null;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  busy = false,
  class: className,
  type = 'button',
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const glyph = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  return (
    <button
      {...rest}
      type={type}
      class={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      data-busy={busy ? 'true' : undefined}
      aria-busy={busy ? 'true' : undefined}
    >
      {busy ? <Icon name="history" size={glyph} class={styles.busyIcon} /> : null}
      {!busy && icon ? <Icon name={icon} size={glyph} /> : null}
      {children === undefined || children === null ? null : <span class={styles.label}>{children}</span>}
      {iconRight ? <Icon name={iconRight} size={glyph} /> : null}
    </button>
  );
}

export interface IconButtonProps extends Omit<NativeButtonProps, 'aria-label' | 'class'> {
  icon: IconName;
  /** Accessible name; also used as the tooltip. Never omit it. */
  label: string;
  variant?: Exclude<Variant, 'link'>;
  size?: Size;
  /** Renders the pressed state for toggles. */
  active?: boolean;
  class?: string;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active = false,
  class: className,
  type = 'button',
  ...rest
}: IconButtonProps): JSX.Element {
  return (
    <button
      {...rest}
      type={type}
      class={cx(styles.button, styles[variant], styles[size], styles.iconOnly, className)}
      aria-label={label}
      title={label}
      aria-pressed={active ? 'true' : undefined}
      data-active={active ? 'true' : undefined}
    >
      <Icon name={icon} size={size === 'sm' ? 15 : size === 'lg' ? 20 : 17} />
    </button>
  );
}
