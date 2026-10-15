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
