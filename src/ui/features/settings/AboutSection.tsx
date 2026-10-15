import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Kbd } from '@/ui/components/Kbd';
import { getChrome } from '@/core/platform/chrome';
import { openManager } from '@/ui/actions/links';
import { t, type MessageKey } from '@/locales';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';
import { SETTINGS_ABOUT_ID } from './sections';
import styles from './sections.module.css';

const FALLBACK_VERSION = '3.0.0';

/** Installed extension version; the fallback covers previews and unit tests. */
function extensionVersion(): string {
  try {
    const manifest = getChrome()?.runtime?.getManifest?.();
    return manifest?.version ?? FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}

const VERSION = extensionVersion();

interface ShortcutRow {
  labelKey: MessageKey;
  /** One `Kbd` per chord; several chords are alternatives for the same action. */
  chords: readonly string[];
}

const SHORTCUTS: readonly ShortcutRow[] = [
  { labelKey: 'settings.shortcuts.open', chords: ['Mod+K'] },
  { labelKey: 'settings.shortcuts.close', chords: ['Escape'] },
  { labelKey: 'settings.shortcuts.navigate', chords: ['ArrowUp+ArrowDown'] },
  { labelKey: 'settings.shortcuts.openItem', chords: ['Enter'] },
  { labelKey: 'settings.shortcuts.newTab', chords: ['Shift+Enter'] },
  { labelKey: 'settings.shortcuts.web', chords: ['Mod+Enter'] },
  { labelKey: 'settings.shortcuts.sections', chords: ['Mod+1', 'Mod+2', 'Mod+3'] },
  { labelKey: 'settings.shortcuts.settings', chords: ['Mod+,'] },
];

/** Version, the full keyboard map, the privacy statement and the manager link. */
export function AboutSection(): JSX.Element {
  return (
    <SettingsSection id={SETTINGS_ABOUT_ID} title={t('settings.section.about')}>
      <SettingsRow label={t('settings.version')}>
        <span class={styles.version}>{VERSION}</span>
      </SettingsRow>
      <div class={styles.block}>
        <h3 class={styles.subhead}>{t('settings.shortcuts')}</h3>
        <table class={styles.table}>
          <caption class="visually-hidden">{t('settings.shortcuts')}</caption>
          <tbody>
            {SHORTCUTS.map((row) => (
              <tr key={row.labelKey}>
                <th scope="row">{t(row.labelKey)}</th>
                <td>
                  <span class={styles.keys}>
                    {row.chords.map((chord, index) => (
                      <span class={styles.chord} key={chord}>
                        {index > 0 ? (
                          <span class={styles.sep} aria-hidden="true">
                            /
                          </span>
                        ) : null}
                        <Kbd shortcut={chord} />
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class={styles.block}>
        <h3 class={styles.subhead}>{t('settings.privacy')}</h3>
        <p class={styles.note}>{t('settings.privacy.body')}</p>
        <div class={styles.actions}>
          <Button icon="externalLink" onClick={openManager}>
            {t('settings.openManager')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
