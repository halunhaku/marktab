import { expect, test, MOD } from './fixtures';

/**
 * First-run behaviour: what a brand-new installation shows, and the global
 * keyboard map that is advertised in Settings → Keyboard.
 */
test.describe('first run', () => {
  test('welcomes a new user, then stays dismissed', async ({ newTab }) => {
    await expect(newTab.getByRole('heading', { name: 'Welcome to MarkTab' })).toBeVisible();
    await expect(newTab.getByText('Every new tab opens your bookmarks.')).toBeVisible();

    await newTab.getByRole('button', { name: 'Got it' }).click();
    await expect(newTab.getByRole('heading', { name: 'Welcome to MarkTab' })).toHaveCount(0);

    await newTab.reload({ waitUntil: 'domcontentloaded' });
    await expect(newTab.getByRole('heading', { name: 'Welcome to MarkTab' })).toHaveCount(0);
    await expect(newTab.getByRole('main')).toBeVisible();
  });

  test('keeps the home folder tiles unobstructed', async ({ newTab }) => {
    // The tile draws a decorative "stack" plate behind its label. When that plate
    // is positioned as a *child* of the button it paints above the button's static
    // text and veils it — colours still measure correct, but the label renders
    // almost invisible. Asserting paint order at the label catches that class of
    // bug, which a token-level contrast audit cannot see.
    const tile = newTab.locator('[data-folder-id]').first();
    await expect(tile).toBeVisible();
    // On a 900 px viewport this row sits below the fold.
    await tile.scrollIntoViewIfNeeded();

    const painted = await tile.evaluate((element) => {
      const button = element.querySelector('button');
      const label = button
        ? [...button.querySelectorAll('span')].find(
            (span) => (span.textContent?.trim().length ?? 0) > 1 && !/items?$/.test(span.textContent?.trim() ?? ''),
          )
        : null;
      if (!label) return null;
      const rect = label.getBoundingClientRect();
      const topmost = document.elementsFromPoint(rect.left + 4, rect.top + rect.height / 2)[0] ?? null;
      return {
        label: label.textContent,
        unobstructed: topmost !== null && (topmost === label || label.contains(topmost)),
        topmostTag: topmost?.tagName ?? null,
      };
    });

    expect(painted?.label).toBeTruthy();
    expect(painted?.unobstructed, `topmost element at "${painted?.label}" is ${painted?.topmostTag}`).toBe(true);
  });

  test('states emptiness instead of drawing an empty grid', async ({ newTab }) => {
    await expect(newTab.getByText('Pin what you use every day')).toBeVisible();
    await expect(newTab.getByText('Nothing opened yet').first()).toBeVisible();
    // The browser's own root folders exist, and each reports an honest zero.
    await expect(newTab.locator('[data-folder-id]').first()).toContainText('0 items');
  });

  test('skips the rail and lands focus on the content column', async ({ newTab }) => {
    await newTab.keyboard.press('Tab');
    const skip = newTab.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(newTab.locator('#marktab-content')).toBeFocused();
  });

  test('opens the palette with the platform shortcut and closes it with Escape', async ({ newTab }) => {
    const query = newTab.getByRole('combobox', { name: 'Search bookmarks' });
    await expect(query).toHaveCount(0);

    await newTab.keyboard.press(`${MOD}+k`);
    await expect(query).toBeVisible();
    await expect(newTab.getByRole('listbox', { name: 'Search results' })).toBeVisible();

    // The same chord toggles it away again.
    await newTab.keyboard.press(`${MOD}+k`);
    await expect(query).toHaveCount(0);

    await newTab.keyboard.press(`${MOD}+k`);
    await expect(query).toBeVisible();
    await newTab.keyboard.press('Escape');
    await expect(query).toHaveCount(0);
  });

  test('jumps between views and settings from the keyboard', async ({ newTab }) => {
    await newTab.keyboard.press(`${MOD}+2`);
    await expect(newTab.getByRole('heading', { name: 'Recent' })).toBeVisible();

    await newTab.keyboard.press(`${MOD}+3`);
    await expect(newTab.getByRole('heading', { name: 'Pinned' })).toBeVisible();

    await newTab.keyboard.press(`${MOD}+1`);
    // Home's landmark control is the hero search, which no other view has.
    await expect(newTab.getByRole('button', { name: 'Search bookmarks, folders, or type a URL' })).toBeVisible();

    await newTab.keyboard.press(`${MOD}+,`);
    await expect(newTab.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(newTab).toHaveTitle('Settings — MarkTab');
  });

  test('accepts a query handed over from the popup via ?q=', async ({ openPage, extensionId }) => {
    const page = await openPage('newtab.html?q=github');
    await expect(page.getByRole('combobox', { name: 'Search bookmarks' })).toHaveValue('github');
    // The parameter is consumed, so reloading the tab does not reopen the palette.
    const url = new URL(page.url());
    expect(url.protocol).toBe('chrome-extension:');
    expect(url.host).toBe(extensionId);
    expect(url.search).toBe('');
  });

  test('turns the rail into a drawer below 1200px', async ({ newTab }) => {
    await newTab.setViewportSize({ width: 1024, height: 800 });
    const toggle = newTab.getByRole('button', { name: 'Expand navigation' });
    await expect(toggle).toBeVisible();
    const rail = newTab.getByRole('complementary', { name: 'Main navigation' });
    // The rail is off-canvas until the drawer opens.
    await expect(rail).not.toBeInViewport();

    await toggle.click();
    await expect(rail).toBeInViewport();
    await expect(newTab.getByRole('button', { name: 'Home' })).toBeVisible();

    await newTab.keyboard.press('Escape');
    await expect(rail).not.toBeInViewport();
  });
});
