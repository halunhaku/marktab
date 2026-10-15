import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySettings,
  flushSettings,
  loadSettingsFromStorage,
  markSettingsReady,
  mergeSettings,
  persistSettingsNow,
  pruneForSync,
  resetSettingsToDefaults,
  settings,
  settingsNotice,
  settingsStatus,
  updateSettings,
  watchSettings,
  type SettingsPatch,
} from '@/core/settings/store';
import {
  HIDDEN_FOLDER_CAP,
  SETTINGS_KEY,
  SYNC_ITEM_BUDGET,
  cloneDefaults,
  type Settings,
} from '@/core/settings/types';
import { approximateSize } from '@/core/platform/storage';
import { createFakeChrome, flushMicrotasks } from './helpers/fakes';

/** Long ids, so a payload at the cap really does blow through the quota. */
function oversizedHiddenIds(): string[] {
  return Array.from({ length: HIDDEN_FOLDER_CAP }, (_, index) => `folder-${index}-${'x'.repeat(24)}`);
}

function oversizedSettings(): Settings {
  const value = cloneDefaults();
  value.folders.hiddenIds = oversizedHiddenIds();
  return value;
}

beforeEach(async () => {
  applySettings(cloneDefaults(), { persist: false });
  settingsNotice.value = null;
  settingsStatus.value = 'idle';
  // Drain any write left pending by the previous test so it cannot land in the
  // next test's fake storage.
  await flushSettings();
});

describe('mergeSettings', () => {
  it('merges a nested section without clobbering its siblings', () => {
    const current: Settings = {
      ...cloneDefaults(),
      theme: 'dark',
      home: { ...cloneDefaults().home, recentCount: 12, showClock: false },
      folders: { view: 'list', sort: 'title', hiddenIds: ['7'] },
      search: { engine: 'bing', customTemplate: 'https://s.example/?q=%s', openInNewTab: true, showFavicons: false },
    };

    const merged = mergeSettings(current, { home: { pinnedLimit: 20 } });

    expect(merged.home).toEqual({ ...current.home, pinnedLimit: 20 });
    expect(merged.theme).toBe('dark');
    expect(merged.folders).toEqual(current.folders);
    expect(merged.search).toEqual(current.search);
  });

  it('keeps the fields a section patch does not mention', () => {
    const current = cloneDefaults();
    current.folders.hiddenIds = ['1', '2'];

    const merged = mergeSettings(current, { folders: { sort: 'recent' } });

    expect(merged.folders).toEqual({ view: 'grid', sort: 'recent', hiddenIds: ['1', '2'] });
    expect(merged.search).toEqual(current.search);
    expect(merged.home).toEqual(current.home);
  });

  it('returns a fresh object graph and leaves the input untouched', () => {
    const current = cloneDefaults();
    const snapshot = JSON.parse(JSON.stringify(current)) as Settings;

    const merged = mergeSettings(current, { theme: 'dark' });

    expect(merged).not.toBe(current);
    expect(merged.home).not.toBe(current.home);
    expect(merged.folders).not.toBe(current.folders);
    expect(merged.search).not.toBe(current.search);
    expect(current).toEqual(snapshot);
  });

  it('normalizes the result: clamps toggles, drops unknown keys', () => {
    const merged = mergeSettings(cloneDefaults(), {
      home: { recentCount: 999, pinnedLimit: 1 },
      unknown: 'value',
    } as SettingsPatch);

    expect(merged.home.recentCount).toBe(24);
    expect(merged.home.pinnedLimit).toBe(4);
    expect(merged).not.toHaveProperty('unknown');
  });

  it('falls back to the default for an invalid enum in the patch', () => {
    const merged = mergeSettings(
      { ...cloneDefaults(), theme: 'dark' },
      { theme: 'neon' } as unknown as SettingsPatch,
    );

    expect(merged.theme).toBe('system');
  });
});

