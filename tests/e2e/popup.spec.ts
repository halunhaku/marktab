import { expect, test, readStored, seedBookmarks, SETTINGS_KEY, type SeedNode } from './fixtures';

/**
 * The toolbar popup: the same core state as the new tab page, in a 360px panel.
 * (`popup.html` is loaded directly, so the "active tab" it reads is itself —
 * which is exactly the shape of the real browser-action popup.)
 */
const LIBRARY: SeedNode[] = [
  {
    title: 'Dev',
    children: [
      { title: 'GitHub', url: 'https://github.com/' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    ],
  },
  { title: 'Reading', children: [{ title: 'Hacker News', url: 'https://news.ycombinator.com/' }] },
];

test.describe('popup', () => {
  test('reports the real library size', async ({ openPage, worker }) => {
    // In the browser the popup is created fresh on every toolbar click, so the
    // library exists before it mounts; seed first, then open it.
    await seedBookmarks(worker, LIBRARY);
    const popup = await openPage('popup.html');

    const stats = popup.getByRole('region', { name: 'Your library' });
    // 3 seeded bookmarks and 4 folders (two of them the browser's own roots).
    await expect(stats).toContainText(/3\s*bookmarks/);
    await expect(stats).toContainText(/4\s*folders/);
  });

  test('hands a query over to the new tab page', async ({ popup, context }) => {
    const opened = context.waitForEvent('page');
    const field = popup.getByLabel('Search bookmarks');
    await field.fill('github');
    // Submitting closes the panel, exactly as the real popup does, so the
    // keystroke's own promise can reject after the close: that is expected.
    await field.press('Enter').catch(() => undefined);

    const tab = await opened;
    await tab.waitForLoadState('domcontentloaded');
    expect(tab.url()).toContain('newtab.html?q=github');
    await expect(tab.getByRole('combobox', { name: 'Search bookmarks' })).toHaveValue('github');
    await tab.close();
  });

  test('cycles the theme through the three modes', async ({ popup, worker }) => {
    const toggle = popup.getByRole('button', { name: /Switch to .* theme/ });
    await expect(toggle).toBeVisible();

    // The cycle is system → light → dark, so the button always names its target.
    await toggle.click();
    await expect
      .poll(async () => (await readStored<{ theme: string }>(worker, 'sync', SETTINGS_KEY))?.theme)
      .toBe('light');
    await expect(popup.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(popup.getByRole('button', { name: 'Switch to Dark theme' })).toBeVisible();

    await toggle.click();
    await expect
      .poll(async () => (await readStored<{ theme: string }>(worker, 'sync', SETTINGS_KEY))?.theme)
      .toBe('dark');
    await expect(popup.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('explains itself when the current page cannot be bookmarked', async ({ popup, worker }) => {
    // `activeTab` is only granted by a real toolbar invocation, so a page loaded
    // as a tab has no page to read. The panel must say so instead of offering a
    // button that could not work.
    const card = popup.getByRole('region', { name: 'Bookmark this page' });
    await expect(card).toContainText(/No active tab found|This page cannot be bookmarked/);
    await expect(card.getByRole('button', { name: 'Bookmark this page' })).toHaveCount(0);

    // And it created nothing behind the user's back.
    const created = await worker.evaluate(async () => {
      const found = await chrome.bookmarks.search({ url: 'chrome-extension://' });
      return found.filter((node) => node.url?.includes('/popup.html')).length;
    });
    expect(created).toBe(0);
  });
});
