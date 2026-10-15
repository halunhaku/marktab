import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { IconButton } from './Button';
import { cx } from './cx';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ComponentChildren;
  footer?: ComponentChildren;
  size?: 'sm' | 'md' | 'lg';
  /** Blocks the scrim click and the escape key, e.g. while an action is in flight. */
  busy?: boolean;
  class?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal.
 *
 * Owns everything a dialog should own: initial focus, a tab ring, `Escape`,
 * scroll locking and focus restoration. Callers only supply content.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  busy = false,
  class: className,
}: DialogProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    document.body.dataset['scrollLocked'] = 'true';
    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      delete document.body.dataset['scrollLocked'];
      previous?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const titleId = `dialog-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      class={styles.scrim}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        class={cx(styles.panel, styles[size], className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <header class={styles.header}>
          <div class={styles.heading}>
            <h2 class={styles.title} id={titleId}>
              {title}
            </h2>
            {description ? <p class={styles.description}>{description}</p> : null}
          </div>
          <IconButton icon="close" label="Close" size="sm" onClick={onClose} disabled={busy} />
        </header>
        {children ? <div class={styles.body}>{children}</div> : null}
        {footer ? <div class={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
