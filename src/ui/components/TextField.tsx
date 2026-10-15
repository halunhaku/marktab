import type { JSX } from 'preact';
import { cx } from './cx';
import styles from './TextField.module.css';

/**
 * Field primitives.
 *
 * Attributes are enumerated instead of spreading `ComponentProps<'input'>`:
 * Preact types `<input>` as a union discriminated by `type`, so spreading a
 * union-typed rest object cannot satisfy any single branch. Listing the handful of
 * attributes this product uses keeps call sites type-checked instead of escaped
 * with a cast. `type` is intentionally fixed to `text` — the palette and the
 * filter fields supply their own clear affordance.
 */
export interface TextFieldProps {
  label: string;
  value: string;
  onInput?: (value: string, event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  autocomplete?: 'off' | 'on';
  spellcheck?: boolean;
  maxLength?: number;
  disabled?: boolean;
  /** Focused when the surrounding dialog or view mounts. */
  autofocus?: boolean;
  /** Hides the visual label but keeps it for assistive technology. */
  hideLabel?: boolean;
  hint?: string;
  /** Renders the hint in the error colour and sets `aria-invalid`. */
  error?: string | null;
  class?: string;
}

/** Single-line input with a persistent label and an optional hint/error line. */
export function TextField({
  label,
  value,
  onInput,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder,
  id,
  name,
  autocomplete = 'off',
  spellcheck = false,
  maxLength,
  disabled = false,
  autofocus = false,
  hideLabel = false,
  hint,
  error,
  class: className,
}: TextFieldProps): JSX.Element {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const message = error ?? hint;
  return (
    <div class={cx(styles.field, className)}>
      <label class={cx(styles.label, hideLabel && 'visually-hidden')} for={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        autocomplete={autocomplete}
        spellcheck={spellcheck}
        maxLength={maxLength}
        disabled={disabled}
        autofocus={autofocus}
        data-autofocus={autofocus ? 'true' : undefined}
        class={cx(styles.input, error && styles.invalid)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={message ? `${inputId}-message` : undefined}
        onInput={onInput ? (event) => onInput((event.currentTarget as HTMLInputElement).value, event) : undefined}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {message ? (
        <p class={cx(styles.message, error && styles.error)} id={`${inputId}-message`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
  id?: string;
  disabled?: boolean;
  class?: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
  id,
  disabled = false,
  class: className,
}: SelectFieldProps): JSX.Element {
  const selectId = id ?? `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div class={cx(styles.field, className)}>
      <label class={styles.label} for={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        class={styles.select}
        aria-describedby={hint ? `${selectId}-hint` : undefined}
        onChange={(event) => onChange((event.currentTarget as HTMLSelectElement).value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p class={styles.message} id={`${selectId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
