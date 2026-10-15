import { signal } from '@preact/signals';
import {
  approximateSize,
  readKey,
  storageAvailable,
  subscribeToKey,
  writeKey,
} from '../platform/storage';
import { SETTINGS_KEY, SYNC_ITEM_BUDGET, cloneDefaults, type Settings } from './types';
import { normalizeSettings, settingsEqual } from './normalize';
import { debounce } from '../util/timing';

export type SettingsStatus = 'idle' | 'ready' | 'error';

export const settings = signal<Settings>(cloneDefaults());
export const settingsStatus = signal<SettingsStatus>('idle');
/** Set when a setting had to be trimmed to fit the `storage.sync` quota. */
export const settingsNotice = signal<string | null>(null);

export interface SettingsPatch {
  theme?: Settings['theme'];
  language?: Settings['language'];
  density?: Settings['density'];
  motion?: Settings['motion'];
  railCollapsed?: boolean;
  home?: Partial<Settings['home']>;
  folders?: Partial<Settings['folders']>;
  search?: Partial<Settings['search']>;
}

export function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  return normalizeSettings({
    ...current,
    ...patch,
    home: { ...current.home, ...patch.home },
    folders: { ...current.folders, ...patch.folders },
    search: { ...current.search, ...patch.search },
  });
}

/**
 * Keeps the synced payload inside the 8 KiB per-item quota.
 *
 * Only `folders.hiddenIds` can grow without bound, so it is the only field
 * trimmed; the caller is told through `settingsNotice`.
 */
export function pruneForSync(value: Settings): Settings {
  let candidate = value;
  if (approximateSize(candidate) <= SYNC_ITEM_BUDGET) return candidate;
  const hidden = [...candidate.folders.hiddenIds];
  while (hidden.length > 0 && approximateSize(candidate) > SYNC_ITEM_BUDGET) {
    hidden.splice(0, Math.max(1, Math.ceil(hidden.length / 8)));
    candidate = { ...candidate, folders: { ...candidate.folders, hiddenIds: hidden } };
  }
  candidate = { ...candidate, search: { ...candidate.search, customTemplate: '' } };
  return candidate;
}

const persist = debounce((value: Settings): void => {
  const { value: written, notice } = prepareForWrite(value);
  settingsNotice.value = notice;
  void writeKey('sync', SETTINGS_KEY, written).then(reportWrite);
}, 150);

/**
 * A `storage.sync` write can be rejected (write quota) or fail outright. Without
 * this the change would look saved and silently not be, so the failure becomes a
 * notice the settings surface renders.
 */
function reportWrite(ok: boolean): void {
  if (ok || !storageAvailable()) return;
  settingsNotice.value = 'sync-write-failed';
}

function prepareForWrite(value: Settings): { value: Settings; notice: string | null } {
  const pruned = pruneForSync(value);
  const trimmed = pruned.folders.hiddenIds.length !== value.folders.hiddenIds.length;
  return {
    value: pruned,
    notice: trimmed ? 'sync-quota-trimmed' : null,
  };
}

/** Applies settings locally; persistence is debounced. */
export function applySettings(next: Settings, options: { persist?: boolean } = {}): void {
  const normalized = normalizeSettings(next);
  if (settingsEqual(settings.value, normalized)) return;
  settings.value = normalized;
  if (options.persist !== false) persist(normalized);
}

export function updateSettings(patch: SettingsPatch): void {
  applySettings(mergeSettings(settings.value, patch));
}

export function resetSettingsToDefaults(): void {
  applySettings(cloneDefaults());
}

export async function flushSettings(): Promise<void> {
  persist.flush();
}

/**
 * Writes the current settings immediately, whether or not a debounce is pending.
 *
 * `flush()` only runs a *scheduled* write, so a caller that assigns
 * `settings.value` directly (the migration path in `bootstrapState`) would
 * otherwise never persist. Used where the write must land before the caller
 * continues, and kept separate from the pending-aware `flushSettings` so a
 * page-hide hook never writes when nothing changed — `storage.sync` has a write
 * quota and a new tab page closes often.
 */
export async function persistSettingsNow(): Promise<void> {
  persist.cancel();
  const { value: written, notice } = prepareForWrite(settings.value);
  settingsNotice.value = notice;
  reportWrite(await writeKey('sync', SETTINGS_KEY, written));
}

/** Loads settings; safe to call more than once (idempotent, last write wins). */
export async function loadSettingsFromStorage(): Promise<Settings> {
  const { value, error } = await readKey<unknown>('sync', SETTINGS_KEY);
  if (error && error !== 'storage-unavailable') settingsStatus.value = 'error';
  const loaded = value === undefined ? cloneDefaults() : normalizeSettings(value);
  settings.value = loaded;
  if (value !== undefined) settingsStatus.value = 'ready';
  return loaded;
}

/** Mirrors settings written by another tab or the popup. */
export function watchSettings(): () => void {
  return subscribeToKey(SETTINGS_KEY, ({ area, newValue }) => {
    if (area !== 'sync') return;
    const incoming = normalizeSettings(newValue);
    if (settingsEqual(settings.value, incoming)) return;
    persist.cancel();
    settings.value = incoming;
  });
}

export function markSettingsReady(): void {
  settingsStatus.value = 'ready';
}