describe('pruneForSync', () => {
  it('returns the very same object when the payload already fits', () => {
    const value = cloneDefaults();
    expect(pruneForSync(value)).toBe(value);
  });

  it('trims hiddenIds until the payload fits the per-item quota', () => {
    const value = oversizedSettings();
    expect(approximateSize(value)).toBeGreaterThan(SYNC_ITEM_BUDGET);

    const pruned = pruneForSync(value);

    expect(approximateSize(pruned)).toBeLessThanOrEqual(SYNC_ITEM_BUDGET);
    expect(pruned.folders.hiddenIds.length).toBeLessThan(HIDDEN_FOLDER_CAP);
    expect(pruned.folders.hiddenIds.length).toBeGreaterThan(0);
    // Trimming drops the oldest entries from the front and keeps the tail.
    const kept = value.folders.hiddenIds.slice(value.folders.hiddenIds.length - pruned.folders.hiddenIds.length);
    expect(pruned.folders.hiddenIds).toEqual(kept);
  });

  it('leaves the input and every non-hiddenIds field intact', () => {
    const value = oversizedSettings();
    value.search.customTemplate = 'https://s.example/?q=%s';
    const hiddenIds = [...value.folders.hiddenIds];

    const pruned = pruneForSync(value);

    expect(value.folders.hiddenIds).toEqual(hiddenIds);
    expect(pruned.theme).toBe(value.theme);
    expect(pruned.home).toEqual(value.home);
    expect(pruned.search.engine).toBe(value.search.engine);
    expect(pruned.folders.view).toBe(value.folders.view);
    expect(pruned.folders.sort).toBe(value.folders.sort);
  });

  it('drops the custom template as a last resort', () => {
    const value = oversizedSettings();
    // A single enormous template cannot be trimmed field-by-field, so it is dropped.
    value.search.customTemplate = `https://s.example/?q=%s&pad=${'y'.repeat(SYNC_ITEM_BUDGET)}`;

    const pruned = pruneForSync(value);

    expect(pruned.search.customTemplate).toBe('');
    expect(approximateSize(pruned)).toBeLessThanOrEqual(SYNC_ITEM_BUDGET);
  });

  it('keeps a worst-case payload inside the quota once pruned', () => {
    // Every documented cap at once, plus the only unbounded free-text field.
    const worstCase: Settings = {
      ...cloneDefaults(),
      home: { ...cloneDefaults().home, recentCount: 24, pinnedLimit: 40 },
      folders: { view: 'list', sort: 'title', hiddenIds: oversizedHiddenIds() },
      search: {
        engine: 'custom',
        customTemplate: `https://s.example/?q=%s&pad=${'z'.repeat(512)}`,
        openInNewTab: true,
        showFavicons: true,
      },
    };
    expect(approximateSize(worstCase)).toBeGreaterThan(SYNC_ITEM_BUDGET);

    const pruned = pruneForSync(worstCase);

    expect(approximateSize(pruned)).toBeLessThanOrEqual(SYNC_ITEM_BUDGET);
    expect(pruned.folders.hiddenIds.length).toBeLessThan(HIDDEN_FOLDER_CAP);
    expect(pruned.search.customTemplate).toBe('');
    expect(pruned.home).toEqual(worstCase.home);
    expect(pruned.folders.view).toBe('list');
    expect(pruned.folders.sort).toBe('title');
    expect(pruned.search.engine).toBe('custom');
    expect(pruned.search.openInNewTab).toBe(true);
    expect(pruned.theme).toBe(worstCase.theme);
  });

  it('never grows the payload', () => {
    const value = oversizedSettings();
    const pruned = pruneForSync(value);
    expect(approximateSize(pruned)).toBeLessThanOrEqual(approximateSize(value));
  });
});

describe('updateSettings', () => {
  it('applies a top-level patch and leaves the other sections alone', () => {
    updateSettings({ theme: 'dark', railCollapsed: true });

    expect(settings.value.theme).toBe('dark');
    expect(settings.value.railCollapsed).toBe(true);
    expect(settings.value.home).toEqual(cloneDefaults().home);
    expect(settings.value.folders).toEqual(cloneDefaults().folders);
    expect(settings.value.search).toEqual(cloneDefaults().search);
  });

  it('merges nested sections instead of replacing them', () => {
    updateSettings({ folders: { view: 'list', hiddenIds: ['7'] } });
    updateSettings({ folders: { sort: 'title' } });

    expect(settings.value.folders).toEqual({ view: 'list', sort: 'title', hiddenIds: ['7'] });
  });

  it('normalizes whatever the patch carries', () => {
    updateSettings({ home: { recentCount: 999 }, language: 'fr' } as unknown as SettingsPatch);

    expect(settings.value.home.recentCount).toBe(24);
    expect(settings.value.language).toBe('auto');
    expect(settings.value.schema).toBe(cloneDefaults().schema);
  });

  it('ignores unknown patch keys', () => {
    updateSettings({ bogus: 1 } as unknown as SettingsPatch);

    expect(Object.keys(settings.value).sort()).toEqual(Object.keys(cloneDefaults()).sort());
    expect(settings.value).toEqual(cloneDefaults());
  });

  it('keeps every pin/move invariant through a sequence of updates', () => {
    updateSettings({ folders: { hiddenIds: ['a', 'b'] } });
    updateSettings({ folders: { view: 'list' } });
    updateSettings({ folders: { hiddenIds: ['a', 'b', 'c'] } });

    expect(settings.value.folders).toEqual({
      view: 'list',
      sort: 'manual',
      hiddenIds: ['a', 'b', 'c'],
    });
  });
});

