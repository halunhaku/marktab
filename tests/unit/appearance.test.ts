import { describe, expect, it, vi } from 'vitest';
import {
  APPEARANCE_CACHE_KEY,
  applyAppearance,
  prefersDark,
  prefersReducedMotion,
  readAppearanceCache,
  resolveAppearance,
  watchSystemAppearance,
  writeAppearanceCache,
  type Appearance,
} from '@/core/appearance';
import type { Settings } from '@/core/settings/types';

type ThemeSetting = Settings['theme'];
type MotionSetting = Settings['motion'];

/** `[systemDark=false, systemDark=true]`. */
const EXPECTED_THEME: Record<ThemeSetting, [string, string]> = {
  light: ['light', 'light'],
  dark: ['dark', 'dark'],
  system: ['light', 'dark'],
};

/** `[systemReducedMotion=false, systemReducedMotion=true]`. */
const EXPECTED_MOTION: Record<MotionSetting, [string, string]> = {
  system: ['full', 'reduced'],
  reduced: ['reduced', 'reduced'],
  full: ['full', 'full'],
};

const THEMES: ThemeSetting[] = ['light', 'dark', 'system'];
const MOTIONS: MotionSetting[] = ['system', 'reduced', 'full'];

describe('resolveAppearance', () => {
  it('covers every theme × system-dark × motion × reduced-motion combination', () => {
    let combinations = 0;

    for (const theme of THEMES) {
      for (const motion of MOTIONS) {
        for (const systemDark of [false, true]) {
          for (const systemReducedMotion of [false, true]) {
            const resolved = resolveAppearance(
              { theme, motion, density: 'compact', language: 'zh' },
              systemDark,
              systemReducedMotion,
            );

            const expectedTheme = EXPECTED_THEME[theme][systemDark ? 1 : 0];
            const expectedMotion = EXPECTED_MOTION[motion][systemReducedMotion ? 1 : 0];
            expect(resolved).toEqual({
              theme: expectedTheme,
              motion: expectedMotion,
              density: 'compact',
              locale: 'zh',
            });
            combinations += 1;
          }
        }
      }
    }

    expect(combinations).toBe(THEMES.length * MOTIONS.length * 4);
  });

  it('follows the system preference only for the system theme', () => {
    const base = { density: 'comfortable', language: 'auto' } as const;

    expect(resolveAppearance({ ...base, theme: 'light', motion: 'full' }, true, false).theme).toBe('light');
    expect(resolveAppearance({ ...base, theme: 'dark', motion: 'full' }, false, false).theme).toBe('dark');
    expect(resolveAppearance({ ...base, theme: 'system', motion: 'full' }, true, false).theme).toBe('dark');
    expect(resolveAppearance({ ...base, theme: 'system', motion: 'full' }, false, false).theme).toBe('light');
  });

  it('lets an explicit reduced-motion setting win over the system preference', () => {
    const base = { density: 'comfortable', language: 'auto' } as const;

    expect(resolveAppearance({ ...base, theme: 'light', motion: 'reduced' }, false, false).motion).toBe(
      'reduced',
    );
    expect(resolveAppearance({ ...base, theme: 'light', motion: 'full' }, false, true).motion).toBe('full');
    expect(resolveAppearance({ ...base, theme: 'light', motion: 'system' }, false, true).motion).toBe(
      'reduced',
    );
    expect(resolveAppearance({ ...base, theme: 'light', motion: 'system' }, false, false).motion).toBe('full');
  });

  it('passes density and language through untouched', () => {
    const resolved = resolveAppearance(
      { theme: 'system', density: 'compact', motion: 'system', language: 'zh' },
      false,
      true,
    );

    expect(resolved.density).toBe('compact');
    expect(resolved.locale).toBe('zh');
  });
});

