import { effect } from '@preact/signals';
import { render } from 'preact';
import '@/ui/styles/tokens.css';
import '@/ui/styles/base.css';
import {
  applyAppearance,
  prefersDark,
  prefersReducedMotion,
  resolveAppearance,
  watchSystemAppearance,
  writeAppearanceCache,
} from '@/core/appearance';
import { installPersistenceHooks } from '@/core/state/bootstrap';
import { settings } from '@/core/settings/store';
import { currentLocale, localeTag } from '@/locales';
import { PopupApp } from '@/ui/features/popup/PopupApp';
// Installs the input-modality mirror the stylesheets read (`[data-input]`), so the
// popup's "saved" confirmation paints at once when the button was pressed from the
// keyboard (ADR-024).
import '@/ui/motion';

/**
 * Toolbar popup entry.
 *
 * `theme-boot.js` already painted the cached theme before this module ran, so
 * nothing here is allowed to block: the stylesheets are imported for their side
 * effect and the panel is mounted straight away. State hydration is the panel's
 * job (`PopupApp` calls `bootstrapState()`), which keeps the first frame
 * independent of `chrome.storage`.
 */
installPersistenceHooks();

const root = document.getElementById('marktab-popup-root');

if (root) {
  // Resolves the stored preference against the OS colour scheme and the OS
  // reduced-motion flag, and keeps `<html>` (plus the paint cache the boot
  // script reads) in sync whenever any of the three inputs change.
  effect(() => {
    const current = settings.value;
    applyAppearance(resolveAppearance(current, prefersDark(), prefersReducedMotion()));
    writeAppearanceCache({
      theme: current.theme,
      density: current.density,
      motion: current.motion,
    });
  });

  // Screen readers get the language the copy is actually rendered in.
  effect(() => {
    document.documentElement.lang = localeTag(currentLocale.value);
  });

  // `data-theme` is written above; this covers the OS flipping mid-session.
  watchSystemAppearance(() => {
    const current = settings.value;
    applyAppearance(resolveAppearance(current, prefersDark(), prefersReducedMotion()));
  });

  delete document.documentElement.dataset['booting'];
  render(<PopupApp />, root);
}
