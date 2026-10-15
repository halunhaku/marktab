import { computed, signal } from '@preact/signals';
import { readKey, storageAvailable, subscribeToKey, writeKey } from '../platform/storage';
import {
  addPin,
  clearRecent,
  emptyUserData,
  frecencyWeights,
  movePin,
  normalizeUserData,
  recordVisit as recordVisitModel,
  removePin,
  removeRecent,
  setPinTitle,
  togglePin,
  type UserData,
} from './model';
import { DATA_KEY } from '../settings/types';
import { debounce } from '../util/timing';

export const userData = signal<UserData>(emptyUserData());
export const pins = computed(() => userData.value.pins);
export const recent = computed(() => userData.value.recent);
export const pinsByUrl = computed(() => {
  const map = new Map<string, true>();
  for (const pin of userData.value.pins) map.set(pin.url, true);
  return map;
});
export const recentByUrl = computed(() => {
  const map = new Map<string, true>();
  for (const item of userData.value.recent) map.set(item.url, true);
  return map;
});

let hydrated = false;

const persist = debounce((value: UserData): void => {
  void writeKey('local', DATA_KEY, value).then(reportWrite);
}, 120);

/** Set when the last local write failed, so the UI can say so instead of guessing. */
export const userDataWriteError = signal(false);

function reportWrite(ok: boolean): void {
  // Without a storage API there is nothing to persist *to*, which is not a
  // failure worth telling the user about (it is the unit-test/preview case).
  userDataWriteError.value = !ok && storageAvailable();
}

function commit(next: UserData, changed: boolean): void {
  if (!changed) return;
  userData.value = next;
  if (hydrated) persist(next);
}

export function isUserDataHydrated(): boolean {
  return hydrated;
}

export async function loadUserData(): Promise<UserData> {
  const { value } = await readKey<unknown>('local', DATA_KEY);
  const loaded = value === undefined ? emptyUserData() : normalizeUserData(value);
  userData.value = loaded;
  return loaded;
}

export function markUserDataHydrated(): void {
  hydrated = true;
}

export async function flushUserData(): Promise<void> {
  persist.flush();
}

/** Immediate counterpart of `flushUserData` for direct signal assignments. */
export async function persistUserDataNow(): Promise<void> {
  persist.cancel();
  reportWrite(await writeKey('local', DATA_KEY, userData.value));
}

export function replaceUserData(next: UserData): void {
  userData.value = normalizeUserData(next);
  hydrated = true;
  persist(userData.value);
}

export function togglePinFor(url: string, title: string): boolean {
  const result = togglePin(userData.value, { url, title });
  commit(result.data, result.data !== userData.value);
  return result.pinned;
}

export function pinFor(url: string, title: string): void {
  const result = addPin(userData.value, { url, title });
  commit(result.data, result.changed);
}

export function unpinFor(url: string): void {
  const result = removePin(userData.value, url);
  commit(result.data, result.changed);
}

export function movePinnedTo(from: number, to: number): void {
  const result = movePin(userData.value, from, to);
  commit(result.data, result.changed);
}

export function refreshPinTitle(url: string, title: string): void {
  const result = setPinTitle(userData.value, url, title);
  commit(result.data, result.changed);
}

export function recordVisitFor(url: string, title: string): void {
  const result = recordVisitModel(userData.value, { url, title });
  commit(result.data, result.changed);
}

export function clearRecentHistory(): void {
  const result = clearRecent(userData.value);
  commit(result.data, result.changed);
}

export function forgetRecent(url: string): void {
  const result = removeRecent(userData.value, url);
  commit(result.data, result.changed);
}

export const searchWeights = computed(() => frecencyWeights(userData.value));

/** Mirrors data written by another tab. */
export function watchUserData(): () => void {
  return subscribeToKey(DATA_KEY, ({ area, newValue }) => {
    if (area !== 'local') return;
    persist.cancel();
    userData.value = normalizeUserData(newValue);
  });
}