describe('applyAppearance', () => {
  it('writes the resolved appearance onto the document root', () => {
    const appearance: Appearance = { theme: 'dark', density: 'compact', motion: 'reduced', locale: 'zh' };

    applyAppearance(appearance);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.density).toBe('compact');
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('overwrites a previously applied appearance', () => {
    applyAppearance({ theme: 'dark', density: 'compact', motion: 'reduced', locale: 'zh' });
    applyAppearance({ theme: 'light', density: 'comfortable', motion: 'full', locale: 'en' });

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.density).toBe('comfortable');
    expect(document.documentElement.dataset.motion).toBe('full');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('accepts an explicit document', () => {
    const other = document.implementation.createHTMLDocument('other');
    applyAppearance({ theme: 'dark', density: 'compact', motion: 'reduced', locale: 'en' }, other);

    expect(other.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).not.toBe('dark');
  });

  it('writes only the three appearance attributes', () => {
    const fresh = document.implementation.createHTMLDocument('fresh');
    expect(fresh.documentElement.attributes).toHaveLength(0);

    applyAppearance({ theme: 'dark', density: 'compact', motion: 'reduced', locale: 'en' }, fresh);

    const attributes = [...fresh.documentElement.attributes]
      .map((attribute) => attribute.name)
      .sort();
    expect(attributes).toEqual(['data-density', 'data-motion', 'data-theme', 'style']);
  });
});

describe('readAppearanceCache / writeAppearanceCache', () => {
  it('round-trips through localStorage', () => {
    const cached = { theme: 'dark', density: 'compact', motion: 'reduced' } as const;

    writeAppearanceCache(cached);

    expect(localStorage.getItem(APPEARANCE_CACHE_KEY)).toBe(JSON.stringify(cached));
    expect(readAppearanceCache()).toEqual(cached);
  });

  it('returns null when nothing was cached', () => {
    expect(readAppearanceCache()).toBeNull();
  });

  it('tolerates corrupt JSON and non-object payloads', () => {
    for (const raw of ['{oops', '42', '"dark"', 'true']) {
      localStorage.setItem(APPEARANCE_CACHE_KEY, raw);
      expect(readAppearanceCache()).toBeNull();
    }

    localStorage.setItem(APPEARANCE_CACHE_KEY, 'null');
    expect(readAppearanceCache()).toBeNull();
  });

  it('fills missing fields and drops unknown ones', () => {
    localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify({ theme: 'dark', extra: 1 }));

    expect(readAppearanceCache()).toEqual({ theme: 'dark', density: 'comfortable', motion: 'system' });
  });

  it('survives a storage that throws', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
    });

    expect(readAppearanceCache()).toBeNull();
    expect(() => writeAppearanceCache({ theme: 'dark', density: 'compact', motion: 'full' })).not.toThrow();
  });
});

describe('system preference helpers', () => {
  it('reads the dark and reduced-motion media queries', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(prefers-color-scheme: dark)' })),
    );

    expect(prefersDark()).toBe(true);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reports both preferences as off when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(prefersDark()).toBe(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('subscribes to both media queries and unsubscribes on dispose', () => {
    const listeners = new Map<string, Set<() => void>>();
    const mediaQueries = vi.fn((query: string) => {
      const set = new Set<() => void>();
      listeners.set(query, set);
      return {
        matches: false,
        addEventListener: (_type: string, listener: () => void) => set.add(listener),
        removeEventListener: (_type: string, listener: () => void) => set.delete(listener),
      };
    });
    vi.stubGlobal('matchMedia', mediaQueries);

    let calls = 0;
    const dispose = watchSystemAppearance(() => {
      calls += 1;
    });

    expect(mediaQueries).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(mediaQueries).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    const darkListeners = listeners.get('(prefers-color-scheme: dark)');
    const motionListeners = listeners.get('(prefers-reduced-motion: reduce)');
    expect(darkListeners?.size).toBe(1);
    expect(motionListeners?.size).toBe(1);

    for (const listener of darkListeners ?? []) listener();
    expect(calls).toBe(1);

    dispose();

    expect(darkListeners?.size).toBe(0);
    expect(motionListeners?.size).toBe(0);
    for (const listener of darkListeners ?? []) listener();
    expect(calls).toBe(1);
  });

  it('returns a no-op disposer when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);

    const dispose = watchSystemAppearance(() => {
      throw new Error('must not be called');
    });

    expect(() => dispose()).not.toThrow();
  });
});
