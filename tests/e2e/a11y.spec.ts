import axe from 'axe-core';
import type { BrowserContext, Page, Worker } from '@playwright/test';
import { expect, settleWorkerBoot, test, MOD, SETTINGS_KEY } from './fixtures';

/**
 * Accessibility audit.
 *
 * `axe-core` runs inside each real surface (not in a DOM emulator) against the
 * WCAG 2.0/2.1/2.2 A and AA rule sets, in both themes. It is injected with
 * `page.addInitScript`, because an extension page's CSP forbids inline script
 * tags — and that CSP is itself a product requirement, so the tests must not
 * weaken it to run.
 *
 * What axe cannot check — focus order, the palette's combobox keys, the drawer,
 * escape paths — is covered by the behavioural specs next door.
 */
const AXE_SOURCE = axe.source;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
}

async function useTheme(worker: Worker, theme: 'light' | 'dark'): Promise<void> {
  await worker.evaluate(
    async ({ key, value }) => {
      const current = (await chrome.storage.sync.get(key))[key] ?? {};
      await chrome.storage.sync.set({ [key]: { ...current, schema: 3, language: 'en', theme: value } });
    },
    { key: SETTINGS_KEY, value: theme },
  );
}

async function openAuditedPage(
  context: BrowserContext,
  extensionId: string,
  path: string,
  theme: 'light' | 'dark',
): Promise<Page> {
  const page = await context.newPage();
  await page.addInitScript({ content: AXE_SOURCE });
  await page.goto(`chrome-extension://${extensionId}/${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#marktab-root main, #marktab-popup-root > *')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.waitForTimeout(400);
  return page;
}

/** Runs axe over the whole document and returns one readable line block per violation. */
async function audit(page: Page): Promise<string[]> {
  const results = (await page.evaluate(
    async (tags) => {
      const api = (window as unknown as { axe?: { run: (ctx: Document, options: unknown) => Promise<unknown> } }).axe;
      if (!api) throw new Error('axe was not injected');
      return api.run(document, { runOnly: { type: 'tag', values: tags } });
    },
    WCAG_TAGS,
  )) as { violations: AxeViolation[] };

  return results.violations.map((violation) => {
    const nodes = violation.nodes
      .map(
        (node) =>
          `      ${node.target.join(' ')} — ${(node.failureSummary ?? '').split('\n').slice(0, 2).join(' ')}`,
      )
      .join('\n');
    return `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}\n${nodes}`;
  });
}

/** Seeds one folder with one bookmark so the folder surface is not just an empty state. */
async function seedAuditLibrary(worker: Worker): Promise<void> {
  await worker.evaluate(async () => {
    const tree = await chrome.bookmarks.getTree();
    const bar = tree[0]?.children?.[0];
    if (!bar) return;
    const folder = await chrome.bookmarks.create({ parentId: bar.id, title: 'Audit' });
    await chrome.bookmarks.create({
      parentId: folder.id,
      title: 'Example Domain',
      url: 'https://example.com/',
    });
  });
}

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`home, folder, palette, pinned, recent and settings are WCAG A/AA clean (${theme})`, async ({
      context,
      extensionId,
      worker,
    }) => {
      test.setTimeout(120_000);
      await settleWorkerBoot(worker);
      await seedAuditLibrary(worker);
      await useTheme(worker, theme);

      const page = await openAuditedPage(context, extensionId, 'newtab.html', theme);

      const surfaces: [string, () => Promise<void>][] = [
        ['home', async () => undefined],
        [
          'palette',
          async () => {
            await page.keyboard.press(`${MOD}+k`);
            await page.getByRole('combobox', { name: 'Search bookmarks' }).fill('example');
            // Audit the loaded result, not a frame that still shows the idle
            // suggestions: the bookmark row is the deterministic ready state.
            await expect(page.locator('[role="option"][data-kind="bookmark"]').first()).toBeVisible();
          },
        ],
        [
          'pinned',
          async () => {
            await page.keyboard.press('Escape');
            await page.keyboard.press('Escape');
            await page.getByRole('complementary').getByRole('button', { name: 'Pinned' }).click();
            await page.waitForTimeout(300);
          },
        ],
        [
          'recent',
          async () => {
            await page.getByRole('complementary').getByRole('button', { name: 'Recent' }).click();
            await page.waitForTimeout(300);
          },
        ],
        [
          'folder',
          async () => {
            await page.getByRole('complementary').getByRole('button', { name: 'Audit' }).click();
            await page.waitForTimeout(400);
          },
        ],
        [
          'settings',
          async () => {
            await page.keyboard.press(`${MOD}+,`);
            await page.waitForTimeout(400);
          },
        ],
      ];

      const report: string[] = [];
      for (const [name, prepare] of surfaces) {
        await prepare();
        const violations = await audit(page);
        if (violations.length > 0) report.push(`  ${name}: ${violations.join('\n')}`);
      }

      await page.close();
      expect(report.join('\n'), 'axe violations').toBe('');
    });
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`the popup is WCAG A/AA clean (${theme})`, async ({ context, extensionId, worker }) => {
      await settleWorkerBoot(worker);
      await useTheme(worker, theme);
      const page = await openAuditedPage(context, extensionId, 'popup.html', theme);
      const violations = await audit(page);
      await page.close();
      expect(violations.join('\n'), 'axe violations').toBe('');
    });
  }
});
