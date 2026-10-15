import { signal } from '@preact/signals';
import type { IconName } from '../components/Icon';
import type { LinkItem } from '@/core/state/selectors';

/**
 * Overlay state.
 *
 * Dialogs and context menus are declared as data in a signal and rendered by one
 * host at the application root. Two reasons: `position: fixed` is only reliable
 * outside a transformed ancestor (cards lift on hover), and a single host means a
 * single focus trap, escape handler and outside-click listener instead of one per
 * trigger.
 */

export interface MenuItemSpec {
  id: string;
  label: string;
  icon?: IconName;
  /** Shortcut hint rendered on the trailing edge. */
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Draws a hairline above this item. */
  newGroup?: boolean;
  onSelect: () => void;
}

export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MenuState {
  items: MenuItemSpec[];
  anchor: MenuAnchor;
  /** Which panel edge lines up with the anchor. */
  align?: 'start' | 'end';
  /** Accessible name for the menu. */
  label: string;
}

export const menuState = signal<MenuState | null>(null);

export function openMenu(state: MenuState): void {
  menuState.value = state;
}

export function closeMenu(): void {
  if (menuState.value) menuState.value = null;
}

/** Opens a menu anchored to the element that received the event. */
export function openMenuAt(
  target: EventTarget | null,
  items: MenuItemSpec[],
  label: string,
  align: 'start' | 'end' = 'end',
): void {
  if (!(target instanceof Element)) return;
  const rect = target.getBoundingClientRect();
  openMenu({
    items,
    label,
    align,
    anchor: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
  });
}

/** Bookmark dialogs are the only modals; settings owns its own confirm inline. */
export type DialogState =
  | { kind: 'rename'; target: LinkItem }
  | { kind: 'move'; target: LinkItem }
  | { kind: 'delete'; target: LinkItem };

export const dialogState = signal<DialogState | null>(null);

export function openDialog(state: DialogState): void {
  menuState.value = null;
  dialogState.value = state;
}

export function closeDialog(): void {
  if (dialogState.value) dialogState.value = null;
}

/** Test seam: clears both overlay stores. */
export function resetOverlaysForTests(): void {
  menuState.value = null;
  dialogState.value = null;
}
