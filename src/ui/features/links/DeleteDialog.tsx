import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import type { LinkItem } from '@/core/state/selectors';
import { t } from '@/locales';
import { deleteBookmark } from '@/ui/actions/links';
import styles from './dialogs.module.css';

export interface DeleteDialogProps {
  target: LinkItem;
  onClose: () => void;
}

/**
 * Confirms deletion of a browser bookmark.
 *
 * This is the only destructive action in the product, so it is confirmed
 * explicitly and the dialog states plainly that an undo is available right after.
 */
export function DeleteDialog({ target, onClose }: DeleteDialogProps): JSX.Element {
  const [busy, setBusy] = useState(false);

  const confirm = (): void => {
    if (busy) return;
    setBusy(true);
    void deleteBookmark(target).then(() => {
      setBusy(false);
      onClose();
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={t('item.removeTitle', { title: target.title })}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirm} busy={busy} icon="trash">
            {t('item.removeConfirm')}
          </Button>
        </>
      }
    >
      <p class={styles.note}>{t('item.removeBody')}</p>
      <p class={styles.note}>{target.url}</p>
    </Dialog>
  );
}
