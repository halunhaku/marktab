import { useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import { Icon } from '@/ui/components/Icon';
import { TextField } from '@/ui/components/TextField';
import type { LinkItem } from '@/core/state/selectors';
import { folderOptions } from '@/core/state/selectors';
import { t } from '@/locales';
import { moveLink } from '@/ui/actions/links';
import { showToast } from '@/ui/state/toast';
import styles from './dialogs.module.css';

export interface MoveDialogProps {
  target: LinkItem;
  onClose: () => void;
}

/**
 * Moves a bookmark to another folder.
 *
 * Hidden folders are absent from the option list on purpose — offering a
 * destination the product is currently hiding would be a dead end. The folder
 * the bookmark already lives in is marked and excluded from selection.
 */
export function MoveDialog({ target, onClose }: MoveDialogProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState(false);

  const folders = folderOptions.value;
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const candidates = folders.filter((folder) => folder.id !== target.folderId);
    if (!needle) return candidates.slice(0, 60);
    return candidates
      .filter((folder) => folder.path.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [folders, query, target.folderId]);

  const currentFolder = folders.find((folder) => folder.id === target.folderId);

  const choose = (id: string, label: string): void => {
    if (busy) return;
    setBusy(true);
    void moveLink(target, id).then((ok) => {
      setBusy(false);
      if (ok) {
        setMoved(true);
        showToast(t('toast.moved', { folder: label }), { tone: 'success' });
        onClose();
      }
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy || moved}
      size="md"
      title={t('item.moveTitle', { title: target.title })}
      footer={
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
      }
    >
      <TextField
        label={t('item.moveSearch')}
        hideLabel
        value={query}
        autofocus
        placeholder={t('item.moveSearch')}
        onInput={setQuery}
      />
      {currentFolder ? (
        <p class={styles.current}>
          {t('item.chooseFolder')}: {currentFolder.path}
        </p>
      ) : null}
      {matches.length === 0 ? (
        <p class={styles.note} role="status">
          {t('item.moveNone')}
        </p>
      ) : (
        <div class={styles.list} role="listbox" aria-label={t('item.moveTitle', { title: target.title })}>
          {matches.map((folder) => (
            <button
              key={folder.id}
              type="button"
              role="option"
              aria-selected="false"
              class={styles.option}
              style={{ paddingInlineStart: `${8 + Math.min(folder.depth, 6) * 12}px` }}
              onClick={() => choose(folder.id, folder.label)}
            >
              <span class={styles.optionIcon}>
                <Icon name="folder" size={14} />
              </span>
              <span class={styles.optionLabel}>{folder.label}</span>
              <span class={styles.optionPath}>{folder.path}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
