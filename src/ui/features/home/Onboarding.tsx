import type { JSX } from 'preact';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { Kbd } from '@/ui/components/Kbd';
import { t } from '@/locales';
import { openPalette } from '@/ui/state/router';
import { dismissOnboarding } from '@/ui/state/onboarding';
import styles from './Onboarding.module.css';

export interface OnboardingProps {
  /** Rendered only when the library is still empty. */
  onDismiss: () => void;
}

/**
 * First-run card.
 *
 * Shown on the home surface while the library is empty and never acknowledged
 * twice. It states the three things a new user has to know, offers the one action
 * worth taking, and then gets out of the way permanently.
 */
export function Onboarding({ onDismiss }: OnboardingProps): JSX.Element {
  const steps = [t('onboarding.step1'), t('onboarding.step2'), t('onboarding.step3')];
  return (
    <section class={styles.card} aria-labelledby="onboarding-title">
      <div class={styles.head}>
        <span class={styles.badge} aria-hidden="true">
          <Icon name="sparkle" size={16} />
        </span>
        <h2 class={styles.title} id="onboarding-title">
          {t('onboarding.title')}
        </h2>
      </div>
      <p class={styles.body}>
        {t('onboarding.body', { shortcut: '⌘K / Ctrl+K' })}
      </p>
      <ul class={styles.steps}>
        {steps.map((step) => (
          <li class={styles.step} key={step}>
            <Icon name="check" size={14} class={styles.stepIcon} />
            <span>{step}</span>
          </li>
        ))}
      </ul>
      <div class={styles.actions}>
        <Button variant="primary" icon="search" onClick={() => openPalette()}>
          {t('settings.shortcuts.open')}
        </Button>
        <Kbd shortcut="Mod+K" />
        <span class={styles.spacer} />
        <Button
          variant="ghost"
          onClick={() => {
            dismissOnboarding();
            onDismiss();
          }}
        >
          {t('onboarding.dismiss')}
        </Button>
      </div>
    </section>
  );
}
