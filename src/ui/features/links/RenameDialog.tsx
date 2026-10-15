import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import { TextField } from '@/ui/components/TextField';
import type { LinkItem } from '@/core/state/selectors';
import { t } from '@/locales';
import { renameLink } from '@/ui/actions/links';
import { showToast } from '@/ui/state/toast';

export interface RenameDialogProps {
  target: LinkItem;
  onClose: () => void;
}

/** Renames the browser bookmark behind a link. Title only; the URL never changes. */
export function RenameDialog({ target, onClose }: RenameDialogProps): JSX.Element {
  const [draft, setDraft] = useState(target.title);
  const [busy, setBusy] = useState(false);
  const trimmed = draft.trim();
  const invalid = trimmed.length === 0;

  const submit = (): void => {
    if (invalid || busy) return;
    setBusy(true);
    void renameLink(target, trimmed).then((ok) => {
      setBusy(false);
      if (ok) {
        showToast(t('toast.renamed'), { tone: 'success' });
        onClose();
      }
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={t('item.renameTitle')}
      description={target.url}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={submit} disabled={invalid} busy={busy}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <TextField
        label={t('item.renameLabel')}
        value={draft}
        autofocus
        maxLength={512}
        onInput={setDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      />
    </Dialog>
  );
}
