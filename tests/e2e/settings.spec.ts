import type { Page } from '@playwright/test';
import { expect, test, MOD, readStored, seedBookmarks, DATA_KEY, SETTINGS_KEY } from './fixtures';

/** Settings are preferences: they must survive a reload and never touch bookmarks. */
function settings(page: Page) {
  return page.getByRole('main');
}

test.describe('settings', () => {
  test('applies a theme immediately, caches it for the next first paint, and stores it', async ({
    newTab,
    worker,
  }) => {
    await newTab.keyboard.press(`${MOD}+,`);
    await settings(newTab).getByRole('radio', { name: 'Dark' }).click();

    await expect(newTab.locator('html')).toHaveAttribute('data-theme', 'dark');
    // The paint cache is what `theme-boot.js` reads before any module runs.
    const cached = await newTab.evaluate(() => localStorage.getItem('marktab.appearance.v3'));
    expect(cached).toContain('"theme":"dark"');

    await expect
      .poll(async () => (await readStored<{ theme: string }>(worker, 'sync', SETTINGS_KEY))?.theme)
      .toBe('dark');

    await newTab.reload({ waitUntil: 'domcontentloaded' });
    await expect(newTab.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switches density, motion and language', async ({ newTab, worker }) => {
    await newTab.keyboard.press(`${MOD}+,`);
    await settings(newTab).getByRole('radio', { name: 'Compact' }).click();
    await settings(newTab).getByRole('radio', { name: 'Reduced' }).click();

    await expect(newTab.locator('html')).toHaveAttribute('data-density', 'compact');
    await expect(newTab.locator('html')).toHaveAttribute('data-motion', 'reduced');

    await settings(newTab).getByLabel('Language').selectOption('zh');
    await expect(newTab.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(newTab.getByRole('heading', { level: 1, name: '设置' })).toBeVisible();
    // The rail is localised too, and stays on the same route.
    await expect(newTab.getByRole('button', { name: '首页' })).toBeVisible();

    await expect
      .poll(async () => {
        const stored = await readStored<{ language: string; density: string; motion: string }>(
          worker,
          'sync',
          SETTINGS_KEY,
        );
        return stored ? `${stored.language}/${stored.density}/${stored.motion}` : null;
      })
      .toBe('zh/compact/reduced');
  });

  test('collapses the rail and remembers it', async ({ newTab }) => {
    const collapse = newTab.getByRole('button', { name: 'Collapse navigation' });
    await collapse.click();
    const expand = newTab.getByRole('button', { name: 'Expand navigation' });
    await expect(expand).toBeVisible();
    // Collapsed means the rail's words are gone, not that navigation is.
    await expect(
      newTab.getByRole('complementary').getByText('Your bookmarks, one keystroke away'),
    ).toBeHidden();

    await newTab.reload({ waitUntil: 'domcontentloaded' });
    await expect(newTab.getByRole('button', { name: 'Expand navigation' })).toBeVisible();

    await newTab.getByRole('button', { name: 'Expand navigation' }).click();
    await expect(newTab.getByRole('button', { name: 'Collapse navigation' })).toBeVisible();
  });

  test('resets MarkTab state without touching browser bookmarks', async ({ newTab, worker }) => {
    await seedBookmarks(worker, [{ title: 'GitHub', url: 'https://github.com/' }]);
    // Bookmarks live in folders, so open the browser's bar to reach the card.
    await expect(newTab.locator('[data-folder-id]').first()).toBeVisible();
    await newTab.locator('[data-folder-id]').first().getByRole('button').click();
    const card = newTab.locator('[data-url="https://github.com/"]');
    await expect(card).toBeVisible();

    // Give MarkTab something of its own to lose.
    await card.getByRole('button', { name: 'Pin' }).click();
    await expect(newTab.getByText('Pinned to MarkTab')).toBeVisible();

    await newTab.keyboard.press(`${MOD}+,`);
    await settings(newTab).getByRole('button', { name: 'Reset MarkTab data' }).first().click();
    const dialog = newTab.getByRole('dialog');
    await expect(dialog).toContainText('Reset MarkTab data?');
    await dialog.getByRole('button', { name: 'Reset MarkTab data' }).click();

    await expect(newTab.getByText('MarkTab data cleared')).toBeVisible();
    await expect
      .poll(async () => (await readStored<{ pins: unknown[] }>(worker, 'local', DATA_KEY))?.pins.length)
      .toBe(0);

    // The browser's own copy is untouched, and still on the new tab page.
    const stillThere = await worker.evaluate(async () => {
      const found = await chrome.bookmarks.search({ url: 'https://github.com/' });
      return found.length;
    });
    expect(stillThere).toBe(1);
    // Home after the reset: the bookmark is still there to be opened again.
    await expect(newTab.getByRole('heading', { name: 'Folders', level: 2 })).toBeVisible();
  });
});
