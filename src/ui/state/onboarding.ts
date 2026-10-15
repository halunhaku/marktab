import { signal } from '@preact/signals';

/**
 * First-run welcome state.
 *
 * Kept in `localStorage` rather than `chrome.storage` on purpose: it is a
 * device-local acknowledgement, not a user preference, and keeping it out of the
 * synced settings object means the storage schema stays exactly as migrated from
 * MarkTab 2.x (nothing extra to migrate or repair).
 */
export const ONBOARDING_KEY = 'marktab.onboarding.v3';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'dismissed';
  } catch {
    return false;
  }
}

export const onboardingDismissed = signal(readDismissed());

export function dismissOnboarding(): void {
  onboardingDismissed.value = true;
  try {
    localStorage.setItem(ONBOARDING_KEY, 'dismissed');
  } catch {
    /* best-effort: the card simply reappears next session */
  }
}

/** Test seam: forgets the acknowledgement. */
export function resetOnboardingForTests(): void {
  onboardingDismissed.value = false;
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}
