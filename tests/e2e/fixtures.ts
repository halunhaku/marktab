import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end harness.
 *
 * Every test runs against the real unpacked build in `dist/extension` (produced
 * by `npm run build`), in a persistent Chromium profile that lives only for the
 * duration of the test. That is the only way to exercise what happy-dom cannot:
 * `chrome.bookmarks`, `chrome.storage` across reloads, the MV3 worker, and the
 * new tab page's real first paint.
 *
 * `MARKTAB_E2E_CHANNEL` selects the browser channel (CI sets `chromium`); the
 * full Chromium build is required, because the headless shell cannot load
 * extensions.
 */
export const EXTENSION_PATH = fileURLToPath(new URL('../../dist/extension/', import.meta.url));

export const NEW_TAB_PAGE = 'newtab.html';
export const POPUP_PAGE = 'popup.html';

/** Storage keys owned by the app. */
export const SETTINGS_KEY = 'marktab:settings:v3';
export const DATA_KEY = 'marktab:data:v3';
/** Keys written by MarkTab 1.x/2.x, read once during migration. */
export const LEGACY_KEYS = ['markTabSettings', 'rainbowBookmarkSettings'] as const;

export interface SeedNode {
  title: string;
  url?: string;
  children?: SeedNode[];
}

export interface ExtensionFixtures {
  context: BrowserContext;
  /** MV3 service worker; the place to seed bookmarks and inspect storage. */
  worker: Worker;
  extensionId: string;
  /** Opens a page inside the extension, e.g. `openPage('newtab.html')`. */
  openPage: (path: string) => Promise<Page>;
  /** New tab page, loaded and mounted. */
  newTab: Page;
  /** The toolbar popup document. */
  popup: Page;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'marktab-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: process.env['MARKTAB_E2E_CHANNEL'] ?? 'chromium',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
      colorScheme: 'light',
      locale: 'en-US',
      viewport: { width: 1440, height: 900 },
    });
    try {
      await use(context);
    } finally {
      await context.close();
      await rm(userDataDir, { recursive: true, force: true });
    }
  },

  worker: async ({ context }, use) => {
    const existing = context.serviceWorkers()[0];
    const worker = existing ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },

  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },

  openPage: async ({ context, extensionId }, use) => {
    const pages: Page[] = [];
    await use(async (path: string) => {
      const page = await context.newPage();
      pages.push(page);
      await page.goto(`chrome-extension://${extensionId}/${path}`, { waitUntil: 'domcontentloaded' });
      return page;
    });
    await Promise.all(pages.map((page) => page.close()));
  },

  newTab: async ({ openPage }, use) => {
    const page = await openPage(NEW_TAB_PAGE);
    await expect(page.locator('#marktab-root > *')).toBeVisible();
    await use(page);
  },

  popup: async ({ openPage }, use) => {
    const page = await openPage(POPUP_PAGE);
    await expect(page.locator('#marktab-popup-root > *')).toBeVisible();
    await use(page);
  },
});

export { expect };

/* ---- seeding helpers ---------------------------------------------------- */

/**
 * Creates `nodes` under the browser's bookmarks bar (recursively), waits for the
 * writes to land, and returns the id of the created root folder when there is a
 * single one.
 */
export async function seedBookmarks(
  worker: Worker,
  nodes: SeedNode[],
  parent: 'bar' | 'other' | 'root' = 'bar',
): Promise<string | undefined> {
  return worker.evaluate(
    async ({ nodes: tree, parent: where }) => {
      const bar = await chrome.bookmarks.getTree();
      const rootNode = bar[0];
      if (!rootNode) throw new Error('no bookmark root');
      const children = rootNode.children ?? [];
      const base =
        where === 'root'
          ? rootNode
          : (children[where === 'bar' ? 0 : 1] ?? children[0] ?? rootNode);

      const create = async (
        parentId: string,
        node: { title: string; url?: string; children?: unknown[] },
      ): Promise<string> => {
        if (node.url) {
          const created = await chrome.bookmarks.create({ parentId, title: node.title, url: node.url });
          return created.id;
        }
        const folder = await chrome.bookmarks.create({ parentId, title: node.title });
        for (const child of (node.children ?? []) as { title: string; url?: string; children?: unknown[] }[]) {
          await create(folder.id, child);
        }
        return folder.id;
      };

      const ids: string[] = [];
      for (const node of tree) ids.push(await create(base.id, node));
      return tree.length === 1 ? ids[0] : undefined;
    },
    { nodes, parent },
  );
}

/** Removes every bookmark below the bookmarks bar, back to a pristine profile. */
export async function clearBookmarkBar(worker: Worker): Promise<void> {
  await worker.evaluate(async () => {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    const bar = (root?.children ?? [])[0];
    if (!bar) return;
    for (const child of bar.children ?? []) {
      await chrome.bookmarks.removeTree(child.id).catch(() => undefined);
    }
  });
}

/** Removes MarkTab's own state so a test starts from a clean install. */
export async function resetMarkTabState(worker: Worker): Promise<void> {
  await worker.evaluate(
    async ({ settings, data, legacy }) => {
      await chrome.storage.sync.remove([settings, ...legacy]);
      await chrome.storage.local.remove(data);
    },
    { settings: SETTINGS_KEY, data: DATA_KEY, legacy: [...LEGACY_KEYS] },
  );
}

/** Reads one key from an extension storage area, from inside the worker. */
export async function readStored<T>(
  worker: Worker,
  area: 'sync' | 'local',
  key: string,
): Promise<T | undefined> {
  const value = await worker.evaluate(
    async ({ area: which, key: name }) => {
      const bucket = which === 'sync' ? chrome.storage.sync : chrome.storage.local;
      const result = await bucket.get(name);
      return result[name] as unknown;
    },
    { area, key },
  );
  return value as T | undefined;
}

/** The modifier key this platform's shortcuts use. */
export const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

/**
 * Waits until the service worker's own startup bootstrap has written its state.
 *
 * The worker runs `bootstrapState()` the moment it starts, which on a fresh
 * profile writes default settings. A test that plants state before that write
 * lands can have it overwritten, so anything that seeds storage first should wait
 * here — otherwise the assertion races the worker.
 */
export async function settleWorkerBoot(worker: Worker): Promise<void> {
  await expect
    .poll(async () => Boolean(await readStored(worker, 'sync', SETTINGS_KEY)), { timeout: 10_000 })
    .toBe(true);
}

/** Writes several keys at once (used to plant legacy profiles). */
export async function writeStored(
  worker: Worker,
  area: 'sync' | 'local',
  values: Record<string, unknown>,
): Promise<void> {
  await worker.evaluate(
    async ({ area: which, values: payload }) => {
      const bucket = which === 'sync' ? chrome.storage.sync : chrome.storage.local;
      await bucket.set(payload);
    },
    { area, values },
  );
}
