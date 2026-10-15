import type { JSX } from 'preact';
import { closeDialog, dialogState } from '@/ui/state/overlay';
import { DeleteDialog } from '@/ui/features/links/DeleteDialog';
import { MoveDialog } from '@/ui/features/links/MoveDialog';
import { RenameDialog } from '@/ui/features/links/RenameDialog';

/**
 * Renders the active bookmark dialog.
 *
 * Mounted once at the application root so a dialog opened from the palette, a card
 * menu or a folder row behaves identically and cannot end up nested inside a
 * transformed ancestor (which would break its fixed positioning).
 */
export function DialogHost(): JSX.Element | null {
  const state = dialogState.value;
  if (!state) return null;

  switch (state.kind) {
    case 'rename':
      return <RenameDialog target={state.target} onClose={closeDialog} />;
    case 'move':
      return <MoveDialog target={state.target} onClose={closeDialog} />;
    case 'delete':
      return <DeleteDialog target={state.target} onClose={closeDialog} />;
    default:
      return null;
  }
}
