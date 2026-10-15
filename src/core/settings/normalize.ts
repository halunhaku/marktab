import type { FolderSortMode, FolderView, LanguageSetting, MotionSetting, Settings } from './types';
import {
  HIDDEN_FOLDER_CAP,
  PINNED_LIMIT_MAX,
  PINNED_LIMIT_MIN,
  RECENT_COUNT_MAX,
  RECENT_COUNT_MIN,
  SETTINGS_SCHEMA,
  cloneDefaults,
} from './types';
import { findEngine, isValidTemplate } from '../util/url';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function stringArray(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) continue;
    seen.add(item);
    if (seen.size >= cap) break;
  }
  return [...seen];
}

/**
 * Coerces arbitrary stored data into a valid `Settings` object.
 *
 * Guarantees: no unknown keys survive, every field is inside its documented
 * range, and a corrupt value can never break rendering (it falls back to the
 * shipped default for that single field).
 */
export function normalizeSettings(raw: unknown): Settings {
  const base = cloneDefaults();
  if (!isRecord(raw)) return base;

  const home = isRecord(raw.home) ? raw.home : {};
  const folders = isRecord(raw.folders) ? raw.folders : {};
  const search = isRecord(raw.search) ? raw.search : {};

  const engineId = typeof search.engine === 'string' ? search.engine : base.search.engine;
  const engine = engineId === 'custom' || findEngine(engineId) ? engineId : base.search.engine;
  const template = typeof search.customTemplate === 'string' ? search.customTemplate.trim() : '';
  const customTemplate =
    engine === 'custom' && !isValidTemplate(template) ? base.search.customTemplate : template;

  const settings: Settings = {
    schema: SETTINGS_SCHEMA,
    theme: pickEnum<Settings['theme']>(raw.theme, ['light', 'dark', 'system'], base.theme),
    language: pickEnum<LanguageSetting>(raw.language, ['auto', 'en', 'zh'], base.language),
    density: pickEnum<Settings['density']>(raw.density, ['comfortable', 'compact'], base.density),
    motion: pickEnum<MotionSetting>(raw.motion, ['system', 'reduced', 'full'], base.motion),
    railCollapsed: pickBool(raw.railCollapsed, base.railCollapsed),
    home: {
      showClock: pickBool(home.showClock, base.home.showClock),
      showPinned: pickBool(home.showPinned, base.home.showPinned),
      showRecent: pickBool(home.showRecent, base.home.showRecent),
      showFolders: pickBool(home.showFolders, base.home.showFolders),
      recentCount: clampInt(home.recentCount, RECENT_COUNT_MIN, RECENT_COUNT_MAX, base.home.recentCount),
      pinnedLimit: clampInt(
        home.pinnedLimit,
        PINNED_LIMIT_MIN,
        PINNED_LIMIT_MAX,
        base.home.pinnedLimit,
      ),
    },
    folders: {
      view: pickEnum<FolderView>(folders.view, ['grid', 'list'], base.folders.view),
      sort: pickEnum<FolderSortMode>(folders.sort, ['manual', 'title', 'recent'], base.folders.sort),
      hiddenIds: stringArray(folders.hiddenIds, HIDDEN_FOLDER_CAP),
    },
    search: {
      engine,
      customTemplate,
      openInNewTab: pickBool(search.openInNewTab, base.search.openInNewTab),
      showFavicons: pickBool(search.showFavicons, base.search.showFavicons),
    },
  };

  return settings;
}

export function settingsEqual(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
