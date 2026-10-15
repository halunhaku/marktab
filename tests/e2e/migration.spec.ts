import {
  expect,
  settleWorkerBoot,
  test,
  DATA_KEY,
  LEGACY_KEYS,
  MOD,
  readStored,
  resetMarkTabState,
  SETTINGS_KEY,
  writeStored,
} from './fixtures';

/**
 * Upgrading from MarkTab 1.x/2.x.
 *
 * The promise under test: the legacy payload is read once and mapped onto the v3
 * model, the legacy keys are left exactly where they were (a downgrade must keep
 * working), and browser bookmarks are never part of migration.
 */
const LEGACY_PROFILE = {
  theme: 'dark',
  defaultEngine: 'duckduckgo',
  folderViewMode: 'list',
  homeRecentCount: 12,
  sidebarCollapsed: true,
  homeShowRecent: false,
  hiddenFolderIds: ['legacy-hidden-folder'],
  pinnedBookmarkUrls: ['https://github.com/', 'https://linear.app/', 'https://github.com/'],
  recentUrls: ['https://vite.dev/', 'https://github.com/'],
  recentVisitTimes: { 'https://vite.dev/': 1_700_000_100_000, 'https://github.com/': 1_700_000_000_000 },
};

test.describe('legacy migration', () => {
  test('maps a v2 profile onto v3 state and leaves the legacy keys alone', async ({
    worker,
    openPage,
  }) => {
    // The worker bootstraps itself the moment it starts; wait for that write to
    // land so this setup is unambiguously the last writer, then clear MarkTab's
    // own state and plant a v2 profile. The next bootstrap has to migrate.
    await expect
      .poll(async () => Boolean(await readStored(worker, 'sync', SETTINGS_KEY)))
      .toBe(true);
    await resetMarkTabState(worker);
    await writeStored(worker, 'sync', { markTabSettings: LEGACY_PROFILE });

    const page = await openPage('newtab.html');
    await expect(page.getByRole('main')).toBeVisible();

    // The first frame paints before storage answers, so wait for the write.
    await expect.poll(async () => Boolean(await readStored(worker, 'sync', SETTINGS_KEY))).toBe(true);

    const settings = await readStored<{
      theme: string;
      railCollapsed: boolean;
      home: { recentCount: number; showRecent: boolean };
      folders: { view: string; hiddenIds: string[] };
      search: { engine: string };
    }>(worker, 'sync', SETTINGS_KEY);
    expect(settings).toMatchObject({
      theme: 'dark',
      railCollapsed: true,
      home: { recentCount: 12, showRecent: false },
      folders: { view: 'list', hiddenIds: ['legacy-hidden-folder'] },
      search: { engine: 'duckduckgo' },
    });

    await expect.poll(async () => Boolean(await readStored(worker, 'local', DATA_KEY))).toBe(true);
    const data = await readStored<{
      pins: { url: string; order: number }[];
      recent: { url: string; ts: number }[];
      migration: { source: string; items: { pins: number; recent: number } };
    }>(worker, 'local', DATA_KEY);
    // Duplicate URLs collapse, order stays dense, and the newest visit is first.
    expect(data?.pins.map((pin) => pin.url)).toEqual(['https://github.com/', 'https://linear.app/']);
    expect(data?.pins.map((pin) => pin.order)).toEqual([0, 1]);
    expect(data?.recent.map((entry) => entry.url)).toEqual(['https://vite.dev/', 'https://github.com/']);
    expect(data?.recent[0]?.ts).toBe(1_700_000_100_000);
    expect(data?.migration.source).toBe('legacy:markTabSettings');
    expect(data?.migration.items).toMatchObject({ pins: 2, recent: 2 });

    // The old payload is never rewritten or deleted.
    const legacy = await readStored<typeof LEGACY_PROFILE>(worker, 'sync', LEGACY_KEYS[0]);
    expect(legacy).toEqual(LEGACY_PROFILE);

    // The migrated preferences are what the UI actually renders.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  });

  test('never rewrites settings that already exist on this profile', async ({ worker, openPage }) => {
    // What a second device looks like: `storage.sync` has v3 settings and the v2
    // keys from the first device, while this device's local data is still empty.
    // Migrating here would replace the live settings with the older payload and
    // sync that reversion to every other device.
    await settleWorkerBoot(worker);
    await writeStored(worker, 'sync', {
      markTabSettings: LEGACY_PROFILE,
      [SETTINGS_KEY]: {
        schema: 3,
        theme: 'light',
        language: 'en',
        search: { engine: 'google' },
      },
    });
    await worker.evaluate(async () => {
      await chrome.storage.local.remove('marktab:data:v3');
    });

    const page = await openPage('newtab.html');
    await expect(page.locator('main#marktab-content')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const settings = await readStored<{ theme: string; search: { engine: string } }>(
      worker,
      'sync',
      SETTINGS_KEY,
    );
    expect(settings?.theme).toBe('light');
    expect(settings?.search.engine).toBe('google');

    // The missing local half is seeded empty, not filled from the v2 payload.
    await expect.poll(async () => Boolean(await readStored(worker, 'local', DATA_KEY))).toBe(true);
    const data = await readStored<{ pins: unknown[]; recent: unknown[]; migration: { source: string } }>(
      worker,
      'local',
      DATA_KEY,
    );
    expect(data?.pins).toEqual([]);
    expect(data?.recent).toEqual([]);
    expect(data?.migration.source).toBe('fresh');
  });

  test('reports that there is nothing to import on a clean install', async ({ newTab }) => {
    await newTab.keyboard.press(`${MOD}+,`);
    await expect(newTab.getByText('No legacy data found.')).toBeVisible();
    await expect(newTab.getByText('Imported from MarkTab 2.x')).toBeVisible();
  });
});
