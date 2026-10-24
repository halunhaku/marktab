import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { fallbackGlyph, faviconUrl, glyphHue } from '@/core/platform/favicon';
import { cx } from './cx';
import styles from './Favicon.module.css';

export interface FaviconProps {
  url: string;
  title: string;
  /** Tile size in CSS pixels. */
  size?: number;
  /** When false, the deterministic glyph tile is rendered without any request. */
  enabled?: boolean;
  class?: string;
}

/**
 * Site icon tile.
 *
 * The image is resolved by the browser's own `_favicon` cache, so no third party
 * is contacted and no host permission is needed. When resolution fails (or icons
 * are switched off) the tile falls back to the first letter of the title on a hue
 * derived from the host, which keeps rows visually scannable without any network
 * dependency.
 */
export function Favicon({ url, title, size = 20, enabled = true, class: className }: FaviconProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const source = enabled ? faviconUrl(url, Math.max(32, size * 2)) : null;

  useEffect(() => {
    setFailed(false);
  }, [url, source]);

  const showImage = Boolean(source) && !failed;

  return (
    <span
      class={cx(styles.tile, className)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      data-fallback={showImage ? undefined : 'true'}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          class={styles.image}
          src={source as string}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <span class={styles.glyph} style={{ background: `hsl(${glyphHue(url)} 62% 52% / 0.16)` }}>
          {fallbackGlyph(title, url)}
        </span>
      )}
    </span>
  );
}
