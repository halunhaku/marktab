import type { Page, Worker } from '@playwright/test';
import { expect, test, MOD, readStored, seedBookmarks, DATA_KEY, SETTINGS_KEY, type SeedNode } from './fixtures';

/**
 * The data path: reading the browser tree, keeping up with changes made outside
 * MarkTab, and every write that goes back into `chrome.bookmarks`.
 */
const LIBRARY: SeedNode[] = [
  {
    title: 'Dev',
    children: [
      { title: 'Vite', url: 'https://vite.dev/' },
      { title: 'GitHub', url: 'https://github.com/' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    ],
  },
  { title: 'Reading', children: [{ title: 'Hacker News', url: 'https://news.ycombinator.com/' }] },
];

/** The rail is the one navigation surface every view shares. */
const rail = (page: Page) => page.getByRole('complementary', { name: 'Main navigation' });

test.describe('bookmark data', () => {
  test('indexes bookmarks created while the page is open', async ({ newTab, worker }) => {
    await expect(rail(newTab).getByRole('button', { name: 'Dev' })).toHaveCount(0);

    await seedBookmarks(worker, LIBRARY);

    // No reload: the page's own `chrome.bookmarks` listeners drive this.
    await expect(rail(newTab).getByRole('button', { name: 'Dev' })).toBeVisible();
    await expect(rail(newTab).getByRole('button', { name: 'Reading' })).toBeVisible();
    // The home tiles count descendants, not just direct children.
    await expect(newTab.locator('[data-folder-id]').first()).toContainText('4 items');
  });

  test('opens a folder from the rail and shows its items', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    await expect(newTab.getByRole('heading', { level: 1, name: 'Dev' })).toBeVisible();
    await expect(newTab.locator('main [data-url]')).toHaveCount(3);
    await expect(newTab.locator('main [data-url="https://github.com/"]')).toBeVisible();

    const crumbs = newTab.getByRole('navigation', { name: 'Folders' });
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Dev');

    // The root folder's ancestors are navigable, and a fresh folder has no children.
    await expect(crumbs.getByRole('button').first()).toBeVisible();
    await expect(newTab.getByText('Subfolders')).toHaveCount(0);
  });

  test('filters inside a folder and clears the filter with Escape', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    const filter = newTab.getByLabel('Filter this folder');
    await filter.fill('vite');
    await expect(newTab.locator('main [data-url]')).toHaveCount(1);
    // One match reads as a singular count.
    await expect(newTab.getByText('1 item')).toBeVisible();

    await filter.press('Escape');
    await expect(filter).toHaveValue('');
    await expect(newTab.locator('main [data-url]')).toHaveCount(3);
  });

  test('sorts items and remembers the chosen layout', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    // Browser order is creation order: Vite, GitHub, MDN.
    await expect(newTab.locator('main [data-url]').first()).toHaveAttribute('data-url', 'https://vite.dev/');

    await newTab.getByRole('radio', { name: 'Title A–Z' }).click();
    await expect(newTab.locator('main [data-url]').first()).toHaveAttribute('data-url', 'https://github.com/');

    await newTab.getByRole('radio', { name: 'List view' }).click();
    await expect(newTab.locator('main [role="list"]')).toBeVisible();

    await expect
      .poll(async () => {
        const stored = await readStored<{ folders: { view: string; sort: string } }>(
          worker,
          'sync',
          SETTINGS_KEY,
        );
        return stored ? `${stored.folders.view}/${stored.folders.sort}` : null;
      })
      .toBe('list/title');

    // A reload always lands on Home, so walk back into the folder: the layout
    // and the sort are remembered, not just stored.
    await newTab.reload({ waitUntil: 'domcontentloaded' });
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();
    await expect(newTab.getByRole('radio', { name: 'List view' })).toBeChecked();
    await expect(newTab.locator('main [role="list"]')).toBeVisible();
    await expect(newTab.locator('main [data-url]').first()).toHaveAttribute('data-url', 'https://github.com/');
  });

  test('searches titles, URLs and folder names from one field', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await expect(rail(newTab).getByRole('button', { name: 'Dev' })).toBeVisible();

    const query = newTab.getByRole('combobox', { name: 'Search bookmarks' });

    await newTab.keyboard.press(`${MOD}+k`);
    await query.fill('mozilla');
    await expect(newTab.locator('[role="option"][data-url="https://developer.mozilla.org/"]')).toBeVisible();

    // A folder-only query still finds the folder.
    await query.fill('reading');
    await expect(newTab.locator('[role="option"][data-kind="folder"]')).toHaveCount(1);

    await query.fill('zzzz');
    await expect(newTab.getByText('No matches for “zzzz”')).toBeVisible();
  });

  test('opens a result in a new tab and records it as recently opened', async ({ newTab, context, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await expect(rail(newTab).getByRole('button', { name: 'Dev' })).toBeVisible();

    await newTab.keyboard.press(`${MOD}+k`);
    await newTab.getByRole('combobox', { name: 'Search bookmarks' }).fill('github');

    // The palette builds its rows and its active row from one model, and the
    // web-search row is appended to every non-empty query. Until the bookmark
    // result has painted, the only row is that web search for "github", so a
    // keystroke sent at that moment opens google.com in a new tab instead. Wait
    // for the result itself before pressing a key that acts on it.
    await expect(newTab.locator('[role="option"][data-url="https://github.com/"]')).toBeVisible();

    const opened = context.waitForEvent('page');
    await newTab.keyboard.press('Shift+Enter');
    const tab = await opened;
    expect(new URL(tab.url()).host).toBe('github.com');
    await tab.close();

    // Opening from MarkTab is what feeds the recents list.
    await newTab.keyboard.press(`${MOD}+2`);
    await expect(newTab.locator('[data-url="https://github.com/"]')).toBeVisible();
  });

  test('pins from a card and keeps the pin across reloads', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    const card = newTab.locator('[data-url="https://github.com/"]');
    await card.getByRole('button', { name: 'Pin' }).click();
    await expect(newTab.getByText('Pinned to MarkTab')).toBeVisible();
    await expect(rail(newTab).getByRole('button', { name: 'Pinned' })).toHaveAttribute('title', 'Pinned · 1');

    // The write is debounced; pagehide must flush it before the reload.
    await expect
      .poll(async () => (await readStored<{ pins: unknown[] }>(worker, 'local', DATA_KEY))?.pins.length)
      .toBe(1);

    await newTab.reload({ waitUntil: 'domcontentloaded' });
    // Home is the route after a reload, and the pinned row is where a pin shows up.
    await expect(newTab.getByRole('heading', { name: 'Pinned', level: 2 })).toBeVisible();
    await expect(
      newTab.locator('[data-url="https://github.com/"]').getByRole('button', { name: 'Unpin' }),
    ).toBeVisible();
  });

  test('keeps a pinned card’s controls visible at rest', async ({ newTab, worker }) => {
    // `pinActive { opacity: 1 }` cannot beat its parent cluster's `opacity: 0`, so
    // the "a pinned card shows its state without hovering" rule lives on `.pinned`.
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    const clusterOpacity = (url: string): Promise<string | null> =>
      newTab.locator(`[data-url="${url}"]`).evaluate((element) => {
        const pin = element.querySelector('button[aria-label="Pin"], button[aria-label="Unpin"]');
        return pin?.parentElement ? getComputedStyle(pin.parentElement).opacity : null;
      });

    // `:hover` and `:focus-within` also reveal the cluster, so the pointer and
    // the focus have to be off the card for this to test the at-rest state.
    const settle = async (): Promise<void> => {
      await newTab.mouse.move(1270, 760);
      await newTab.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
    };

    // The cluster fades over `--dur-fast`, so poll rather than sampling the
    // first frame of the transition.
    await settle();
    await expect.poll(() => clusterOpacity('https://github.com/')).toBe('0');
    await newTab.locator('[data-url="https://github.com/"]').getByRole('button', { name: 'Pin' }).click();
    await expect(newTab.getByText('Pinned to MarkTab')).toBeVisible();
    await settle();
    await expect.poll(() => clusterOpacity('https://github.com/')).toBe('1');
  });

  test('reorders pinned bookmarks and labels their order', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();
    await newTab.locator('[data-url="https://github.com/"]').getByRole('button', { name: 'Pin' }).click();
    await newTab
      .locator('[data-url="https://developer.mozilla.org/"]')
      .getByRole('button', { name: 'Pin' })
      .click();

    await rail(newTab).getByRole('button', { name: 'Pinned' }).click();
    const cards = newTab.locator('main [data-url]');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute('data-url', 'https://github.com/');

    // The position label sits above its card and never overprints the card's
    // favicon: the badge must not intersect the icon, and the icon must be the
    // topmost thing at its own centre.
    const labels = await newTab.evaluate(() => {
      const badges = [...document.querySelectorAll('main span')].filter((span) =>
        /^\d\d$/.test(span.textContent ?? ''),
      );
      return badges.map((badge) => {
        const slot = badge.parentElement;
        const card = slot?.querySelector('[data-url]');
        const icon = card?.querySelector('span');
        const badgeRect = badge.getBoundingClientRect();
        const cardRect = card?.getBoundingClientRect();
        const iconRect = icon?.getBoundingClientRect();
        const overlapsIcon = iconRect
          ? !(
              badgeRect.right <= iconRect.left ||
              badgeRect.left >= iconRect.right ||
              badgeRect.bottom <= iconRect.top ||
              badgeRect.top >= iconRect.bottom
            )
          : true;
        const topmost =
          iconRect && iconRect.width > 0
            ? (document.elementsFromPoint(iconRect.left + iconRect.width / 2, iconRect.top + iconRect.height / 2)[0] ??
              null)
            : null;
        return {
          text: badge.textContent,
          aboveCard: cardRect ? badgeRect.bottom <= cardRect.top + 0.5 : false,
          overlapsIcon,
          iconOnTop: icon !== null && icon !== undefined && topmost !== null && (topmost === icon || icon.contains(topmost)),
        };
      });
    });
    expect(labels.map((entry) => entry.text)).toEqual(['01', '02']);
    expect(
      labels.every((entry) => entry.aboveCard && !entry.overlapsIcon && entry.iconOnTop),
      JSON.stringify(labels),
    ).toBe(true);

    // Moving the first pin down swaps the order, in the view and in storage.
    await newTab.getByRole('button', { name: 'Move down' }).first().click();
    await expect(cards.nth(0)).toHaveAttribute('data-url', 'https://developer.mozilla.org/');
    await expect
      .poll(async () => (await readStored<{ pins: { url: string }[] }>(worker, 'local', DATA_KEY))?.pins.map((pin) => pin.url))
      .toEqual(['https://developer.mozilla.org/', 'https://github.com/']);
  });

  test('deletes a bookmark and restores it through the toast undo', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    const card = newTab.locator('[data-url="https://github.com/"]');
    await card.getByRole('button', { name: 'More actions' }).click();
    await newTab.getByRole('menuitem', { name: 'Delete bookmark' }).click();

    const dialog = newTab.getByRole('dialog');
    await expect(dialog).toContainText('Delete “GitHub”?');
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(newTab.getByText('Deleted “GitHub”')).toBeVisible();
    await expect(newTab.locator('main [data-url="https://github.com/"]')).toHaveCount(0);
    expect(await storedBookmarkCount(worker, 'https://github.com/')).toBe(0);

    await newTab.getByRole('button', { name: 'Undo' }).click();
    await expect(newTab.getByText('Bookmark restored')).toBeVisible();
    await expect(newTab.locator('main [data-url="https://github.com/"]')).toHaveCount(1);
    expect(await storedBookmarkCount(worker, 'https://github.com/')).toBe(1);
  });

  test('keeps a very long title clear of the card controls', async ({ newTab, worker }) => {
    // A 200-character title is ordinary in a real library. The card's pin and
    // "more" buttons are absolutely positioned in its top-right corner, so the
    // copy block has to reserve that corner — otherwise the first line slides
    // under the buttons — and the list row has to reserve it in flow, or a long
    // title would push the buttons out of the row.
    const longTitle = `Long title ${'with many words '.repeat(12)}that keeps going`;
    await seedBookmarks(worker, [{ title: 'Layout', children: [{ title: longTitle, url: 'https://long.example/' }] }]);
    await rail(newTab).getByRole('button', { name: 'Layout' }).click();

    const card = newTab.locator('[data-url="https://long.example/"]');
    await expect(card).toBeVisible();
    await card.hover();
    const pin = card.getByRole('button', { name: 'Pin' });
    await expect(pin).toBeVisible();

    const geometry = await card.evaluate((element) => {
      const button = element.querySelector('button[aria-label="Pin"], button[aria-label="Unpin"]');
      const title = [...element.querySelectorAll('span')].find((span) =>
        span.textContent?.startsWith('Long title with many words'),
      );
      const box = element.getBoundingClientRect();
      const pinBox = button?.getBoundingClientRect();
      let textBox: DOMRect | null = null;
      if (title?.firstChild) {
        const range = document.createRange();
        range.selectNodeContents(title);
        textBox = range.getBoundingClientRect();
      }
      return {
        pinInsideCard: pinBox ? pinBox.right <= box.right + 0.5 : false,
        textClearOfControls: textBox && pinBox ? textBox.right <= pinBox.left : false,
      };
    });

    expect(geometry.pinInsideCard).toBe(true);
    expect(geometry.textClearOfControls).toBe(true);

    // The same title in list view must not push the controls out of the row.
    await newTab.getByRole('radio', { name: 'List view' }).click();
    await expect(card).toBeVisible();
    await card.hover();
    const rowGeometry = await card.evaluate((element) => {
      const button = element.querySelector('button[aria-label="Pin"], button[aria-label="Unpin"]');
      const box = element.getBoundingClientRect();
      const pinBox = button?.getBoundingClientRect();
      return {
        pinInsideRow: pinBox ? pinBox.right <= box.right + 0.5 : false,
        rowOverflows: element.scrollWidth > element.clientWidth + 1,
      };
    });
    expect(rowGeometry.pinInsideRow).toBe(true);
    expect(rowGeometry.rowOverflows).toBe(false);
  });

  test('hides a folder from the rail and brings it back from settings', async ({ newTab, worker }) => {
    await seedBookmarks(worker, LIBRARY);
    await rail(newTab).getByRole('button', { name: 'Dev' }).click();

    await newTab.getByRole('button', { name: 'Hide this folder' }).click();
    await expect(newTab.getByText('Folder hidden')).toBeVisible();
    // Hiding only affects MarkTab's navigation, and it leaves the folder view.
    await expect(rail(newTab).getByRole('button', { name: 'Dev' })).toHaveCount(0);

    await newTab.keyboard.press(`${MOD}+,`);
    await newTab.getByRole('button', { name: 'Show again' }).click();
    await expect(rail(newTab).getByRole('button', { name: 'Dev' })).toBeVisible();
  });
});

/** Reads the browser tree directly, so assertions never depend on our own UI. */
async function storedBookmarkCount(worker: Worker, url: string): Promise<number> {
  return worker.evaluate(async (target) => {
    const found = await chrome.bookmarks.search({ url: target });
    return found.length;
  }, url);
}
