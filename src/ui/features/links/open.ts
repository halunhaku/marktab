import { flushUserData, recordVisitFor } from '@/core/userdata/store';
import { openUrl } from '@/core/appearance';
import type { LinkItem } from '@/core/state/selectors';

export type OpenDisposition = 'current' | 'newTab' | 'newWindow';

/**
 * Records the visit, then navigates.
 *
 * Order matters: the recent list lives in `chrome.storage.local`, and a page that
 * navigates away cancels pending writes. Awaiting the flush before assigning
 * `location` costs a millisecond and is the difference between "Recently opened"
 * being trustworthy and being lossy.
 */
export function openLink(item: { url: string; title: string }, disposition: OpenDisposition = 'current'): void {
  recordVisitFor(item.url, item.title);
  if (disposition !== 'current') {
    openUrl(item.url, disposition);
    return;
  }
  void flushUserData().then(() => openUrl(item.url, 'current'));
}

export interface LinkAnchorOptions {
  item: Pick<LinkItem, 'url' | 'title'>;
  /** Disposition used for an unmodified primary click. */
  disposition?: OpenDisposition;
  onBeforeOpen?: () => void;
}

export interface LinkAnchorProps {
  href: string;
  onAuxClick: (event: MouseEvent) => void;
  onClick: (event: MouseEvent) => void;
}

/**
 * Anchor props shared by every bookmark surface.
 *
 * Rendering a real `<a href>` keeps platform behaviours for free: middle click,
 * ⌘/Ctrl click, "Open link in new tab" from the native context menu and the
 * status-bar preview. Only the unmodified primary click is intercepted, so the
 * visit is recorded before the page navigates.
 */
export function linkAnchorProps({
  item,
  disposition = 'current',
  onBeforeOpen,
}: LinkAnchorOptions): LinkAnchorProps {
  return {
    href: item.url,
    onAuxClick: (event: MouseEvent) => {
      // Middle click: the browser opens the tab, we only record the visit.
      if (event.button === 1) recordVisitFor(item.url, item.title);
    },
    onClick: (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      recordVisitFor(item.url, item.title);
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (modified || event.button !== 0) return;
      event.preventDefault();
      onBeforeOpen?.();
      openLink(item, disposition);
    },
  };
}
