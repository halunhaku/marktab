import { useEffect, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { useOverlayMotion } from '../hooks/useOverlayMotion';
import { Icon } from './Icon';
import { cx } from './cx';
import { dismissToast, toasts, type Toast } from '../state/toast';
import styles from './Toast.module.css';

function ToastCard({ toast }: { toast: Toast }): JSX.Element {
  const cardRef = useRef<HTMLDivElement | null>(null);
  useOverlayMotion(cardRef);

  useEffect(() => {
    if (toast.duration <= 0) return undefined;
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return (
    <div ref={cardRef} class={cx(styles.toast, styles[toast.tone])} role="status" aria-live="polite">
      {toast.tone === 'success' ? <Icon name="check" size={15} /> : null}
      {toast.tone === 'error' ? <Icon name="alert" size={15} /> : null}
      <span class={styles.message}>{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          class={styles.action}
          onClick={() => {
            dismissToast(toast.id);
            toast.action?.onSelect();
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        class={styles.close}
        aria-label="Dismiss notification"
        onClick={() => dismissToast(toast.id)}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}

export function ToastHost(): JSX.Element | null {
  if (toasts.value.length === 0) return null;
  return (
    <div class={styles.host}>
      {toasts.value.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
