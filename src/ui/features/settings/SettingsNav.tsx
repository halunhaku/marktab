import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Icon } from '@/ui/components/Icon';
import { cx } from '@/ui/components/cx';
import { prefersReducedMotion } from '@/core/appearance';
import { settings } from '@/core/state/signals';
import { t } from '@/locales';
import type { SettingsSectionMeta } from './sections';
import styles from './SettingsNav.module.css';

export interface SettingsNavProps {
  sections: readonly SettingsSectionMeta[];
}

/** Distance below the top of the scrollport that counts as "being read". */
const ACTIVE_OFFSET = 112;

/** Scroll animation that respects both the system and the in-app motion setting. */
function scrollBehavior(): ScrollBehavior {
  const { motion } = settings.value;
  if (motion === 'reduced') return 'auto';
  if (motion === 'full') return 'smooth';
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Sticky index of the settings sections.
 *
 * The page stays one scroll: the highlighted entry follows what is on screen, and
 * activating an entry scrolls its section in and hands focus over, which is what
 * makes the jump work for keyboard and screen-reader users too.
 */
export function SettingsNav({ sections }: SettingsNavProps): JSX.Element {
  const [active, setActive] = useState(() => sections[0]?.id ?? '');

  useEffect(() => {
    const container = document.getElementById(sections[0]?.id ?? '')?.closest('main') ?? null;
    const scroller: EventTarget = container ?? window;

    const sync = (): void => {
      const ceiling = (container?.getBoundingClientRect().top ?? 0) + ACTIVE_OFFSET;
      let current = sections[0]?.id ?? '';
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= ceiling) current = section.id;
      }
      setActive(current);
    };

    sync();
    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      scroller.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sections]);

  const goTo = (id: string): void => {
    const target = document.getElementById(id);
    if (!target) return;
    setActive(id);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };

  return (
    <nav class={styles.nav} aria-label={t('settings.title')}>
      <ul class={styles.list}>
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id}>
              <button
                type="button"
                class={cx(styles.link, current && styles.active)}
                aria-current={current ? 'true' : undefined}
                onClick={() => goTo(section.id)}
              >
                <Icon name={section.icon} size={15} />
                <span class={styles.label}>{t(section.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
