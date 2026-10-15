import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  HIDDEN_FOLDER_CAP,
  PINNED_LIMIT_MAX,
  PINNED_LIMIT_MIN,
  RECENT_COUNT_MAX,
  RECENT_COUNT_MIN,
  SETTINGS_SCHEMA,
  SYNC_ITEM_BUDGET,
  cloneDefaults,
} from '@/core/settings/types';
import { normalizeSettings, settingsEqual } from '@/core/settings/normalize';
import { approximateSize } from '@/core/platform/storage';

const sortedKeys = (value: object): string[] => Object.keys(value).sort();

describe('cloneDefaults', () => {
  it('returns a structurally equal but independent copy', () => {
    const first = cloneDefaults();
    const second = cloneDefaults();

    expect(first).toEqual(DEFAULT_SETTINGS);
    expect(first).not.toBe(second);
    expect(first.home).not.toBe(second.home);
    expect(first.folders).not.toBe(second.folders);
    expect(first.search).not.toBe(second.search);
    expect(first.folders.hiddenIds).not.toBe(second.folders.hiddenIds);
  });

  it('never shares a nested reference with DEFAULT_SETTINGS', () => {
    const copy = cloneDefaults();
    expect(copy.home).not.toBe(DEFAULT_SETTINGS.home);
    expect(copy.folders).not.toBe(DEFAULT_SETTINGS.folders);
    expect(copy.search).not.toBe(DEFAULT_SETTINGS.search);
    expect(copy.folders.hiddenIds).not.toBe(DEFAULT_SETTINGS.folders.hiddenIds);
  });

  it('isolates mutations from later copies and from the shipped defaults', () => {
    const copy = cloneDefaults();
    copy.theme = 'dark';
    copy.home.recentCount = 99;
    copy.folders.hiddenIds.push('42');
    copy.search.engine = 'custom';

    const fresh = cloneDefaults();
    expect(fresh.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(fresh.home.recentCount).toBe(DEFAULT_SETTINGS.home.recentCount);
    expect(fresh.folders.hiddenIds).toEqual([]);
    expect(fresh.search.engine).toBe(DEFAULT_SETTINGS.search.engine);
    expect(DEFAULT_SETTINGS.folders.hiddenIds).toEqual([]);
  });

  it('ships defaults that already satisfy the documented ranges', () => {
    expect(DEFAULT_SETTINGS.schema).toBe(SETTINGS_SCHEMA);
    expect(DEFAULT_SETTINGS.home.recentCount).toBeGreaterThanOrEqual(RECENT_COUNT_MIN);
    expect(DEFAULT_SETTINGS.home.recentCount).toBeLessThanOrEqual(RECENT_COUNT_MAX);
    expect(DEFAULT_SETTINGS.home.pinnedLimit).toBeGreaterThanOrEqual(PINNED_LIMIT_MIN);
    expect(DEFAULT_SETTINGS.home.pinnedLimit).toBeLessThanOrEqual(PINNED_LIMIT_MAX);
    expect(DEFAULT_SETTINGS.folders.hiddenIds).toEqual([]);
    expect(RECENT_COUNT_MIN).toBeLessThan(RECENT_COUNT_MAX);
    expect(PINNED_LIMIT_MIN).toBeLessThan(PINNED_LIMIT_MAX);
  });

  it('keeps the default payload far away from the sync quota', () => {
    expect(approximateSize(DEFAULT_SETTINGS)).toBeLessThan(SYNC_ITEM_BUDGET / 4);
  });
});

describe('normalizeSettings', () => {
  it('falls back to the shipped defaults for anything that is not a record', () => {
    for (const raw of [undefined, null, 42, 'dark', true, [], ['theme']]) {
      expect(normalizeSettings(raw)).toEqual(cloneDefaults());
    }
  });

  it('drops unknown keys, including unknown keys inside sections', () => {
    const normalized = normalizeSettings({
      schema: 1,
      theme: 'dark',
      nope: 'value',
      home: { recentCount: 12, extra: true },
      folders: { view: 'list', bogus: 1 },
      search: { engine: 'bing', unknown: 'x' },
    });

    expect(sortedKeys(normalized)).toEqual(sortedKeys(DEFAULT_SETTINGS));
    expect(sortedKeys(normalized.home)).toEqual(sortedKeys(DEFAULT_SETTINGS.home));
    expect(sortedKeys(normalized.folders)).toEqual(sortedKeys(DEFAULT_SETTINGS.folders));
    expect(sortedKeys(normalized.search)).toEqual(sortedKeys(DEFAULT_SETTINGS.search));
    expect(normalized).not.toHaveProperty('nope');
    expect(normalized.home).not.toHaveProperty('extra');
    expect(normalized.schema).toBe(SETTINGS_SCHEMA);
    expect(normalized.theme).toBe('dark');
    expect(normalized.home.recentCount).toBe(12);
    expect(normalized.search.engine).toBe('bing');
  });

  it('fills every field the payload is missing', () => {
    const normalized = normalizeSettings({ theme: 'dark', home: { recentCount: 12 } });

    expect(normalized).toEqual({
      ...cloneDefaults(),
      theme: 'dark',
      home: { ...cloneDefaults().home, recentCount: 12 },
    });
  });

  it('falls back per field when a value has the wrong type or an unknown enum member', () => {
    const normalized = normalizeSettings({
      theme: 'neon',
      language: 'fr',
      density: 'huge',
      motion: 'slow',
      railCollapsed: 1,
      home: { showClock: 'yes', showPinned: null, showRecent: 0, showFolders: [] },
      folders: { view: 'tiles', sort: 'alpha' },
      search: { openInNewTab: 'yes', showFavicons: 'no' },
    });

    expect(normalized.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(normalized.language).toBe(DEFAULT_SETTINGS.language);
    expect(normalized.density).toBe(DEFAULT_SETTINGS.density);
    expect(normalized.motion).toBe(DEFAULT_SETTINGS.motion);
    expect(normalized.railCollapsed).toBe(false);
    expect(normalized.home.showClock).toBe(true);
    expect(normalized.home.showPinned).toBe(true);
    expect(normalized.home.showRecent).toBe(true);
    expect(normalized.home.showFolders).toBe(true);
    expect(normalized.folders.view).toBe(DEFAULT_SETTINGS.folders.view);
    expect(normalized.folders.sort).toBe(DEFAULT_SETTINGS.folders.sort);
    expect(normalized.search.openInNewTab).toBe(false);
    expect(normalized.search.showFavicons).toBe(true);
  });

  it('honours every valid enum member', () => {
    expect(normalizeSettings({ density: 'compact' }).density).toBe('compact');
    expect(normalizeSettings({ motion: 'reduced' }).motion).toBe('reduced');
    expect(normalizeSettings({ motion: 'full' }).motion).toBe('full');
    expect(normalizeSettings({ language: 'zh' }).language).toBe('zh');
    expect(normalizeSettings({ language: 'en' }).language).toBe('en');
    expect(normalizeSettings({ railCollapsed: true }).railCollapsed).toBe(true);
    expect(normalizeSettings({ folders: { view: 'list' } }).folders.view).toBe('list');
    expect(normalizeSettings({ folders: { sort: 'title' } }).folders.sort).toBe('title');
    expect(normalizeSettings({ folders: { sort: 'recent' } }).folders.sort).toBe('recent');
  });

  it('clamps recentCount into RECENT_COUNT_MIN..RECENT_COUNT_MAX', () => {
    const recentCount = (value: unknown): number =>
      normalizeSettings({ home: { recentCount: value } }).home.recentCount;

    expect(recentCount(0)).toBe(RECENT_COUNT_MIN);
    expect(recentCount(-100)).toBe(RECENT_COUNT_MIN);
    expect(recentCount(RECENT_COUNT_MIN)).toBe(RECENT_COUNT_MIN);
    expect(recentCount(RECENT_COUNT_MAX)).toBe(RECENT_COUNT_MAX);
    expect(recentCount(RECENT_COUNT_MAX + 1)).toBe(RECENT_COUNT_MAX);
    expect(recentCount(999)).toBe(RECENT_COUNT_MAX);
    expect(recentCount(7.4)).toBe(7);
    expect(recentCount(7.5)).toBe(8);
    expect(recentCount(Number.NaN)).toBe(DEFAULT_SETTINGS.home.recentCount);
    expect(recentCount(Number.POSITIVE_INFINITY)).toBe(DEFAULT_SETTINGS.home.recentCount);
    expect(recentCount('5')).toBe(DEFAULT_SETTINGS.home.recentCount);
    expect(recentCount(null)).toBe(DEFAULT_SETTINGS.home.recentCount);
  });

  it('clamps pinnedLimit into PINNED_LIMIT_MIN..PINNED_LIMIT_MAX', () => {
    const pinnedLimit = (value: unknown): number =>
      normalizeSettings({ home: { pinnedLimit: value } }).home.pinnedLimit;

    expect(pinnedLimit(0)).toBe(PINNED_LIMIT_MIN);
    expect(pinnedLimit(PINNED_LIMIT_MAX + 1)).toBe(PINNED_LIMIT_MAX);
    expect(pinnedLimit(1000)).toBe(PINNED_LIMIT_MAX);
    expect(pinnedLimit(3.6)).toBe(PINNED_LIMIT_MIN);
    expect(pinnedLimit(39.6)).toBe(PINNED_LIMIT_MAX);
    expect(pinnedLimit('12')).toBe(DEFAULT_SETTINGS.home.pinnedLimit);
    expect(pinnedLimit(undefined)).toBe(DEFAULT_SETTINGS.home.pinnedLimit);
  });

  it('caps hiddenIds at HIDDEN_FOLDER_CAP', () => {
    const many = Array.from({ length: HIDDEN_FOLDER_CAP + 250 }, (_, index) => `f${index}`);
    const normalized = normalizeSettings({ folders: { hiddenIds: many } });

    expect(normalized.folders.hiddenIds).toHaveLength(HIDDEN_FOLDER_CAP);
    expect(normalized.folders.hiddenIds).toEqual(many.slice(0, HIDDEN_FOLDER_CAP));
    expect(new Set(normalized.folders.hiddenIds).size).toBe(HIDDEN_FOLDER_CAP);
  });

  it('de-duplicates hiddenIds and drops empty or non-string entries', () => {
    expect(
      normalizeSettings({ folders: { hiddenIds: ['a', 'a', 'b', '', 'a', 'b'] } }).folders.hiddenIds,
    ).toEqual(['a', 'b']);
    expect(
      normalizeSettings({ folders: { hiddenIds: ['a', '', 5, null, { id: 'x' }, 'b'] } }).folders
        .hiddenIds,
    ).toEqual(['a', 'b']);
    expect(normalizeSettings({ folders: { hiddenIds: 'a' } }).folders.hiddenIds).toEqual([]);
    expect(normalizeSettings({ folders: { hiddenIds: null } }).folders.hiddenIds).toEqual([]);
  });

  it('accepts only engines that exist, and reads the engine id case-sensitively', () => {
    expect(normalizeSettings({ search: { engine: 'bing' } }).search.engine).toBe('bing');
    expect(normalizeSettings({ search: { engine: 'custom' } }).search.engine).toBe('custom');
    expect(normalizeSettings({ search: { engine: 'yandex' } }).search.engine).toBe(
      DEFAULT_SETTINGS.search.engine,
    );
    expect(normalizeSettings({ search: { engine: 'BING' } }).search.engine).toBe(
      DEFAULT_SETTINGS.search.engine,
    );
    expect(normalizeSettings({ search: { engine: 42 } }).search.engine).toBe(
      DEFAULT_SETTINGS.search.engine,
    );
  });

  it('validates the custom template only while the custom engine is selected', () => {
    expect(
      normalizeSettings({ search: { engine: 'custom', customTemplate: '  https://s.example/?q=%s  ' } })
        .search.customTemplate,
    ).toBe('https://s.example/?q=%s');
    expect(
      normalizeSettings({ search: { engine: 'custom', customTemplate: 'https://s.example/' } }).search
        .customTemplate,
    ).toBe('https://s.example/');
    expect(
      normalizeSettings({ search: { engine: 'custom', customTemplate: 'javascript:alert(1)' } })
        .search.customTemplate,
    ).toBe('');
    expect(
      normalizeSettings({ search: { engine: 'custom', customTemplate: 'not a url' } }).search
        .customTemplate,
    ).toBe('');
    expect(
      normalizeSettings({ search: { engine: 'custom', customTemplate: '   ' } }).search.customTemplate,
    ).toBe('');
    expect(
      normalizeSettings({ search: { engine: 'custom', customTemplate: 42 } }).search.customTemplate,
    ).toBe('');
    // Inert until the custom engine is selected, so it is kept verbatim (trimmed).
    expect(
      normalizeSettings({ search: { engine: 'google', customTemplate: ' javascript:alert(1) ' } }).search
        .customTemplate,
    ).toBe('javascript:alert(1)');
  });

  it('is idempotent', () => {
    const messy = {
      theme: 'dark',
      language: 'nope',
      home: { recentCount: 500, showClock: 'yes' },
      folders: { hiddenIds: ['a', 'a', 7] },
      search: { engine: 'duckduckgo', customTemplate: 9 },
      junk: true,
    };
    const once = normalizeSettings(messy);

    expect(normalizeSettings(once)).toEqual(once);
    expect(normalizeSettings(normalizeSettings(normalizeSettings(messy)))).toEqual(once);
  });
});

describe('settingsEqual', () => {
  it('compares by value, including nested sections', () => {
    expect(settingsEqual(cloneDefaults(), cloneDefaults())).toBe(true);
    expect(
      settingsEqual(cloneDefaults(), { ...cloneDefaults(), theme: 'dark' }),
    ).toBe(false);
    expect(
      settingsEqual(cloneDefaults(), {
        ...cloneDefaults(),
        folders: { ...cloneDefaults().folders, hiddenIds: ['1'] },
      }),
    ).toBe(false);
    expect(
      settingsEqual(cloneDefaults(), {
        ...cloneDefaults(),
        home: { ...cloneDefaults().home, recentCount: RECENT_COUNT_MAX },
      }),
    ).toBe(false);
  });

  it('sees normalized payloads as equal regardless of their original noise', () => {
    expect(
      settingsEqual(normalizeSettings({ theme: 'dark' }), normalizeSettings({ theme: 'dark', junk: 1 })),
    ).toBe(true);
  });
});
