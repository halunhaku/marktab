import { signal } from '@preact/signals';

/**
 * Transient notifications.
 *
 * Toasts carry the recovery path for destructive actions (delete, hide folder,
 * clear history), so an action is created with the same payload that would undo
 * it — never a generic "Undo" that guesses.
 */
export type ToastTone = 'default' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onSelect: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss; `0` keeps it until dismissed. */
  duration: number;
}

export const toasts = signal<readonly Toast[]>([]);

let nextId = 1;

export interface ToastOptions {
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
}

export function showToast(message: string, options: ToastOptions = {}): number {
  const toast: Toast = {
    id: nextId++,
    message,
    tone: options.tone ?? 'default',
    duration: options.duration ?? (options.action ? 7000 : 3200),
    ...(options.action ? { action: options.action } : {}),
  };
  const current = toasts.value;
  // Keep the stack shallow: the newest three are all a user can act on.
  toasts.value = [...current.slice(-2), toast];
  return toast.id;
}

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

export function clearToasts(): void {
  if (toasts.value.length) toasts.value = [];
}

/** Test seam: resets the id counter so snapshots stay stable. */
export function resetToastsForTests(): void {
  toasts.value = [];
  nextId = 1;
}
