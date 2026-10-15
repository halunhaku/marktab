import type { MessageKey } from '@/locales';
import type { IconName } from '@/ui/components/Icon';

/**
 * Section registry.
 *
 * The page and its sticky navigation render from this one list, so the order,
 * the anchor ids and the labels can never drift apart.
 */
export const SETTINGS_APPEARANCE_ID = 'settings-appearance';
export const SETTINGS_HOME_ID = 'settings-home';
export const SETTINGS_SEARCH_ID = 'settings-search';
export const SETTINGS_FOLDERS_ID = 'settings-folders';
export const SETTINGS_DATA_ID = 'settings-data';
export const SETTINGS_ABOUT_ID = 'settings-about';

export interface SettingsSectionMeta {
  /** Also the DOM id of the rendered `<section>`, used as the anchor target. */
  id: string;
  icon: IconName;
  labelKey: MessageKey;
}

export const SETTINGS_SECTIONS: readonly SettingsSectionMeta[] = [
  { id: SETTINGS_APPEARANCE_ID, icon: 'sun', labelKey: 'settings.section.appearance' },
  { id: SETTINGS_HOME_ID, icon: 'home', labelKey: 'settings.section.home' },
  { id: SETTINGS_SEARCH_ID, icon: 'search', labelKey: 'settings.section.search' },
  { id: SETTINGS_FOLDERS_ID, icon: 'folder', labelKey: 'settings.section.folders' },
  { id: SETTINGS_DATA_ID, icon: 'layers', labelKey: 'settings.section.data' },
  { id: SETTINGS_ABOUT_ID, icon: 'info', labelKey: 'settings.section.about' },
];
