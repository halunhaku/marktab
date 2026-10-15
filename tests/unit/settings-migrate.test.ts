import { describe, expect, it } from 'vitest';
import { hasLegacyPayload, migrateLegacyState } from '@/core/settings/migrate';
import { cloneDefaults, RECENT_CAP } from '@/core/settings/types';
import { addPin, normalizeUserData } from '@/core/userdata/model';

/** Shape of a real v2.x `markTabSettings` bag, including its noise. */
const V2_PROFILE = {
  theme: 'dark',
  defaultEngine: 'duckduckgo',
  folderViewMode: 'list',
  homeRecentCount: 30,
  homeShowRecent: false,
  sidebarCollapsed: true,
  hiddenFolderIds: ['10', '11', '10'],
  pinnedBookmarkUrls: ['https://a.example/', 'https://b.example/', 'https://a.example/'],
  recentUrls: ['https://r1.example/', 'https://r2.example/', 'https://r1.example/'],
  recentVisitTimes: { 'https://r1.example/': 2000, 'https://r2.example/': 1000 },
};

describe('migrateLegacyState', () => {
  it('maps a realistic v2 profile onto the v3 settings and data shapes', () => {
    const outcome = migrateLegacyState({ markTabSettings: V2_PROFILE }, 5_000_000);

    expect(outcome.applied).toBe(true);
    expect(outcome.source).toBe('markTabSettings');
    expect(outcome.settings).toEqual({
      ...cloneDefaults(),
      theme: 'dark',
      railCollapsed: true,
      home: { ...cloneDefaults().home, showRecent: false, recentCount: 24 },
      folders: { ...cloneDefaults().folders, view: 'list', hiddenIds: ['10', '11'] },
      search: { ...cloneDefaults().search, engine: 'duckduckgo' },
    });
    expect(outcome.data.pins).toEqual([
      { url: 'https://a.example/', title: '', addedAt: 0, order: 0 },
      { url: 'https://b.example/', title: '', addedAt: 0, order: 1 },
    ]);
    expect(outcome.data.recent).toEqual([
      { url: 'https://r1.example/', title: '', ts: 2000 },
      { url: 'https://r2.example/', title: '', ts: 1000 },
    ]);
    expect(outcome.data.schema).toBe(1);
    expect(outcome.data.migration).toEqual({
      source: 'legacy:markTabSettings',
      at: 5_000_000,
      items: { pins: 2, recent: 2, foldered: 2 },
    });
  });

  it('keeps every field v2 never stored at its shipped default', () => {
    const outcome = migrateLegacyState({ markTabSettings: V2_PROFILE }, 5_000_000);
    const defaults = cloneDefaults();

    expect(outcome.settings.language).toBe(defaults.language);
    expect(outcome.settings.density).toBe(defaults.density);
    expect(outcome.settings.motion).toBe(defaults.motion);
    expect(outcome.settings.home.showClock).toBe(true);
    expect(outcome.settings.home.showPinned).toBe(true);
    expect(outcome.settings.home.showFolders).toBe(true);
    expect(outcome.settings.home.pinnedLimit).toBe(defaults.home.pinnedLimit);
    expect(outcome.settings.folders.sort).toBe(defaults.folders.sort);
    expect(outcome.settings.search.customTemplate).toBe('');
    expect(outcome.settings.search.openInNewTab).toBe(false);
    expect(outcome.settings.search.showFavicons).toBe(true);
    expect(outcome.settings.schema).toBe(defaults.schema);
  });

  it('de-duplicates the pinned urls and keeps their order', () => {
    const outcome = migrateLegacyState({
      markTabSettings: { pinnedBookmarkUrls: ['b', 'a', 'b', '', 'a', 'c'] },
    });

    expect(outcome.data.pins.map((pin) => pin.url)).toEqual(['b', 'a', 'c']);
    expect(outcome.data.pins.map((pin) => pin.order)).toEqual([0, 1, 2]);
    expect(outcome.data.migration?.items.pins).toBe(3);
  });

  it('orders history newest first and honours the recorded visit times', () => {
    const outcome = migrateLegacyState({
      markTabSettings: {
        recentUrls: ['https://old/', 'https://new/'],
        recentVisitTimes: { 'https://old/': 10, 'https://new/': 90 },
      },
    });

    expect(outcome.data.recent.map((item) => item.url)).toEqual(['https://new/', 'https://old/']);
  });

  it('derives visit times from the legacy order when none were recorded', () => {
    const outcome = migrateLegacyState(
      { markTabSettings: { recentUrls: ['https://first/', 'https://second/', 'https://third/'] } },
      10_000,
    );

    expect(outcome.data.recent).toEqual([
      { url: 'https://first/', title: '', ts: 10_000 },
      { url: 'https://second/', title: '', ts: 9_000 },
      { url: 'https://third/', title: '', ts: 8_000 },
    ]);
  });

  it('mixes derived and explicit visit times deterministically', () => {
    const outcome = migrateLegacyState(
      {
        markTabSettings: {
          recentUrls: ['https://first/', 'https://explicit/', 'https://third/'],
          recentVisitTimes: { 'https://explicit/': 50 },
        },
      },
      10_000,
    );

    expect(outcome.data.recent).toEqual([
      { url: 'https://first/', title: '', ts: 10_000 },
      { url: 'https://third/', title: '', ts: 8_000 },
      { url: 'https://explicit/', title: '', ts: 50 },
    ]);
  });

  it('caps the migrated history at RECENT_CAP, keeping the newest entries', () => {
    const urls = Array.from({ length: RECENT_CAP + 50 }, (_, index) => `https://r${index}.example/`);
    const visitTimes = Object.fromEntries(urls.map((url, index) => [url, 1000 + index]));

    const outcome = migrateLegacyState({ markTabSettings: { recentUrls: urls, recentVisitTimes: visitTimes } });

    expect(outcome.data.recent).toHaveLength(RECENT_CAP);
    expect(outcome.data.recent[0]?.url).toBe(urls[RECENT_CAP + 49]);
    expect(outcome.data.recent[RECENT_CAP - 1]?.url).toBe(urls[50]);
    expect(outcome.data.migration?.items.recent).toBe(RECENT_CAP);
  });

  it('never throws on a partial or garbage payload and yields safe defaults', () => {
    const outcome = migrateLegacyState(
      {
        markTabSettings: {
          theme: 42,
          defaultEngine: ['x'],
          folderViewMode: {},
          homeRecentCount: 'many',
          homeShowRecent: 'yes',
          sidebarCollapsed: 1,
          hiddenFolderIds: [1, 'ok', null, 'ok'],
          pinnedBookmarkUrls: 'nope',
          recentUrls: [7, 'https://r.example/'],
          recentVisitTimes: { 'https://r.example/': 'soon' },
        },
      },
      7_000,
    );

    expect(outcome.applied).toBe(true);
    expect(outcome.settings).toEqual({
      ...cloneDefaults(),
      folders: { ...cloneDefaults().folders, hiddenIds: ['ok'] },
    });
    expect(outcome.data.pins).toEqual([]);
    expect(outcome.data.recent).toEqual([{ url: 'https://r.example/', title: '', ts: 7_000 }]);
    expect(outcome.data.migration?.items).toEqual({ pins: 0, recent: 1, foldered: 1 });
  });

  it('clamps legacy numbers through the settings normalizer', () => {
    expect(
      migrateLegacyState({ markTabSettings: { homeRecentCount: 500 } }).settings.home.recentCount,
    ).toBe(24);
    expect(
      migrateLegacyState({ markTabSettings: { homeRecentCount: -5 } }).settings.home.recentCount,
    ).toBe(3);
    expect(migrateLegacyState({ markTabSettings: { folderViewMode: 'nonsense' } }).settings.folders.view).toBe(
      'grid',
    );
    expect(migrateLegacyState({ markTabSettings: { defaultEngine: 'yandex' } }).settings.search.engine).toBe(
      'google',
    );
    expect(migrateLegacyState({ markTabSettings: { theme: 'neon' } }).settings.theme).toBe('system');
  });

  it('treats a legacy record with no recognised field as nothing to migrate', () => {
    // ADR-019: an empty or unrelated payload must not report itself as an applied
    // migration, because the caller would then rebuild v3 state from defaults and
    // present a lost upgrade as a successful one.
    const outcome = migrateLegacyState({ markTabSettings: {} }, 1_000);

    expect(outcome.applied).toBe(false);
    expect(outcome.source).toBe('none');
    expect(outcome.settings).toEqual(cloneDefaults());
    expect(outcome.data.pins).toEqual([]);
    expect(outcome.data.migration).toBeUndefined();

    const unrelated = migrateLegacyState({ markTabSettings: { somethingElse: 1 } }, 1_000);
    expect(unrelated.applied).toBe(false);
  });

  it('reports nothing to migrate when no legacy payload is present', () => {
    for (const input of [{}, { markTabSettings: undefined }, { markTabSettings: null }, { markTabSettings: [] }]) {
      const outcome = migrateLegacyState(input, 1_000);

      expect(outcome.applied).toBe(false);
      expect(outcome.source).toBe('none');
      expect(outcome.settings).toEqual(cloneDefaults());
      expect(outcome.data.pins).toEqual([]);
      expect(outcome.data.recent).toEqual([]);
      expect(outcome.data.migration).toBeUndefined();
    }
  });

  it('accepts the rainbowBookmarkSettings key', () => {
    const outcome = migrateLegacyState({
      rainbowBookmarkSettings: { theme: 'light', defaultEngine: 'bing', pinnedBookmarkUrls: ['https://p/'] },
    });

    expect(outcome.applied).toBe(true);
    expect(outcome.source).toBe('rainbowBookmarkSettings');
    expect(outcome.settings.theme).toBe('light');
    expect(outcome.settings.search.engine).toBe('bing');
    expect(outcome.data.pins.map((pin) => pin.url)).toEqual(['https://p/']);
    expect(outcome.data.migration?.source).toBe('legacy:rainbowBookmarkSettings');
  });

  it('prefers markTabSettings and falls back when it is not a record', () => {
    const both = migrateLegacyState({
      markTabSettings: { theme: 'dark' },
      rainbowBookmarkSettings: { theme: 'light' },
    });
    expect(both.source).toBe('markTabSettings');
    expect(both.settings.theme).toBe('dark');

    const fallback = migrateLegacyState({
      markTabSettings: 'garbage',
      rainbowBookmarkSettings: { theme: 'light' },
    });
    expect(fallback.source).toBe('rainbowBookmarkSettings');
    expect(fallback.settings.theme).toBe('light');
  });

  it('is idempotent and leaves the legacy payload untouched', () => {
    const input = { markTabSettings: V2_PROFILE };
    const snapshot = JSON.stringify(input);

    const first = migrateLegacyState(input, 5_000_000);
    const second = migrateLegacyState(input, 5_000_000);

    expect(second).toEqual(first);
    expect(second.settings).not.toBe(first.settings);
    expect(second.data).not.toBe(first.data);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('produces data that survives a round trip through the normalizer', () => {
    const outcome = migrateLegacyState({ markTabSettings: V2_PROFILE }, 5_000_000);

    expect(normalizeUserData(outcome.data)).toEqual(outcome.data);
  });

  it('produces pins that stay dense-ordered once new pins are added', () => {
    const outcome = migrateLegacyState({
      markTabSettings: { pinnedBookmarkUrls: ['https://a/', 'https://b/'] },
    });

    const added = addPin(outcome.data, { url: 'https://c/', title: 'C' });

    expect(added.changed).toBe(true);
    expect(added.data.pins.map((pin) => pin.url)).toEqual(['https://a/', 'https://b/', 'https://c/']);
    expect(added.data.pins.map((pin) => pin.order)).toEqual([0, 1, 2]);
  });
});

describe('hasLegacyPayload', () => {
  it('detects payloads under either legacy key', () => {
    expect(hasLegacyPayload({ markTabSettings: { theme: 'dark' } })).toBe(true);
    expect(hasLegacyPayload({ markTabSettings: { pinnedBookmarkUrls: [] } })).toBe(true);
    expect(hasLegacyPayload({ rainbowBookmarkSettings: { theme: 'dark' }, markTabSettings: null })).toBe(
      true,
    );
    // A record with nothing recognisable is not a payload to migrate (ADR-019).
    expect(hasLegacyPayload({ markTabSettings: {} })).toBe(false);
    expect(hasLegacyPayload({ rainbowBookmarkSettings: {} })).toBe(false);
    expect(hasLegacyPayload({ markTabSettings: { somethingElse: 1 } })).toBe(false);
  });

  it('ignores absent, empty and non-record values', () => {
    expect(hasLegacyPayload({})).toBe(false);
    expect(hasLegacyPayload({ markTabSettings: undefined })).toBe(false);
    expect(hasLegacyPayload({ markTabSettings: null })).toBe(false);
    expect(hasLegacyPayload({ markTabSettings: [] })).toBe(false);
    expect(hasLegacyPayload({ markTabSettings: 'markTabSettings' })).toBe(false);
    expect(hasLegacyPayload({ rainbowBookmarkSettings: 7 })).toBe(false);
  });
});
