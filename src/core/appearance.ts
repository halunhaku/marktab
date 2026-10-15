import { getChrome } from './platform/chrome';
import { canOpenUrl } from './util/url';
import type { Settings } from './settings/types';

export type ResolvedTheme = 'light' | 'dark';
export type ResolvedMotion = 'full' | 'reduced';

export interface Appearance {
  theme: ResolvedTheme;
  density: Settings['density'];
  motion: ResolvedMotion;
  locale: Settings['language'];
}

/** localStorage key used purely as a paint cache to avoid a first-paint flash. */
export const APPEARANCE_CACHE_KEY = 'marktab.appearance.v3';

export interface CachedAppearance {
  theme: Settings['theme'];
  density: Settings['density'];
  motion: Settings['motion'];
}

export function prefersDark(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveAppearance(
  settings: Pick<Settings, 'theme' | 'density' | 'motion' | 'language'>,
  systemDark: boolean,
  systemReducedMotion: boolean,
): Appearance {
  const theme: ResolvedTheme =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;
  const motion: ResolvedMotion =
    settings.motion === 'system'
      ? systemReducedMotion
        ? 'reduced'
        : 'full'
      : settings.motion === 'reduced'
        ? 'reduced'
        : 'full';
  return { theme, density: settings.density, motion, locale: settings.language };
}

export function readAppearanceCache(): CachedAppearance | null {
  try {
    const raw = localStorage.getItem(APPEARANCE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedAppearance>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      theme: parsed.theme ?? 'system',
      density: parsed.density ?? 'comfortable',
      motion: parsed.motion ?? 'system',
    };
  } catch {
    return null;
  }
}

export function writeAppearanceCache(value: CachedAppearance): void {
  try {
    localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(value));
  } catch {
    /* cache is best-effort */
  }
}

/** Writes the resolved appearance onto `<html>` so CSS can react. */
export function applyAppearance(appearance: Appearance, doc: Document = document): void {
  const root = doc.documentElement;
  root.dataset['theme'] = appearance.theme;
  root.dataset['density'] = appearance.density;
  root.dataset['motion'] = appearance.motion;
  root.style.colorScheme = appearance.theme;
}

export function watchSystemAppearance(onChange: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => {};
  const queries = [
    matchMedia('(prefers-color-scheme: dark)'),
    matchMedia('(prefers-reduced-motion: reduce)'),
  ];
  for (const query of queries) query.addEventListener('change', onChange);
  return () => {
    for (const query of queries) query.removeEventListener('change', onChange);
  };
}

export function openUrl(url: string, disposition: 'current' | 'newTab' | 'newWindow' = 'current'): void {
  // The allow-list applies to all three dispositions: a new tab and a new window
  // are just as capable of navigating somewhere MarkTab should not.
  if (!canOpenUrl(url)) return;
  const chromeApi = getChrome();
  if (disposition === 'current') {
    if (typeof location !== 'undefined') location.href = url;
    return;
  }
  if (chromeApi?.tabs?.create) {
    void chromeApi.tabs.create({ url, active: true });
    return;
  }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
}

/** Best-effort clipboard write that works from an extension page and from tests. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.('copy') ?? false;
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
