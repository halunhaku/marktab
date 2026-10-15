import type { JSX } from 'preact';
import { Segmented, type SegmentedOption } from '@/ui/components/Segmented';
import { SelectField } from '@/ui/components/TextField';
import { updateSettings } from '@/core/settings/store';
import { settings } from '@/core/state/signals';
import type { Density, LanguageSetting, MotionSetting, ThemeMode } from '@/core/settings/types';
import { LOCALE_LABELS, t, type LocaleId } from '@/locales';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';
import { SETTINGS_APPEARANCE_ID } from './sections';

/**
 * Option lists are built per render rather than hoisted, so they follow the
 * language setting the moment it changes.
 */
function themeOptions(): readonly SegmentedOption<ThemeMode>[] {
  return [
    { value: 'light', label: t('settings.theme.light'), icon: 'sun' },
    { value: 'dark', label: t('settings.theme.dark'), icon: 'moon' },
    { value: 'system', label: t('settings.theme.system'), icon: 'monitor' },
  ];
}

function densityOptions(): readonly SegmentedOption<Density>[] {
  return [
    { value: 'comfortable', label: t('settings.density.comfortable') },
    { value: 'compact', label: t('settings.density.compact') },
  ];
}

function motionOptions(): readonly SegmentedOption<MotionSetting>[] {
  return [
    { value: 'system', label: t('settings.motion.system') },
    { value: 'reduced', label: t('settings.motion.reduced') },
    { value: 'full', label: t('settings.motion.full') },
  ];
}

function languageOptions(): readonly { value: LanguageSetting; label: string }[] {
  return [
    { value: 'auto', label: t('settings.language.auto') },
    ...(Object.keys(LOCALE_LABELS) as LocaleId[]).map((locale) => ({
      value: locale,
      label: t(`settings.language.${locale}`),
    })),
  ];
}

function isLanguage(value: string): value is LanguageSetting {
  return value === 'auto' || value in LOCALE_LABELS;
}

/** Theme, density, motion and language, applied by the shell's appearance watcher. */
export function AppearanceSection(): JSX.Element {
  const current = settings.value;

  return (
    <SettingsSection id={SETTINGS_APPEARANCE_ID} title={t('settings.section.appearance')}>
      <SettingsRow label={t('settings.theme')}>
        <Segmented
          label={t('settings.theme')}
          value={current.theme}
          options={themeOptions()}
          onChange={(theme) => updateSettings({ theme })}
        />
      </SettingsRow>
      <SettingsRow label={t('settings.density')}>
        <Segmented
          label={t('settings.density')}
          value={current.density}
          options={densityOptions()}
          onChange={(density) => updateSettings({ density })}
        />
      </SettingsRow>
      <SettingsRow label={t('settings.motion')}>
        <Segmented
          label={t('settings.motion')}
          value={current.motion}
          options={motionOptions()}
          onChange={(motion) => updateSettings({ motion })}
        />
      </SettingsRow>
      <SelectField
        id="settings-language"
        label={t('settings.language')}
        value={current.language}
        options={languageOptions()}
        onChange={(value) => {
          if (isLanguage(value)) updateSettings({ language: value });
        }}
      />
    </SettingsSection>
  );
}
