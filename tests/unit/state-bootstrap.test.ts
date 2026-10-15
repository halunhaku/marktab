import { beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapState,
  persistEverything,
  readRawKeys,
  resetBootstrapForTests,
  writeRawKey,
  type BootstrapResult,
} from '@/core/state/bootstrap';
import { settings } from '@/core/state/signals';
import { DATA_KEY, SETTINGS_KEY, cloneDefaults, type Settings } from '@/core/settings/types';
import { updateSettings } from '@/core/settings/store';
import { isUserDataHydrated, pinFor, userData } from '@/core/userdata/store';
import type { UserData } from '@/core/userdata/model';
import { createFakeChrome, flushMicrotasks } from './helpers/fakes';

const V2_LEGACY = {
  theme: 'dark',
  defaultEngine: 'duckduckgo',
  folderViewMode: 'list',
  homeRecentCount: 30,
  homeShowRecent: false,
  sidebarCollapsed: true,
  hiddenFolderIds: ['10', '11'],
  pinnedBookmarkUrls: ['https://a.example/', 'https://b.example/'],
  recentUrls: ['https://r.example/'],
  recentVisitTimes: { 'https://r.example/': 1000 },
};

/** The fresh-profile marker bootstrap writes on a first-ever run. */
function expectFreshData(value: unknown): void {
  expect(value).toMatchObject({ schema: 1, pins: [], recent: [] });
  const data = value as { migration?: { source: string; items: unknown } };
  expect(data.migration?.source).toBe('fresh');
  expect(data.migration?.items).toEqual({ pins: 0, recent: 0, foldered: 0 });
}

beforeEach(() => {
  resetBootstrapForTests();
});

describe('bootstrapState on a first run', () => {
  it('loads the defaults, seeds the local data key and reports no migration', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(false);
    expect(result.source).toBe('none');
    expect(result.legacyLeftInPlace).toBe(false);
    expect(result.settings).toEqual(cloneDefaults());
    expect(settings.value).toEqual(cloneDefaults());
    expect(userData.value.pins).toEqual([]);
    expect(userData.value.recent).toEqual([]);
    expectFreshData(chrome.storage.local.data[DATA_KEY]);
    expect(isUserDataHydrated()).toBe(true);
    expect(chrome.storage.sync.data[SETTINGS_KEY]).toEqual(cloneDefaults());
    expect(Object.keys(chrome.storage.local.data)).toEqual([DATA_KEY]);
    expect(Object.keys(chrome.storage.sync.data)).toEqual([SETTINGS_KEY]);
    expect(chrome.bookmarks.getTree).not.toHaveBeenCalled();
  });

  it('resolves once per page: a second call returns the very same result', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    const first = await bootstrapState();
    const second = await bootstrapState();

    expect(second).toBe(first);
  });

  it('re-runs after the test seam clears the single-flight cache', async () => {
    const chrome = createFakeChrome({ sync: { markTabSettings: V2_LEGACY } });
    chrome.install();

    const first = await bootstrapState();
    expect(first.migrated).toBe(true);

    resetBootstrapForTests();
    const second: BootstrapResult = await bootstrapState();

    expect(second).not.toBe(first);
    // The first run persisted both v3 keys, so the second has nothing to migrate.
    expect(second.migrated).toBe(false);
    expect(second.source).toBe('none');
    expect(second.legacyLeftInPlace).toBe(false);
    expect(second.settings).toEqual(first.settings);
  });
});

