import { expect, test, MOD, clearBookmarkBar } from './fixtures';

/**
 * Large-library guard.
 *
 * The promise in `docs/design-principles.md` §17 is that the new tab page stays
 * responsive with thousands of bookmarks: the index is built in one pass, search
 * scores the whole index on every keystroke, and rendering is bounded. This test
 * measures that end to end in real Chromium and fails if the page starts doing
 * work a user would feel.
 */
const FOLDERS = 30;
const PER_FOLDER = 100;

test.describe('large library', () => {
  test('stays responsive with 3000 bookmarks', async ({ context, worker, extensionId }) => {
    test.setTimeout(240_000);
    await clearBookmarkBar(worker);
    await worker.evaluate(
      async ({ folders, perFolder }) => {
        const tree = await chrome.bookmarks.getTree();
        const bar = tree[0]?.children?.[0];
        if (!bar) throw new Error('no bookmarks bar');
        for (let folderIndex = 0; folderIndex < folders; folderIndex += 1) {
          const folder = await chrome.bookmarks.create({
            parentId: bar.id,
            title: `Perf ${folderIndex}`,
          });
          const pending: Promise<unknown>[] = [];
          for (let item = 0; item < perFolder; item += 1) {
            pending.push(
              chrome.bookmarks.create({
                parentId: folder.id,
                title: `Perf item ${folderIndex}-${item}`,
                url: `https://perf${folderIndex}.example.com/page-${item}`,
              }),
            );
          }
          // Bounded concurrency: 25 writes in flight keeps the bookmark store happy.
          for (let index = 0; index < pending.length; index += 25) {
            await Promise.all(pending.slice(index, index + 25));
          }
        }
      },
      { folders: FOLDERS, perFolder: PER_FOLDER },
    );

    const page = await context.newPage();
    await page.addInitScript(() => {
      const perf = { longTasks: [] as number[] };
      (window as unknown as { __marktabPerf: typeof perf }).__marktabPerf = perf;
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) perf.longTasks.push(Math.round(entry.duration));
        }).observe({ entryTypes: ['longtask'] });
      } catch {
        /* longtask is unsupported: the timing assertions below still apply */
      }
    });

    // The measurement only means something if the library is really that big.
    const seeded = await worker.evaluate(async () => {
      const tree = await chrome.bookmarks.getTree();
      let count = 0;
      const walk = (nodes: chrome.bookmarks.BookmarkTreeNode[]): void => {
        for (const node of nodes) {
          if (node.url) count += 1;
          else walk(node.children ?? []);
        }
      };
      walk(tree);
      return count;
    });
    expect(seeded).toBeGreaterThanOrEqual(FOLDERS * PER_FOLDER);

    // 1. Cold start: from navigation to the rail offering the whole tree.
    const bootStart = Date.now();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('complementary').getByRole('button', { name: `Perf ${FOLDERS - 1}` })).toBeVisible();
    const bootMs = Date.now() - bootStart;
    // Every folder's recursive total is correct at this size, not just painted.
    await expect(page.locator('[data-folder-id]').first()).toContainText('3,000 items');

    // 2. Search latency: keystroke to painted results, over the full index.
    const palette = page.getByRole('combobox', { name: 'Search bookmarks' });
    await page.keyboard.press(`${MOD}+k`);
    const searchStart = Date.now();
    await palette.fill('perf item 17-42');
    await expect(page.locator('[role="option"][data-kind="bookmark"]').first()).toBeVisible();
    const searchMs = Date.now() - searchStart;

    const longTasks = await page.evaluate(
      () => (window as unknown as { __marktabPerf?: { longTasks: number[] } }).__marktabPerf?.longTasks ?? [],
    );
    const worstTask = longTasks.length > 0 ? Math.max(...longTasks) : 0;

    test.info().annotations.push({
      type: 'perf',
      description: `boot ${bootMs}ms · search ${searchMs}ms · long tasks ${longTasks.length} (max ${worstTask}ms)`,
    });
    console.log(`[perf] boot ${bootMs}ms · search ${searchMs}ms · max long task ${worstTask}ms`);

    expect(bootMs).toBeLessThan(4_000);
    expect(searchMs).toBeLessThan(1_500);
    expect(worstTask).toBeLessThan(900);
    await page.close();
  });
});
