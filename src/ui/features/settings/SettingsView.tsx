import type { JSX } from 'preact';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { t } from '@/locales';
import { AboutSection } from './AboutSection';
import { AppearanceSection } from './AppearanceSection';
import { DataSection } from './DataSection';
import { FoldersSection } from './FoldersSection';
import { HomeSection } from './HomeSection';
import { SearchSection } from './SearchSection';
import { SettingsNav } from './SettingsNav';
import { SETTINGS_SECTIONS } from './sections';
import styles from './SettingsView.module.css';

/**
 * Settings page.
 *
 * One scrolling column with a sticky index beside it, so every preference is
 * reachable without a second level of navigation. Each section reads and writes
 * the settings store directly, which keeps it in step with the popup, other tabs
 * and its own controls.
 */
export function SettingsView(): JSX.Element {
  return (
    <section class={styles.view} aria-label={t('settings.title')}>
      <SectionHeader title={t('settings.title')} level="page" />
      <div class={styles.layout}>
        <SettingsNav sections={SETTINGS_SECTIONS} />
        <div class={styles.stack}>
          <AppearanceSection />
          <HomeSection />
          <SearchSection />
          <FoldersSection />
          <DataSection />
          <AboutSection />
        </div>
      </div>
    </section>
  );
}
