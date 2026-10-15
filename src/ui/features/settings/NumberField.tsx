import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { TextField } from '@/ui/components/TextField';
import { formatNumber } from '@/ui/format';
import { SettingsRow } from './SettingsRow';
import styles from './NumberField.module.css';

export interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  /** Receives the clamped, whole-number value; never fires for invalid input. */
  onCommit: (value: number) => void;
}

function isWholeNumber(text: string): boolean {
  return /^\d+$/.test(text);
}

/**
 * Whole-number setting inside a settings row.
 *
 * The draft lives in local state so a half-typed number never reaches storage:
 * committing clamps into the documented range, and input that is not a number is
 * refused with an inline error instead of silently writing a fallback. The
 * persisted value is read on every render, so an edit made elsewhere wins.
 */
export function NumberField({ id, label, value, min, max, onCommit }: NumberFieldProps): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const range = `${formatNumber(min)}–${formatNumber(max)}`;
  const typed = draft?.trim() ?? '';
  const invalid = typed.length > 0 && !isWholeNumber(typed);

  const commit = (): void => {
    if (draft === null) return;
    if (typed.length === 0) {
      setDraft(null);
      return;
    }
    if (!isWholeNumber(typed)) return;
    setDraft(null);
    const clamped = Math.min(max, Math.max(min, Number(typed)));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <SettingsRow label={label}>
      <TextField
        id={id}
        class={styles.field}
        label={label}
        hideLabel
        value={draft ?? String(value)}
        hint={range}
        error={invalid ? `${label}: ${range}` : null}
        onInput={(next) => setDraft(next)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape' && draft !== null) {
            event.preventDefault();
            setDraft(null);
          }
        }}
      />
    </SettingsRow>
  );
}
