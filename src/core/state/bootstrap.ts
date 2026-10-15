import { readKey, writeKey } from '../platform/storage';
import { DATA_KEY, LEGACY_SETTINGS_KEYS, SETTINGS_KEY, cloneDefaults } from '../settings/types';
import type { Settings } from '../settings/types';
import type { UserData } from '../userdata/model';
import { hasLegacyPayload, migrateLegacyState } from '../settings/migrate';
import {
  flushSettings,
  loadSettingsFromStorage,
  markSettingsReady,
  persistSettingsNow,
  watchSettings,
} from '../settings/store';
import { settings, userData } from './signals';
import {
  flushUserData,
  loadUserData,
  markUserDataHydrated,
  persistUserDataNow,
  replaceUserData,
  watchUserData,
} from '../userdata/store';

export interface BootstrapResult {
  /** True when v1/v2 settings were found and mapped onto the v3 model. */
  migrated: boolean;
  source: string;
  /** Legacy v2.x data was found in `storage.sync`; it is never deleted. */
  legacyLeftInPlace: boolean;
  /** Re-export of the migrated settings, for tests and diagnostics. */
  settings: Settings;
  dispose: () => void;
}

let running: Promise<BootstrapResult> | null = null;

async function readLegacyPayload(): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  for (const key of LEGACY_SETTINGS_KEYS) {
    const { value } = await readKey<unknown>('sync', key);
    if (value !== undefined) payload[key] = value;
  }
  return payload;
}

/**
 * Loads MarkTab state once per page, migrating v1/v2 data on first run.
 *
 * Guarantees:
 *  - only ever writes the two namespaced v3 keys;
 *  - never deletes or rewrites a legacy key;
 *  - never touches browser bookmarks;
 *  - idempotent: a second call returns the first result instead of re-migrating.
 */
export function bootstrapState(): Promise<BootstrapResult> {
  if (running) return running;
  running = (async (): Promise<BootstrapResult> => {
    const [settingsRead, dataRead] = await Promise.all([
      readKey<unknown>('sync', SETTINGS_KEY),
      readKey<unknown>('local', DATA_KEY),
    ]);

    await loadSettingsFromStorage();
    await loadUserData();

    // A read that *failed* is not an absent key: writing on top of it could
    // destroy data we simply could not see.
    const settingsMissing = settingsRead.value === undefined && settingsRead.error === undefined;
    const dataMissing = dataRead.value === undefined && dataRead.error === undefined;

    // Migration is a first-run upgrade, so it needs both halves to be absent.
    // `storage.sync` delivers settings to a second device while that device's
    // local data is still empty, and the legacy keys a v2 user left behind are
    // still there: migrating on the settings key alone would replace live v3
    // settings with the older v2 payload and sync that reversion everywhere.
    const needsMigration = settingsMissing && dataMissing;
    let migrated = false;
    let source = 'none';
    let legacyLeftInPlace = false;

    if (needsMigration) {
      const legacy = await readLegacyPayload();
      legacyLeftInPlace = hasLegacyPayload(legacy);
      if (legacyLeftInPlace) {
        const outcome = migrateLegacyState(legacy);
        migrated = outcome.applied;
        source = outcome.source;
        if (outcome.applied) {
          settings.value = outcome.settings;
          userData.value = outcome.data;
          markUserDataHydrated();
          // These are direct signal assignments, so the debounced writers have
          // nothing scheduled: the migrated state has to be written explicitly.
          await Promise.all([persistSettingsNow(), persistUserDataNow()]);
        }
      }
    }

    // Fill in whichever half is missing — and only that half, so a value that
    // already exists is never replaced.
    if (!migrated && dataMissing) {
      const fresh: UserData = {
        schema: 1,
        pins: [],
        recent: [],
        migration: {
          source: 'fresh',
          at: Date.now(),
          items: { pins: 0, recent: 0, foldered: 0 },
        },
      };
      replaceUserData(fresh);
      await flushUserData();
    }
    if (!migrated && settingsMissing) {
      settings.value = cloneDefaults();
      await persistSettingsNow();
    }

    markUserDataHydrated();
    markSettingsReady();

    const stopSettings = watchSettings();
    const stopUserData = watchUserData();

    return {
      migrated,
      source,
      legacyLeftInPlace,
      settings: settings.value,
      dispose: () => {
        stopSettings();
        stopUserData();
      },
    };
  })();
  return running;
}

/** Test seam: clears the single-flight cache. */
export function resetBootstrapForTests(): void {
  running = null;
}

export async function persistEverything(): Promise<void> {
  await Promise.all([flushSettings(), flushUserData()]);
}

/**
 * Flushes pending writes when the page goes away.
 *
 * Settings and user data are written on a short debounce to keep rapid changes
 * cheap. Without this hook, pinning a bookmark and closing the tab inside that
 * window would drop the write — the user would see their action silently undone.
 * `pagehide` covers navigation, reload and tab close; `visibilitychange` covers
 * the tab being backgrounded, which is the last reliable event on mobile.
 */
export function installPersistenceHooks(
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): () => void {
  if (!doc) return () => {};
  const flush = (): void => {
    void persistEverything();
  };
  const onVisibility = (): void => {
    if (doc.visibilityState === 'hidden') flush();
  };
  doc.defaultView?.addEventListener('pagehide', flush);
  doc.addEventListener('visibilitychange', onVisibility);
  return () => {
    doc.defaultView?.removeEventListener('pagehide', flush);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}

export async function readRawKeys(): Promise<Record<string, unknown>> {
  const [settingsRead, dataRead] = await Promise.all([
    readKey<unknown>('sync', SETTINGS_KEY),
    readKey<unknown>('local', DATA_KEY),
  ]);
  return { [SETTINGS_KEY]: settingsRead.value, [DATA_KEY]: dataRead.value };
}

export async function writeRawKey(key: string, value: unknown): Promise<void> {
  const area = key === SETTINGS_KEY ? 'sync' : 'local';
  await writeKey(area, key, value);
}
