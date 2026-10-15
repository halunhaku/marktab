import { runtimeUrl } from './chrome';

const FAVICON_SIZE = 32;

/**
 * Favicon URL for the `favicon` permission's built-in resolver.
 *
 * The request never leaves the browser: Chrome resolves `/_favicon/` from its
 * own local cache, which is why MarkTab does not need host permissions.
 */
export function faviconUrl(pageUrl: string, size: number = FAVICON_SIZE): string | null {
  if (!pageUrl) return null;
  const base = runtimeUrl('/_favicon/');
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set('pageUrl', pageUrl);
    url.searchParams.set('size', String(size));
    return url.toString();
  } catch {
    return null;
  }
}

/** Single uppercased glyph used when no icon can be resolved. */
export function fallbackGlyph(title: string, url: string): string {
  const source = title.trim() || url;
  const stripped = source.replace(/^https?:\/\/(www\.)?/i, '');
  const char = [...stripped][0] ?? '?';
  return char.toUpperCase();
}

/** Deterministic hue in degrees for the fallback tile, derived from the host. */
export function glyphHue(url: string): number {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) % 360;
  }
  return hash;
}
