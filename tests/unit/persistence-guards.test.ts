import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapState, resetBootstrapForTests } from '@/core/state/bootstrap';
import { hasLegacyPayload, migrateLegacyState } from '@/core/settings/migrate';
import { settingsNotice, settings, userData, userDataWriteError } from '@/core/state/signals';
import { flushSettings, updateSettings } from '@/core/settings/store';
import { flushUserData, pinFor } from '@/core/userdata/store';
import { DATA_KEY, SETTINGS_KEY } from '@/core/settings/types';
import { createFakeChrome, flushMicrotasks } from './helpers/fakes';

/**
 * Guards added after a security review of the persistence layer.
 *
 * They cover three failure modes that are invisible in normal use: migrating over
 * state that already exists, treating an empty legacy record as an upgrade, and
 * dropping a failed write without telling anyone.
 */
const V2_LEGACY = {
  theme: 'dark',
  defaultEngine: 'duckduckgo',
  folderViewMode: 'list',
  sidebarCollapsed: true,
  pinnedBookmarkUrls: ['https://legacy.example/'],
  recentUrls: ['https://legacy.example/'],
};

beforeEach(() => {
  resetBootstrapForTests();
});

describe('bootstrapState never overwrites state it already has', () => {
  it('keeps live v3 settings when a legacy payload is still present', async () => {
    // The multi-device shape: `storage.sync` brings v3 settings, the local data
    // has not synced, and the v2 keys the first device left behind are still
    // there. Migrating here would replace live settings with the older payload.
    const chrome = createFakeChrome({
      sync: {
        markTabSettings: V2_LEGACY,
        [SETTINGS_KEY]: {
          schema: 3,
          theme: 'light',
          railCollapsed: false,
          search: { engine: 'google' },
          folders: { hiddenIds: ['live-folder'] },
        },
      },
    });
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(false);
    expect(result.source).toBe('none');
    // Live preferences survive...
    expect(settings.value.theme).toBe('light');
    expect(settings.value.railCollapsed).toBe(false);
    expect(settings.value.search.engine).toBe('google');
    expect(settings.value.folders.hiddenIds).toEqual(['live-folder']);
    // ...and they are not rewritten from the legacy payload.
    expect(chrome.storage.sync.data[SETTINGS_KEY]).toMatchObject({
      theme: 'light',
      railCollapsed: false,
    });
    // The missing half is seeded empty, not filled with the v2 pins.
    expect(userData.value.pins).toEqual([]);
    expect(chrome.storage.local.data[DATA_KEY]).toMatchObject({ pins: [], recent: [] });
    expect(chrome.storage.sync.data['markTabSettings']).toEqual(V2_LEGACY);
  });

  it('still migrates on a genuine first run', async () => {
    const chrome = createFakeChrome({ sync: { markTabSettings: V2_LEGACY } });
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(true);
    expect(result.source).toBe('markTabSettings');
    expect(settings.value.theme).toBe('dark');
    expect(userData.value.pins.map((pin) => pin.url)).toEqual(['https://legacy.example/']);
    expect(chrome.storage.sync.data['markTabSettings']).toEqual(V2_LEGACY);
  });

  it('does not write when a storage read failed', async () => {
    const chrome = createFakeChrome({ sync: { markTabSettings: V2_LEGACY } });
    chrome.storage.local.get = vi.fn(async () => {
      throw new Error('storage read failed');
    });
    chrome.install();

    const result = await bootstrapState();

    expect(result.migrated).toBe(false);
    // The legacy payload was not applied...
    expect(settings.value.theme).toBe('system');
    expect(userData.value.pins).toEqual([]);
    // ...and nothing was written on top of the local state we could not read.
    expect(chrome.storage.local.data[DATA_KEY]).toBeUndefined();
  });
});

describe('legacy payload recognition', () => {
  it('rejects empty and unrelated records', () => {
    expect(hasLegacyPayload({ markTabSettings: {} })).toBe(false);
    expect(hasLegacyPayload({ markTabSettings: { somethingElse: 1 } })).toBe(false);
    expect(hasLegacyPayload({})).toBe(false);
  });

  it('accepts a record with one recognised field', () => {
    expect(hasLegacyPayload({ markTabSettings: { theme: 'dark' } })).toBe(true);
    expect(hasLegacyPayload({ rainbowBookmarkSettings: { pinnedBookmarkUrls: [] } })).toBe(true);
  });

  it('reports an empty payload as not applied', () => {
    const outcome = migrateLegacyState({ markTabSettings: {} });
    expect(outcome.applied).toBe(false);
    expect(outcome.source).toBe('none');
  });
});

describe('storage write failures are surfaced', () => {
  it('reports a rejected sync write and clears the notice on the next success', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    chrome.storage.sync.set = vi.fn(async () => {
      throw new Error('MAX_WRITE_OPERATIONS_PER_MINUTE');
    });
    updateSettings({ theme: 'dark' });
    await flushSettings();
    await flushMicrotasks();
    expect(settingsNotice.value).toBe('sync-write-failed');

    chrome.storage.sync.set = vi.fn(async () => undefined);
    updateSettings({ theme: 'light' });
    await flushSettings();
    await flushMicrotasks();
    expect(settingsNotice.value).toBeNull();
  });

  it('reports a rejected local write and clears the flag on the next success', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    chrome.storage.local.set = vi.fn(async () => {
      throw new Error('QUOTA_BYTES exceeded');
    });
    pinFor('https://example.com/', 'Example');
    await flushUserData();
    await flushMicrotasks();
    expect(userDataWriteError.value).toBe(true);

    chrome.storage.local.set = vi.fn(async () => undefined);
    pinFor('https://example.org/', 'Other');
    await flushUserData();
    await flushMicrotasks();
    expect(userDataWriteError.value).toBe(false);
  });
});