describe('resetSettingsToDefaults', () => {
  it('restores the shipped defaults after a burst of mutations', () => {
    updateSettings({
      theme: 'dark',
      density: 'compact',
      railCollapsed: true,
      home: { recentCount: 20, showClock: false },
      folders: { view: 'list', hiddenIds: ['1'] },
      search: { engine: 'bing', openInNewTab: true },
    });
    expect(settings.value).not.toEqual(cloneDefaults());

    resetSettingsToDefaults();

    expect(settings.value).toEqual(cloneDefaults());
    expect(settings.value.folders.hiddenIds).toEqual([]);
  });

  it('is a no-op when the state is already default', () => {
    const before = settings.value;
    resetSettingsToDefaults();
    expect(settings.value).toBe(before);
  });
});

describe('persistence', () => {
  it('writes the normalized settings to the sync key', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    updateSettings({ theme: 'dark', home: { recentCount: 999 } });
    await flushSettings();
    await flushMicrotasks();

    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(stored).toBeDefined();
    expect(stored.theme).toBe('dark');
    expect(stored.home.recentCount).toBe(24);
    expect(settingsNotice.value).toBeNull();
  });

  it('trims an oversized payload before writing and reports the notice', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    applySettings(oversizedSettings());
    await flushSettings();
    await flushMicrotasks();

    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(approximateSize(stored)).toBeLessThanOrEqual(SYNC_ITEM_BUDGET);
    expect(stored.folders.hiddenIds.length).toBeLessThan(HIDDEN_FOLDER_CAP);
    // The in-memory state keeps everything; only the synced copy is trimmed.
    expect(settings.value.folders.hiddenIds).toHaveLength(HIDDEN_FOLDER_CAP);
    expect(settingsNotice.value).toBe('sync-quota-trimmed');
  });

  it('clears the quota notice once the payload fits again', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    applySettings(oversizedSettings());
    await flushSettings();
    await flushMicrotasks();
    expect(settingsNotice.value).toBe('sync-quota-trimmed');

    applySettings(cloneDefaults());
    await flushSettings();
    await flushMicrotasks();

    expect(settingsNotice.value).toBeNull();
    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(stored.folders.hiddenIds).toEqual([]);
  });

  it('does not persist when persistence is switched off', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    applySettings({ ...cloneDefaults(), theme: 'dark' }, { persist: false });
    await flushSettings();
    await flushMicrotasks();

    expect(settings.value.theme).toBe('dark');
    expect(chrome.storage.sync.data[SETTINGS_KEY]).toBeUndefined();
  });

  it('still updates in memory when no storage API exists', async () => {
    updateSettings({ theme: 'dark' });
    await flushSettings();
    await flushMicrotasks();

    expect(settings.value.theme).toBe('dark');
    expect(settingsNotice.value).toBeNull();
  });
});

describe('persistSettingsNow', () => {
  it('writes the current state even when nothing is scheduled', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    settings.value = { ...cloneDefaults(), theme: 'dark' };
    await persistSettingsNow();

    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(stored.theme).toBe('dark');
    expect(settingsNotice.value).toBeNull();
  });

  it('cancels a write that is still pending', async () => {
    vi.useFakeTimers();
    const chrome = createFakeChrome();
    chrome.install();

    updateSettings({ theme: 'light' });
    settings.value = { ...cloneDefaults(), theme: 'dark' };
    await persistSettingsNow();
    vi.advanceTimersByTime(500);
    await flushMicrotasks();

    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(stored.theme).toBe('dark');
    vi.useRealTimers();
  });

  it('trims an oversized payload before writing and reports the notice', async () => {
    const chrome = createFakeChrome();
    chrome.install();

    settings.value = oversizedSettings();
    await persistSettingsNow();

    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(approximateSize(stored)).toBeLessThanOrEqual(SYNC_ITEM_BUDGET);
    expect(settingsNotice.value).toBe('sync-quota-trimmed');
  });
});

