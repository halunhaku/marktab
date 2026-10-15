import type { JSX } from 'preact';
import { Switch } from '@/ui/components/Switch';
import { updateSettings } from '@/core/settings/store';
import { settings } from '@/core/state/signals';
import {
  PINNED_LIMIT_MAX,
  PINNED_LIMIT_MIN,
  RECENT_COUNT_MAX,
  RECENT_COUNT_MIN,
} from '@/core/settings/types';
import { t } from '@/locales';
import { NumberField } from './NumberField';
import { SettingsSection } from './SettingsSection';
import { SETTINGS_HOME_ID } from './sections';

/** What the new tab page shows, and how much of it. */
export function HomeSection(): JSX.Element {
  const home = settings.value.home;

  return (
    <SettingsSection id={SETTINGS_HOME_ID} title={t('settings.section.home')}>
      <Switch
        label={t('settings.showClock')}
        checked={home.showClock}
        onChange={(showClock) => updateSettings({ home: { showClock } })}
      />
      <Switch
        label={t('settings.showPinned')}
        checked={home.showPinned}
        onChange={(showPinned) => updateSettings({ home: { showPinned } })}
      />
      <Switch
        label={t('settings.showRecent')}
        checked={home.showRecent}
        onChange={(showRecent) => updateSettings({ home: { showRecent } })}
      />
      <Switch
        label={t('settings.showFolders')}
        checked={home.showFolders}
        onChange={(showFolders) => updateSettings({ home: { showFolders } })}
      />
      <NumberField
        id="settings-recent-count"
        label={t('settings.recentCount')}
        value={home.recentCount}
        min={RECENT_COUNT_MIN}
        max={RECENT_COUNT_MAX}
        onCommit={(recentCount) => updateSettings({ home: { recentCount } })}
      />
      <NumberField
        id="settings-pinned-limit"
        label={t('settings.pinnedLimit')}
        value={home.pinnedLimit}
        min={PINNED_LIMIT_MIN}
        max={PINNED_LIMIT_MAX}
        onCommit={(pinnedLimit) => updateSettings({ home: { pinnedLimit } })}
      />
    </SettingsSection>
  );
}