describe('bootstrapState with legacy v2 state', () => {
  it('applies the migrated settings and data to the live signals', async () => {
    const chrome = createFakeChrome({ sync: { markTabSettings: V2_LEGACY } });
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(true);
    expect(result.source).toBe('markTabSettings');
    expect(result.legacyLeftInPlace).toBe(true);

    expect(settings.value.theme).toBe('dark');
    expect(settings.value.search.engine).toBe('duckduckgo');
    expect(settings.value.folders.view).toBe('list');
    expect(settings.value.folders.hiddenIds).toEqual(['10', '11']);
    expect(settings.value.home.recentCount).toBe(24);
    expect(settings.value.home.showRecent).toBe(false);
    expect(settings.value.home.showClock).toBe(true);

    expect(userData.value.pins.map((pin) => pin.url)).toEqual([
      'https://a.example/',
      'https://b.example/',
    ]);
    expect(userData.value.pins.map((pin) => pin.order)).toEqual([0, 1]);
    expect(userData.value.recent.map((item) => item.url)).toEqual(['https://r.example/']);
    expect(userData.value.migration?.source).toBe('legacy:markTabSettings');
    expect(isUserDataHydrated()).toBe(true);

    expect(result.settings).toEqual(settings.value);
  });

  it('persists the migrated state under both v3 keys', async () => {
    const chrome = createFakeChrome({ sync: { markTabSettings: V2_LEGACY } });
    chrome.install();

    await bootstrapState();

    const storedSettings = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    const storedData = chrome.storage.local.data[DATA_KEY] as UserData;
    expect(storedSettings.theme).toBe('dark');
    expect(storedSettings.search.engine).toBe('duckduckgo');
    expect(storedSettings.folders.hiddenIds).toEqual(['10', '11']);
    expect(storedData.pins.map((pin) => pin.url)).toEqual([
      'https://a.example/',
      'https://b.example/',
    ]);
    expect(storedData.recent.map((item) => item.url)).toEqual(['https://r.example/']);
    expect(storedData.migration?.source).toBe('legacy:markTabSettings');
  });

  it('never deletes or rewrites the legacy key', async () => {
    const chrome = createFakeChrome({ sync: { markTabSettings: V2_LEGACY } });
    chrome.install();

    await bootstrapState();
    await persistEverything();
    await flushMicrotasks();

    expect(chrome.storage.sync.data['markTabSettings']).toEqual(V2_LEGACY);
    expect('rainbowBookmarkSettings' in chrome.storage.sync.data).toBe(false);
    expect(Object.keys(chrome.storage.sync.data).sort()).toEqual(
      ['markTabSettings', SETTINGS_KEY].sort(),
    );
    expect(Object.keys(chrome.storage.local.data)).toEqual([DATA_KEY]);
  });

  it('prefers state that is already stored under the v3 keys', async () => {
    const chrome = createFakeChrome({
      sync: {
        [SETTINGS_KEY]: { theme: 'light' },
        markTabSettings: { theme: 'dark' },
      },
      local: {
        [DATA_KEY]: {
          schema: 1,
          pins: [{ url: 'https://p.example/', title: 'P', addedAt: 5, order: 0 }],
          recent: [],
        },
      },
    });
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(false);
    expect(result.source).toBe('none');
    expect(result.legacyLeftInPlace).toBe(false);
    expect(settings.value.theme).toBe('light');
    expect(userData.value.pins.map((pin) => pin.url)).toEqual(['https://p.example/']);
  });

  it('seeds missing user data without touching stored settings', async () => {
    const chrome = createFakeChrome({ sync: { [SETTINGS_KEY]: { theme: 'light' } } });
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(false);
    expect(settings.value.theme).toBe('light');
    expect(userData.value.migration?.source).toBe('fresh');
    expectFreshData(chrome.storage.local.data[DATA_KEY]);
  });
});

describe('bootstrapState subscriptions', () => {
  it('mirrors later changes and stops after dispose', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    const result = await bootstrapState();
    expect(chrome.storage.onChanged.listeners.size).toBe(2);

    chrome.storage.emit('sync', SETTINGS_KEY, { theme: 'dark' });
    chrome.storage.emit('local', DATA_KEY, { schema: 1, pins: [], recent: [{ url: 'https://x/', title: '', ts: 1 }] });
    expect(settings.value.theme).toBe('dark');
    expect(userData.value.recent.map((item) => item.url)).toEqual(['https://x/']);

    result.dispose();

    expect(chrome.storage.onChanged.listeners.size).toBe(0);
    chrome.storage.emit('sync', SETTINGS_KEY, { theme: 'light' });
    expect(settings.value.theme).toBe('dark');
  });
});

describe('raw key helpers', () => {
  it('reads and writes the two namespaced keys through their storage areas', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    expect(await readRawKeys()).toEqual({ [SETTINGS_KEY]: undefined, [DATA_KEY]: undefined });

    await writeRawKey(SETTINGS_KEY, { theme: 'dark' });
    await writeRawKey(DATA_KEY, { pins: [] });

    expect(chrome.storage.sync.data[SETTINGS_KEY]).toEqual({ theme: 'dark' });
    expect(chrome.storage.local.data[DATA_KEY]).toEqual({ pins: [] });
    expect(await readRawKeys()).toEqual({ [SETTINGS_KEY]: { theme: 'dark' }, [DATA_KEY]: { pins: [] } });
  });

  it('flushes both stores in one call', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    await bootstrapState();
    updateSettings({ theme: 'dark' });
    pinFor('https://p.example/', 'P');
    await persistEverything();
    await flushMicrotasks();

    const storedSettings = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(storedSettings.theme).toBe('dark');
    const storedData = chrome.storage.local.data[DATA_KEY] as UserData;
    expect(storedData.pins.map((pin) => pin.url)).toEqual(['https://p.example/']);
  });
});