describe('loadSettingsFromStorage', () => {
  it('normalizes what was stored and marks the store ready', async () => {
    const chrome = createFakeChrome({
      sync: { [SETTINGS_KEY]: { theme: 'dark', home: { recentCount: 999 }, junk: 1 } },
    });
    chrome.install();

    const loaded = await loadSettingsFromStorage();

    expect(loaded.theme).toBe('dark');
    expect(loaded.home.recentCount).toBe(24);
    expect(loaded).not.toHaveProperty('junk');
    expect(settings.value).toEqual(loaded);
    expect(settingsStatus.value).toBe('ready');
  });

  it('falls back to the defaults without claiming readiness when nothing is stored', async () => {
    createFakeChrome().install();

    const loaded = await loadSettingsFromStorage();

    expect(loaded).toEqual(cloneDefaults());
    expect(settingsStatus.value).toBe('idle');
  });

  it('reports an error only for a genuine read failure', async () => {
    const chrome = createFakeChrome();
    chrome.storage.sync.get = async () => {
      throw new Error('boom');
    };
    chrome.install();

    const loaded = await loadSettingsFromStorage();

    expect(loaded).toEqual(cloneDefaults());
    expect(settingsStatus.value).toBe('error');
  });

  it('treats missing storage APIs as unavailable rather than broken', async () => {
    await loadSettingsFromStorage();

    expect(settings.value).toEqual(cloneDefaults());
    expect(settingsStatus.value).not.toBe('error');
  });

  it('is idempotent and last-write-wins', async () => {
    const chrome = createFakeChrome({ sync: { [SETTINGS_KEY]: { theme: 'dark' } } });
    chrome.install();

    await loadSettingsFromStorage();
    chrome.storage.sync.data[SETTINGS_KEY] = { theme: 'light' };
    const second = await loadSettingsFromStorage();

    expect(second.theme).toBe('light');
    expect(settings.value.theme).toBe('light');
  });
});

describe('watchSettings', () => {
  it('mirrors a change made by another context', () => {
    const chrome = createFakeChrome();
    chrome.install();
    const dispose = watchSettings();

    chrome.storage.emit('sync', SETTINGS_KEY, { theme: 'dark', language: 'zh' });

    expect(settings.value.theme).toBe('dark');
    expect(settings.value.language).toBe('zh');
    expect(settings.value.home).toEqual(cloneDefaults().home);
    dispose();
  });

  it('ignores changes from another storage area', () => {
    const chrome = createFakeChrome();
    chrome.install();
    const dispose = watchSettings();

    chrome.storage.emit('local', SETTINGS_KEY, { theme: 'dark' });

    expect(settings.value.theme).toBe(cloneDefaults().theme);
    dispose();
  });

  it('falls back to the defaults when the synced key is cleared', () => {
    const chrome = createFakeChrome();
    chrome.install();
    const dispose = watchSettings();

    chrome.storage.emit('sync', SETTINGS_KEY, { theme: 'dark' });
    expect(settings.value.theme).toBe('dark');

    chrome.storage.emit('sync', SETTINGS_KEY, undefined);
    expect(settings.value).toEqual(cloneDefaults());
    dispose();
  });

  it('stops mirroring after dispose', () => {
    const chrome = createFakeChrome();
    chrome.install();
    const dispose = watchSettings();
    dispose();

    chrome.storage.emit('sync', SETTINGS_KEY, { theme: 'dark' });

    expect(settings.value.theme).toBe(cloneDefaults().theme);
    expect(chrome.storage.onChanged.listeners.size).toBe(0);
  });

  it('normalizes an out-of-range value coming from another context', () => {
    const chrome = createFakeChrome();
    chrome.install();
    const dispose = watchSettings();

    chrome.storage.emit('sync', SETTINGS_KEY, { home: { recentCount: -3 }, density: 'huge' });

    expect(settings.value.home.recentCount).toBe(3);
    expect(settings.value.density).toBe('comfortable');
    dispose();
  });

  it('returns a no-op disposer when there is no storage API', () => {
    expect(() => watchSettings()()).not.toThrow();
  });
});

describe('markSettingsReady', () => {
  it('flips the status to ready', () => {
    markSettingsReady();
    expect(settingsStatus.value).toBe('ready');
  });
});

describe('debounced writes', () => {
  it('coalesces rapid updates into a single write', async () => {
    vi.useFakeTimers();
    const chrome = createFakeChrome();
    chrome.install();

    updateSettings({ theme: 'light' });
    updateSettings({ theme: 'dark' });
    updateSettings({ language: 'zh' });

    expect(chrome.storage.sync.data[SETTINGS_KEY]).toBeUndefined();

    vi.advanceTimersByTime(200);
    await flushMicrotasks();

    const stored = chrome.storage.sync.data[SETTINGS_KEY] as Settings;
    expect(stored.theme).toBe('dark');
    expect(stored.language).toBe('zh');
    vi.useRealTimers();
  });
});
