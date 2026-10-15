import type { JSX } from 'preact';
import { cx } from './cx';
import styles from './Kbd.module.css';

/** True when running on macOS, where the command key glyph is used. */
export function isMacPlatform(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset['platform'] === 'mac';
}

const MAC_GLYPHS: Record<string, string> = {
  Mod: '⌘',
  Cmd: '⌘',
  Shift: '⇧',
  Alt: '⌥',
  Ctrl: '⌃',
  Enter: '↩',
  Backspace: '⌫',
  Escape: 'esc',
  Esc: 'esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'space',
};

/** Splits a shortcut such as `Mod+K` into display glyphs for the current OS. */
export function keycaps(shortcut: string): string[] {
  const mac = isMacPlatform();
  return shortcut.split('+').map((part) => {
    const key = part.trim();
    if (!mac && (key === 'Mod' || key === 'Cmd')) return 'Ctrl';
    if (mac && key === 'Ctrl') return '⌃';
    if (key.length === 1) return key.toUpperCase();
    return MAC_GLYPHS[key] ?? key;
  });
}

export interface KbdProps {
  /** e.g. `Mod+K`, `Shift+Enter`, or an array for sequential chords. */
  shortcut: string | string[];
  class?: string;
}

export function Kbd({ shortcut, class: className }: KbdProps): JSX.Element {
  const groups = Array.isArray(shortcut) ? shortcut : [shortcut];
  return (
    <span class={cx(styles.group, className)}>
      {groups.map((group, groupIndex) => (
        <>
          {groupIndex > 0 ? (
            <span key={`sep-${group}`} class={styles.then}>
              then
            </span>
          ) : null}
          {keycaps(group).map((cap, index) => (
            <kbd key={`${group}-${cap}-${index}`} class={styles.key}>
              {cap}
            </kbd>
          ))}
        </>
      ))}
    </span>
  );
}
