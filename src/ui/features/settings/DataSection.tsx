import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import { Icon } from '@/ui/components/Icon';
import { settingsNotice, userData, userDataWriteError } from '@/core/state/signals';
import {
  buildExport,
  downloadJson,
  exportFileName,
  importData,
  readFileAsText,
  resetAllData,
} from '@/ui/actions/data';
import { showToast } from '@/ui/state/toast';
import { formatNumber } from '@/ui/format';
import { t, type MessageKey } from '@/locales';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';
import { SETTINGS_DATA_ID } from './sections';
import styles from './sections.module.css';

/** Export, import, reset and the legacy-migration receipt. */
export function DataSection(): JSX.Element {
  // A clean install records `source: 'fresh'` in the same field, and that is not
  // an import: only a `legacy:` source is something the user can be told about.
  const stored = userData.value.migration;
  const migration = stored && stored.source.startsWith('legacy:') ? stored : undefined;
  const [exported, setExported] = useState<string | null>(null);
  const [pending, setPending] = useState<'import' | 'reset' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const exportNow = (): void => {
    const fileName = exportFileName();
    downloadJson(buildExport(), fileName);
    setExported(fileName);
  };

  const runReset = (): void => {
    setPending('reset');
    void resetAllData().finally(() => {
      setPending(null);
      setConfirming(false);
    });
  };

  // Both persistence failures are silent in the browser, so they are surfaced
  // here rather than discovered later by a user whose change did not stick.
  const notice = settingsNotice.value;
  const storageWarning: MessageKey | null = userDataWriteError.value
    ? 'settings.storageWarning.failed'
    : notice === 'sync-write-failed'
      ? 'settings.storageWarning.failed'
      : notice === 'sync-quota-trimmed'
        ? 'settings.storageWarning.trimmed'
        : null;

  return (
    <SettingsSection id={SETTINGS_DATA_ID} title={t('settings.section.data')}>
      {storageWarning ? (
        <p class={styles.warning} role="status">
          <Icon name="alert" size={14} />
          <span>{t(storageWarning)}</span>
        </p>
      ) : null}
      <SettingsRow label={t('settings.export')} description={t('settings.export.hint')}>
        <p class={styles.status} role="status">
          {exported ? (
            <>
              <Icon name="check" size={14} class={styles.statusIcon} />
              <span>{t('common.done')}</span>
              <span class={styles.fileName}>{exported}</span>
            </>
          ) : null}
        </p>
        <Button icon="download" onClick={exportNow}>
          {t('settings.export')}
        </Button>
      </SettingsRow>
      <SettingsRow label={t('settings.import')} description={t('settings.import.hint')}>
        <Button
          icon="upload"
          busy={pending === 'import'}
          disabled={pending !== null}
          onClick={() => fileRef.current?.click()}
        >
          {t('settings.import')}
        </Button>
        <input
          ref={fileRef}
          class={styles.hiddenInput}
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;
            setPending('import');
            void (async () => {
              const text = await readFileAsText(file);
              if (text === null) showToast(t('toast.settingsImportFailed'), { tone: 'error' });
              else await importData(text);
              setPending(null);
            })();
          }}
        />
      </SettingsRow>
      <SettingsRow
        label={t('settings.migration')}
        description={
          migration
            ? t('settings.migration.detail', {
                pins: formatNumber(migration.items.pins),
                recent: formatNumber(migration.items.recent),
              })
            : t('settings.migration.none')
        }
      />
      <SettingsRow label={t('settings.reset')} description={t('settings.reset.hint')}>
        <Button
          variant="danger"
          icon="reset"
          disabled={pending !== null}
          onClick={() => setConfirming(true)}
        >
          {t('settings.reset')}
        </Button>
      </SettingsRow>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        busy={pending === 'reset'}
        title={t('settings.resetTitle')}
        description={t('settings.resetBody')}
        footer={
          <>
            <Button onClick={() => setConfirming(false)} disabled={pending === 'reset'}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" icon="reset" busy={pending === 'reset'} onClick={runReset}>
              {t('settings.reset')}
            </Button>
          </>
        }
      />
    </SettingsSection>
  );
}
