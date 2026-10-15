import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { cx } from './cx';
import { closeMenu, menuState, type MenuItemSpec } from '../state/overlay';
import styles from './Menu.module.css';

export interface MenuProps {
  items: readonly MenuItemSpec[];
  anchor: { x: number; y: number; width: number; height: number };
  align?: 'start' | 'end';
  label: string;
  onClose: () => void;
}

const MARGIN = 8;
const GAP = 6;

/**
 * Anchored action list.
 *
 * Positioning is computed after layout so the panel reflects its real height,
 * then clamped to the viewport; it flips above the anchor when it would overflow
 * the bottom edge. Keyboard handling follows the ARIA menu pattern so the same
 * list works for right-click, `Enter` on a card and the `…` button.
 */
export function Menu({ items, anchor, align = 'end', label, onClose }: MenuProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; visible: boolean }>({
    top: anchor.y + anchor.height + GAP,
    left: anchor.x,
    visible: false,
  });
  const firstEnabled = items.findIndex((item) => !item.disabled);
  const [active, setActive] = useState(firstEnabled);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let left = align === 'end' ? anchor.x + anchor.width - rect.width : anchor.x;
    left = Math.max(MARGIN, Math.min(left, viewportW - rect.width - MARGIN));
    let top = anchor.y + anchor.height + GAP;
    if (top + rect.height > viewportH - MARGIN) {
      const flipped = anchor.y - rect.height - GAP;
      top = flipped >= MARGIN ? flipped : Math.max(MARGIN, viewportH - rect.height - MARGIN);
    }
    setPosition({ top, left, visible: true });
  }, [anchor.x, anchor.y, anchor.width, anchor.height, align, items.length]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const step = (direction: 1 | -1): void => {
    let index = active;
    for (let attempt = 0; attempt < items.length; attempt += 1) {
      index = (index + direction + items.length) % items.length;
      if (!items[index]?.disabled) break;
    }
    setActive(index);
  };

  const select = (item: MenuItemSpec | undefined): void => {
    if (!item || item.disabled) return;
    onClose();
    item.onSelect();
  };

  return (
    <div
      class={styles.panel}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      ref={panelRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        visibility: position.visible ? 'visible' : 'hidden',
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          step(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          setActive(firstEnabled);
        } else if (event.key === 'End') {
          event.preventDefault();
          setActive(items.length - 1);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(items[active]);
        } else if (event.key === 'Tab') {
          onClose();
        }
      }}
    >
      {items.map((item, index) => (
        <div key={item.id}>
          {item.newGroup && index > 0 ? <div class={styles.separator} role="separator" /> : null}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            class={cx(
              styles.item,
              item.danger && styles.danger,
              index === active && styles.active,
            )}
            onMouseEnter={() => setActive(index)}
            onClick={() => select(item)}
          >
            <span class={styles.glyph}>
              {item.icon ? <Icon name={item.icon} size={15} /> : null}
            </span>
            <span class={styles.label}>{item.label}</span>
            {item.shortcut ? <Kbd shortcut={item.shortcut} class={styles.shortcut} /> : null}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Renders the single menu requested through the overlay store. */
export function MenuHost(): JSX.Element | null {
  const state = menuState.value;
  if (!state) return null;
  return (
    <Menu
      items={state.items}
      anchor={state.anchor}
      align={state.align ?? 'end'}
      label={state.label}
      onClose={closeMenu}
    />
  );
}
