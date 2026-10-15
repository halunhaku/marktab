import { RECENT_CAP, DATA_SCHEMA } from '../settings/types';

export interface PinRecord {
  url: string;
  title: string;
  addedAt: number;
  /** Display order, ascending. */
  order: number;
}

export interface RecentRecord {
  url: string;
  title: string;
  ts: number;
}

export interface MigrationInfo {
  source: string;
  at: number;
  items: { pins: number; recent: number; foldered: number };
}

export interface UserData {
  schema: number;
  pins: PinRecord[];
  recent: RecentRecord[];
  migration?: MigrationInfo;
}

export const EMPTY_USER_DATA: UserData = { schema: DATA_SCHEMA, pins: [], recent: [] };

export function emptyUserData(): UserData {
  return { schema: DATA_SCHEMA, pins: [], recent: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePins(raw: unknown): PinRecord[] {
  if (!Array.isArray(raw)) return [];
  const byUrl = new Map<string, PinRecord>();
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const url = typeof item.url === 'string' ? item.url : '';
    if (!url) continue;
    const title = typeof item.title === 'string' ? item.title : '';
    const addedAt = typeof item.addedAt === 'number' && Number.isFinite(item.addedAt) ? item.addedAt : 0;
    const order = typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : 0;
    const existing = byUrl.get(url);
    if (existing) {
      existing.addedAt = Math.min(existing.addedAt || addedAt, addedAt || existing.addedAt);
      if (!existing.title && title) existing.title = title;
      continue;
    }
    byUrl.set(url, { url, title, addedAt, order });
  }
  return [...byUrl.values()].sort((a, b) => a.order - b.order || a.addedAt - b.addedAt);
}

function normalizeRecent(raw: unknown): RecentRecord[] {
  if (!Array.isArray(raw)) return [];
  const byUrl = new Map<string, RecentRecord>();
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const url = typeof item.url === 'string' ? item.url : '';
    if (!url) continue;
    const title = typeof item.title === 'string' ? item.title : '';
    const ts = typeof item.ts === 'number' && Number.isFinite(item.ts) ? item.ts : 0;
    const existing = byUrl.get(url);
    if (existing) {
      if (ts > existing.ts) {
        existing.ts = ts;
        if (title) existing.title = title;
      }
      continue;
    }
    byUrl.set(url, { url, title, ts });
  }
  return [...byUrl.values()].sort((a, b) => b.ts - a.ts).slice(0, RECENT_CAP);
}

export function normalizeUserData(raw: unknown): UserData {
  if (!isRecord(raw)) return emptyUserData();
  const migration = isRecord(raw.migration) && typeof raw.migration.source === 'string'
    ? {
        source: raw.migration.source,
        at: typeof raw.migration.at === 'number' ? raw.migration.at : 0,
        items:
          isRecord(raw.migration.items)
            ? {
                pins: Number(raw.migration.items.pins) || 0,
                recent: Number(raw.migration.items.recent) || 0,
                foldered: Number(raw.migration.items.foldered) || 0,
              }
            : { pins: 0, recent: 0, foldered: 0 },
      }
    : undefined;
  const data: UserData = {
    schema: DATA_SCHEMA,
    pins: normalizePins(raw.pins),
    recent: normalizeRecent(raw.recent),
  };
  if (migration) data.migration = migration;
  return data;
}

export function reindexPins(pins: readonly PinRecord[]): PinRecord[] {
  return pins.map((pin, index) => (pin.order === index ? pin : { ...pin, order: index }));
}

export function addPin(
  data: UserData,
  input: { url: string; title: string; now?: number },
): { data: UserData; changed: boolean } {
  const url = input.url;
  if (!url) return { data, changed: false };
  const existing = data.pins.find((pin) => pin.url === url);
  const now = input.now ?? Date.now();
  if (existing) {
    if (existing.title === input.title) return { data, changed: false };
    const pins = data.pins.map((pin) => (pin.url === url ? { ...pin, title: input.title } : pin));
    return { data: { ...data, pins }, changed: true };
  }
  const pins = reindexPins([
    ...data.pins,
    { url, title: input.title, addedAt: now, order: data.pins.length },
  ]);
  return { data: { ...data, pins }, changed: true };
}

export function removePin(data: UserData, url: string): { data: UserData; changed: boolean } {
  const pins = data.pins.filter((pin) => pin.url !== url);
  if (pins.length === data.pins.length) return { data, changed: false };
  return { data: { ...data, pins: reindexPins(pins) }, changed: true };
}

export function togglePin(
  data: UserData,
  input: { url: string; title: string; now?: number },
): { data: UserData; pinned: boolean } {
  if (data.pins.some((pin) => pin.url === input.url)) {
    const result = removePin(data, input.url);
    return { data: result.data, pinned: false };
  }
  const result = addPin(data, input);
  return { data: result.data, pinned: true };
}

export function movePin(data: UserData, from: number, to: number): { data: UserData; changed: boolean } {
  const total = data.pins.length;
  if (total < 2) return { data, changed: false };
  const target = Math.min(total - 1, Math.max(0, to));
  if (from === target || from < 0 || from >= total) return { data, changed: false };
  const pins = [...data.pins];
  const [moved] = pins.splice(from, 1);
  if (!moved) return { data, changed: false };
  pins.splice(target, 0, moved);
  return { data: { ...data, pins: reindexPins(pins) }, changed: true };
}

export function setPinTitle(
  data: UserData,
  url: string,
  title: string,
): { data: UserData; changed: boolean } {
  if (!data.pins.some((pin) => pin.url === url && pin.title !== title)) return { data, changed: false };
  const pins = data.pins.map((pin) => (pin.url === url ? { ...pin, title } : pin));
  return { data: { ...data, pins }, changed: true };
}

export function recordVisit(
  data: UserData,
  input: { url: string; title: string; now?: number },
): { data: UserData; changed: boolean } {
  const url = input.url;
  if (!url) return { data, changed: false };
  const now = input.now ?? Date.now();
  const rest = data.recent.filter((item) => item.url !== url);
  const recent = [{ url, title: input.title, ts: now }, ...rest].slice(0, RECENT_CAP);
  return { data: { ...data, recent }, changed: true };
}

export function clearRecent(data: UserData): { data: UserData; changed: boolean } {
  if (data.recent.length === 0) return { data, changed: false };
  return { data: { ...data, recent: [] }, changed: true };
}

export function removeRecent(data: UserData, url: string): { data: UserData; changed: boolean } {
  const recent = data.recent.filter((item) => item.url !== url);
  if (recent.length === data.recent.length) return { data, changed: false };
  return { data: { ...data, recent }, changed: true };
}

/** Combined lookup used to bias search ranking towards familiar URLs. */
export function frecencyWeights(data: UserData, now: number = Date.now()): Map<string, number> {
  const weights = new Map<string, number>();
  for (const recent of data.recent) {
    const age = Math.max(0, now - recent.ts);
    const recency = Math.exp(-age / (1000 * 60 * 60 * 24 * 14));
    weights.set(recent.url, (weights.get(recent.url) ?? 0) + recency * 70);
  }
  for (const pin of data.pins) {
    weights.set(pin.url, (weights.get(pin.url) ?? 0) + 120);
  }
  return weights;
}
