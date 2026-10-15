import { expect, test } from './fixtures';

/**
 * Harness smoke test: proves the unpacked build loads in real Chromium, the MV3
 * worker registers, and the new tab page paints its shell. Everything else in
 * this directory depends on these three facts.
 */
test('loads the unpacked extension and paints the new tab shell', async ({ newTab, extensionId, worker }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  expect(worker.url()).toContain('/background.js');

  await expect(newTab.locator('main#marktab-content')).toBeVisible();
  // The rail is the one always-visible navigation surface.
  await expect(newTab.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(newTab.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  // Appearance is resolved before the first frame and reflected on <html>.
  await expect(newTab.locator('html')).toHaveAttribute('data-theme', 'light');
});
