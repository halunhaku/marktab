import { useEffect } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import {
  applyAppearance,
  prefersDark,
  prefersReducedMotion,
  resolveAppearance,
  watchSystemAppearance,
  writeAppearanceCache,
} from '@/core/appearance';
import { settings } from '@/core/settings/store';
import { currentLocale, localeTag } from '@/locales';

/**
 * Keeps `<html>` in sync with the resolved appearance and language.
 *
 * Three inputs can change the painted theme: the stored preference, the OS
 * colour scheme, and the OS reduced-motion flag. All three funnel through this
 * hook, which also refreshes the localStorage paint cache that `theme-boot.js`
 * reads before the first frame.
 */
export function useAppearance(): void {
  useSignalEffect(() => {
    const current = settings.value;
    const appearance = resolveAppearance(current, prefersDark(), prefersReducedMotion());
    applyAppearance(appearance);
    writeAppearanceCache({
      theme: current.theme,
      density: current.density,
      motion: current.motion,
    });
  });

  useSignalEffect(() => {
    const locale = currentLocale.value;
    document.documentElement.lang = localeTag(locale);
  });

  useSignalEffect(() => {
    // Reading the signal here is what makes the hook re-apply on changes.
    settings.value.theme;
    settings.value.motion;
    return watchSystemAppearance(() => {
      const current = settings.value;
      applyAppearance(resolveAppearance(current, prefersDark(), prefersReducedMotion()));
    });
  });

  useEffect(() => {
    // First paint already happened via the block-level boot script; this clears
    // the marker so global "still booting" styles stop applying.
    delete document.documentElement.dataset['booting'];
  }, []);
}
