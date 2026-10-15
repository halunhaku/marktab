import { RECENT_CAP, cloneDefaults, type Settings } from './types';
import { normalizeSettings } from './normalize';
import { findEngine } from '../util/url';
import { reindexPins, type PinRecord, type RecentRecord, type UserData } from '../userdata/model';
import { emptyUserData } from '../userdata/model';

export type LegacySource = 'markTabSettings' | 'rainbowBookmarkSettings' | 'none';

export interface LegacyMigrationInput {
  markTabSettings?: unknown;
  rainbowBookmarkSettings?: unknown;
}

export interface MigrationOutcome {
  /** True when a legacy payload was recognised and mapped. */
  applied: boolean;
  source: LegacySource;
  settings: Settings;
  data: UserData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) if (typeof item === 'string' && item) out.push(item);
  return out;
}

function numberMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

const LEGACY_THEMES = ['light', 'dark', 'system'] as const;

/** Every field a v1/v2 payload can carry that this module understands. */
const LEGACY_FIELDS = [
  'theme',
  'defaultEngine',
  'folderViewMode',
  'homeRecentCount',
  'homeShowRecent',
  'sidebarCollapsed',
  'hiddenFolderIds',
  'pinnedBookmarkUrls',
  'recentUrls',
  'recentVisitTimes',
] as const;

/**
 * True when a legacy record carries at least one field we recognise.
 *
 * An empty or unrelated object under `markTabSettings` is not a migration: it
 * would otherwise report itself as applied and rebuild the v3 state from
 * defaults, which reads like a successful upgrade that lost everything.
 */
function hasRecognisedField(record: Record<string, unknown>): boolean {
  return LEGACY_FIELDS.some((field) => record[field] !== undefined);
}

/**
 * Maps the v1/v2 `markTabSettings` payload onto the v3 model.
 *
 * Legacy keys are only ever read: the old payload is left in `storage.sync`
 * untouched so a downgrade to v2.x keeps working and nothing is lost.
 */
export function migrateLegacyState(
  input: LegacyMigrationInput,
  now: number = Date.now(),
): MigrationOutcome {
  const legacy = isRecord(input.markTabSettings)
    ? input.markTabSettings
    : isRecord(input.rainbowBookmarkSettings)
      ? input.rainbowBookmarkSettings
      : undefined;

  const defaults = cloneDefaults();
  if (!legacy || !hasRecognisedField(legacy)) {
    return { applied: false, source: 'none', settings: defaults, data: emptyUserData() };
  }

  const source: LegacySource = isRecord(input.markTabSettings)
    ? 'markTabSettings'
    : 'rainbowBookmarkSettings';

  const themeRaw = legacy.theme;
  const theme =
    typeof themeRaw === 'string' && (LEGACY_THEMES as readonly string[]).includes(themeRaw)
      ? (themeRaw as Settings['theme'])
      : defaults.theme;

  const engineRaw = legacy.defaultEngine;
  const engine =
    typeof engineRaw === 'string' && (engineRaw === 'custom' || findEngine(engineRaw))
      ? engineRaw
      : defaults.search.engine;

  const viewRaw = legacy.folderViewMode;
  const view = viewRaw === 'list' ? 'list' : defaults.folders.view;

  const legacyRecentCount =
    typeof legacy.homeRecentCount === 'number' ? legacy.homeRecentCount : defaults.home.recentCount;

  const settings = normalizeSettings({
    theme,
    railCollapsed: legacy.sidebarCollapsed,
    home: {
      showRecent: legacy.homeShowRecent,
      recentCount: legacyRecentCount,
    },
    folders: {
      view,
      hiddenIds: stringList(legacy.hiddenFolderIds),
    },
    search: { engine },
  });

  const pinnedUrls = stringList(legacy.pinnedBookmarkUrls);
  const seenPin = new Set<string>();
  const pins: PinRecord[] = [];
  for (const url of pinnedUrls) {
    if (seenPin.has(url)) continue;
    seenPin.add(url);
    pins.push({ url, title: '', addedAt: 0, order: pins.length });
  }

  const visitTimes = numberMap(legacy.recentVisitTimes);
  const recentUrls = stringList(legacy.recentUrls);
  const seenRecent = new Set<string>();
  const recent: RecentRecord[] = [];
  recentUrls.forEach((url, index) => {
    if (seenRecent.has(url)) return;
    seenRecent.add(url);
    const ts = visitTimes[url];
    recent.push({ url, title: '', ts: typeof ts === 'number' ? ts : now - index * 1000 });
  });
  recent.sort((a, b) => b.ts - a.ts);

  const data: UserData = {
    schema: 1,
    pins: reindexPins(pins),
    recent: recent.slice(0, RECENT_CAP),
    migration: {
      source: `legacy:${source}`,
      at: now,
      items: { pins: pins.length, recent: Math.min(recent.length, RECENT_CAP), foldered: settings.folders.hiddenIds.length },
    },
  };

  return { applied: true, source, settings, data };
}

export function hasLegacyPayload(input: LegacyMigrationInput): boolean {
  const record = isRecord(input.markTabSettings)
    ? input.markTabSettings
    : isRecord(input.rainbowBookmarkSettings)
      ? input.rainbowBookmarkSettings
      : undefined;
  return record !== undefined && hasRecognisedField(record);
}
