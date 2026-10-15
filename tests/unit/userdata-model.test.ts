import { describe, expect, it } from 'vitest';
import {
  EMPTY_USER_DATA,
  addPin,
  clearRecent,
  emptyUserData,
  frecencyWeights,
  movePin,
  normalizeUserData,
  recordVisit,
  reindexPins,
  removePin,
  removeRecent,
  setPinTitle,
  togglePin,
  type PinRecord,
  type RecentRecord,
  type UserData,
} from '@/core/userdata/model';
import { DATA_SCHEMA, RECENT_CAP } from '@/core/settings/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function pin(url: string, order = 0, addedAt = 0, title = ''): PinRecord {
  return { url, title, addedAt, order };
}

function recent(url: string, ts: number, title = ''): RecentRecord {
  return { url, title, ts };
}

function urls(records: readonly { url: string }[]): string[] {
  return records.map((record) => record.url);
}

function expectDense(pins: readonly PinRecord[]): void {
  expect(pins.map((item) => item.order)).toEqual(pins.map((_, index) => index));
}

function snapshot(data: UserData): string {
  return JSON.stringify(data);
}

describe('emptyUserData', () => {
  it('hands out a fresh object with fresh arrays every time', () => {
    const first = emptyUserData();
    const second = emptyUserData();

    expect(first).toEqual(EMPTY_USER_DATA);
    expect(second).toEqual(EMPTY_USER_DATA);
    expect(first).not.toBe(second);
    expect(first.pins).not.toBe(second.pins);
    expect(first.recent).not.toBe(second.recent);

    first.pins.push(pin('https://mutated/'));
    expect(second.pins).toEqual([]);
    expect(EMPTY_USER_DATA.pins).toEqual([]);
    expect(first.schema).toBe(DATA_SCHEMA);
  });
});

describe('reindexPins', () => {
  it('reuses the records that are already dense', () => {
    const pins = [pin('a', 0), pin('b', 1)];
    const reindexed = reindexPins(pins);

    expect(reindexed).toEqual(pins);
    expect(reindexed[0]).toBe(pins[0]);
    expect(reindexed[1]).toBe(pins[1]);
  });

  it('repacks gapped or duplicated orders', () => {
    const reindexed = reindexPins([pin('a', 3), pin('b', 3), pin('c', -1)]);

    expect(reindexed.map((item) => item.order)).toEqual([0, 1, 2]);
    expect(urls(reindexed)).toEqual(['a', 'b', 'c']);
  });

  it('accepts an empty list', () => {
    expect(reindexPins([])).toEqual([]);
  });
});

describe('addPin', () => {
  it('appends a new pin with the next dense order and the given timestamp', () => {
    const start = emptyUserData();
    const before = snapshot(start);

    const result = addPin(start, { url: 'https://a/', title: 'A', now: 100 });

    expect(result.changed).toBe(true);
    expect(result.data).not.toBe(start);
    expect(result.data.pins).toEqual([{ url: 'https://a/', title: 'A', addedAt: 100, order: 0 }]);
    expect(snapshot(start)).toBe(before);
  });

  it('keeps the orders dense as pins accumulate', () => {
    let data = emptyUserData();
    for (const url of ['https://a/', 'https://b/', 'https://c/']) {
      data = addPin(data, { url, title: url }, ).data;
    }

    expect(urls(data.pins)).toEqual(['https://a/', 'https://b/', 'https://c/']);
    expectDense(data.pins);
  });

  it('ignores an empty url', () => {
    const data = emptyUserData();
    const result = addPin(data, { url: '', title: 'A' });

    expect(result.changed).toBe(false);
    expect(result.data).toBe(data);
  });

  it('is a no-op when the url is already pinned with the same title', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('https://a/', 0, 5, 'A')] };
    const result = addPin(data, { url: 'https://a/', title: 'A', now: 999 });

    expect(result.changed).toBe(false);
    expect(result.data).toBe(data);
  });

  it('updates the title instead of duplicating an existing pin', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('https://a/', 0, 5, '')] };
    const result = addPin(data, { url: 'https://a/', title: 'Real title', now: 999 });

    expect(result.changed).toBe(true);
    expect(result.data.pins).toEqual([{ url: 'https://a/', title: 'Real title', addedAt: 5, order: 0 }]);
  });

  it('re-densifies a payload that arrived with gaps', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('https://a/', 0, 1), pin('https://b/', 5, 2)],
    };

    const result = addPin(data, { url: 'https://c/', title: 'C' });

    expect(urls(result.data.pins)).toEqual(['https://a/', 'https://b/', 'https://c/']);
    expectDense(result.data.pins);
  });

  it('defaults the timestamp to now', () => {
    const result = addPin(emptyUserData(), { url: 'https://a/', title: 'A' });

    expect(result.data.pins[0]?.addedAt).toBeGreaterThanOrEqual(NOW - 60_000);
    expect(result.data.pins[0]?.addedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('removePin', () => {
  it('removes the pin and repacks the remaining orders', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('https://a/', 0), pin('https://b/', 1), pin('https://c/', 2)],
    };
    const before = snapshot(data);

    const result = removePin(data, 'https://b/');

    expect(result.changed).toBe(true);
    expect(urls(result.data.pins)).toEqual(['https://a/', 'https://c/']);
    expectDense(result.data.pins);
    expect(snapshot(data)).toBe(before);
  });

  it('is a no-op for a url that is not pinned', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('https://a/', 0)] };
    const result = removePin(data, 'https://nope/');

    expect(result.changed).toBe(false);
    expect(result.data).toBe(data);
  });
});

describe('togglePin', () => {
  it('pins an unpinned url and unpins a pinned one', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('https://a/', 0), pin('https://b/', 1)],
    };

    const removed = togglePin(data, { url: 'https://a/', title: 'A' });
    expect(removed.pinned).toBe(false);
    expect(urls(removed.data.pins)).toEqual(['https://b/']);
    expectDense(removed.data.pins);

    const added = togglePin(removed.data, { url: 'https://c/', title: 'C', now: 7 });
    expect(added.pinned).toBe(true);
    expect(urls(added.data.pins)).toEqual(['https://b/', 'https://c/']);
    expectDense(added.data.pins);
    expect(added.data.pins[1]?.addedAt).toBe(7);
  });

  it('is a no-op for an empty url', () => {
    const data = emptyUserData();
    const result = togglePin(data, { url: '', title: '' });

    expect(result.data).toBe(data);
    expect(result.data.pins).toEqual([]);
  });
});

describe('movePin', () => {
  it('moves a pin forward and backwards while keeping the orders dense', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('a', 0), pin('b', 1), pin('c', 2), pin('d', 3)],
    };

    const forward = movePin(data, 0, 2);
    expect(forward.changed).toBe(true);
    expect(urls(forward.data.pins)).toEqual(['b', 'c', 'a', 'd']);
    expectDense(forward.data.pins);

    const backward = movePin(forward.data, 3, 1);
    expect(urls(backward.data.pins)).toEqual(['b', 'd', 'c', 'a']);
    expectDense(backward.data.pins);
  });

  it('clamps a target beyond the end to the last slot', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('a', 0), pin('b', 1), pin('c', 2)] };

    const result = movePin(data, 0, 99);

    expect(urls(result.data.pins)).toEqual(['b', 'c', 'a']);
    expectDense(result.data.pins);
  });

  it('clamps a negative target to the first slot', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('a', 0), pin('b', 1), pin('c', 2)] };

    const result = movePin(data, 2, -4);

    expect(urls(result.data.pins)).toEqual(['c', 'a', 'b']);
    expectDense(result.data.pins);
  });

  it('reports no change for identity moves and out-of-range sources', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('a', 0), pin('b', 1), pin('c', 2)] };

    for (const [from, to] of [
      [1, 1],
      [0, 0],
      [-1, 0],
      [3, 0],
      [99, 1],
    ] as const) {
      const result = movePin(data, from, to);
      expect(result.changed).toBe(false);
      expect(result.data).toBe(data);
    }
  });

  it('never moves a list with fewer than two pins', () => {
    const empty = emptyUserData();
    expect(movePin(empty, 0, 1).changed).toBe(false);

    const single: UserData = { ...emptyUserData(), pins: [pin('a', 0)] };
    const result = movePin(single, 0, 0);
    expect(result.changed).toBe(false);
    expect(result.data).toBe(single);
  });
});

describe('setPinTitle', () => {
  it('replaces the title of the matching pin only', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('a', 0, 1, 'A'), pin('b', 1, 2, 'B')],
    };
    const before = snapshot(data);

    const result = setPinTitle(data, 'a', 'A!');

    expect(result.changed).toBe(true);
    expect(result.data.pins).toEqual([
      { url: 'a', title: 'A!', addedAt: 1, order: 0 },
      { url: 'b', title: 'B', addedAt: 2, order: 1 },
    ]);
    expect(snapshot(data)).toBe(before);
  });

  it('reports no change for the same title or an unknown url', () => {
    const data: UserData = { ...emptyUserData(), pins: [pin('a', 0, 1, 'A')] };

    expect(setPinTitle(data, 'a', 'A')).toEqual({ data, changed: false });
    expect(setPinTitle(data, 'nope', 'X')).toEqual({ data, changed: false });
  });
});

describe('recordVisit', () => {
  it('prepends a first visit and stamps it with the given time', () => {
    const data = emptyUserData();
    const before = snapshot(data);

    const result = recordVisit(data, { url: 'https://a/', title: 'A', now: 10 });

    expect(result.changed).toBe(true);
    expect(result.data.recent).toEqual([{ url: 'https://a/', title: 'A', ts: 10 }]);
    expect(snapshot(data)).toBe(before);
  });

  it('keeps the newest visit first', () => {
    let data = emptyUserData();
    data = recordVisit(data, { url: 'https://a/', title: 'A', now: 1 }).data;
    data = recordVisit(data, { url: 'https://b/', title: 'B', now: 2 }).data;
    data = recordVisit(data, { url: 'https://c/', title: 'C', now: 3 }).data;

    expect(urls(data.recent)).toEqual(['https://c/', 'https://b/', 'https://a/']);
  });

  it('moves a repeated visit to the front and refreshes its title and timestamp', () => {
    const data: UserData = {
      ...emptyUserData(),
      recent: [recent('https://a/', 1, 'Old'), recent('https://b/', 2, 'B')],
    };

    const result = recordVisit(data, { url: 'https://a/', title: 'New', now: 9 });

    expect(result.data.recent).toEqual([
      { url: 'https://a/', title: 'New', ts: 9 },
      { url: 'https://b/', title: 'B', ts: 2 },
    ]);
  });

  it('caps the history at RECENT_CAP and drops the oldest entry', () => {
    // The history is newest-first, so the tail is the oldest entry.
    const data: UserData = {
      ...emptyUserData(),
      recent: Array.from({ length: RECENT_CAP }, (_, index) =>
        recent(`https://old-${index}/`, RECENT_CAP - index),
      ),
    };

    const result = recordVisit(data, { url: 'https://newest/', title: 'N', now: 10_000 });

    expect(result.data.recent).toHaveLength(RECENT_CAP);
    expect(result.data.recent[0]?.url).toBe('https://newest/');
    expect(result.data.recent[1]?.url).toBe('https://old-0/');
    expect(result.data.recent[RECENT_CAP - 1]?.url).toBe(`https://old-${RECENT_CAP - 2}/`);
    expect(urls(result.data.recent)).not.toContain(`https://old-${RECENT_CAP - 1}/`);
  });

  it('ignores an empty url', () => {
    const data = emptyUserData();
    const result = recordVisit(data, { url: '', title: 'A' });

    expect(result.changed).toBe(false);
    expect(result.data).toBe(data);
  });

  it('defaults the timestamp to now', () => {
    const started = Date.now();
    const result = recordVisit(emptyUserData(), { url: 'https://a/', title: 'A' });

    expect(result.data.recent[0]?.ts).toBeGreaterThanOrEqual(started);
  });
});

describe('clearRecent and removeRecent', () => {
  it('drops the whole history', () => {
    const data: UserData = { ...emptyUserData(), recent: [recent('https://a/', 1)] };

    const result = clearRecent(data);

    expect(result.changed).toBe(true);
    expect(result.data.recent).toEqual([]);
    expect(result.data.pins).toEqual(data.pins);
  });

  it('reports no change when the history is already empty', () => {
    const data = emptyUserData();
    expect(clearRecent(data)).toEqual({ data, changed: false });
  });

  it('forgets a single url and reports no change for an unknown one', () => {
    const data: UserData = {
      ...emptyUserData(),
      recent: [recent('https://a/', 2), recent('https://b/', 1)],
    };

    const removed = removeRecent(data, 'https://a/');
    expect(removed.changed).toBe(true);
    expect(urls(removed.data.recent)).toEqual(['https://b/']);

    expect(removeRecent(data, 'https://nope/')).toEqual({ data, changed: false });
  });
});

describe('pin and history mutations together', () => {
  it('keeps the pin order dense after every mutation in a sequence', () => {
    let data = emptyUserData();
    for (const url of ['a', 'b', 'c', 'd', 'e']) data = addPin(data, { url, title: url.toUpperCase() }).data;
    expectDense(data.pins);

    data = movePin(data, 4, 0).data;
    expect(urls(data.pins)).toEqual(['e', 'a', 'b', 'c', 'd']);
    expectDense(data.pins);

    data = movePin(data, 1, 3).data;
    expect(urls(data.pins)).toEqual(['e', 'b', 'c', 'a', 'd']);
    expectDense(data.pins);

    data = togglePin(data, { url: 'c', title: 'C' }).data;
    expect(urls(data.pins)).toEqual(['e', 'b', 'a', 'd']);
    expectDense(data.pins);

    data = removePin(data, 'e').data;
    expect(urls(data.pins)).toEqual(['b', 'a', 'd']);
    expectDense(data.pins);

    data = setPinTitle(data, 'b', 'B!').data;
    expect(urls(data.pins)).toEqual(['b', 'a', 'd']);
    expectDense(data.pins);

    const firstOrders = data.pins.map((item) => item.order);
    expect(firstOrders).toEqual([0, 1, 2]);
  });
});

describe('frecencyWeights', () => {
  it('weights a pinned url above an unpinned one', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('https://pinned/', 0)],
      recent: [recent('https://visited/', NOW)],
    };

    const weights = frecencyWeights(data, NOW);

    expect(weights.get('https://pinned/')).toBe(120);
    expect(weights.get('https://visited/')).toBeCloseTo(70, 6);
    expect(weights.get('https://pinned/') as number).toBeGreaterThan(
      weights.get('https://visited/') as number,
    );
    expect(weights.has('https://unknown/')).toBe(false);
  });

  it('adds the pin bonus on top of the visit weight', () => {
    const data: UserData = {
      ...emptyUserData(),
      pins: [pin('https://both/', 0)],
      recent: [recent('https://both/', NOW)],
    };

    expect(frecencyWeights(data, NOW).get('https://both/')).toBeCloseTo(190, 6);
  });

  it('decays with age and never goes negative for a future visit', () => {
    const weight = (ts: number): number =>
      frecencyWeights({ ...emptyUserData(), recent: [recent('https://u/', ts)] }, NOW).get(
        'https://u/',
      ) as number;

    const fresh = weight(NOW);
    const oneWeek = weight(NOW - 7 * DAY_MS);
    const twoWeeks = weight(NOW - 14 * DAY_MS);
    const fourWeeks = weight(NOW - 28 * DAY_MS);

    expect(fresh).toBeCloseTo(70, 6);
    expect(fresh).toBeGreaterThan(oneWeek);
    expect(oneWeek).toBeGreaterThan(twoWeeks);
    expect(twoWeeks).toBeGreaterThan(fourWeeks);
    expect(twoWeeks).toBeCloseTo(70 / Math.E, 6);
    expect(fourWeeks).toBeGreaterThan(0);
    expect(weight(NOW + 5 * DAY_MS)).toBeCloseTo(70, 6);
  });

  it('accumulates repeated visits to the same url', () => {
    const data: UserData = {
      ...emptyUserData(),
      recent: [recent('https://u/', NOW), recent('https://u/', NOW - 1)],
    };

    expect(frecencyWeights(data, NOW).get('https://u/')).toBeGreaterThan(70);
    expect(frecencyWeights(data, NOW).get('https://u/')).toBeLessThan(140);
  });

  it('is empty for empty data', () => {
    expect(frecencyWeights(emptyUserData(), NOW).size).toBe(0);
  });
});

describe('normalizeUserData', () => {
  it('falls back to empty data for anything that is not a record', () => {
    for (const raw of [undefined, null, 42, 'userdata', true]) {
      expect(normalizeUserData(raw)).toEqual({ schema: DATA_SCHEMA, pins: [], recent: [] });
    }
    expect(normalizeUserData({})).toEqual({ schema: DATA_SCHEMA, pins: [], recent: [] });
    expect('migration' in normalizeUserData({})).toBe(false);
  });

  it('forces the schema version and ignores unusable collections', () => {
    const data = normalizeUserData({ schema: 99, pins: 'nope', recent: {} });

    expect(data.schema).toBe(DATA_SCHEMA);
    expect(data.pins).toEqual([]);
    expect(data.recent).toEqual([]);
  });

  it('drops pin entries without a usable url and fills the record fields', () => {
    const data = normalizeUserData({
      pins: [null, 'x', 7, { title: 'no url' }, { url: '' }, { url: 'ok', title: 5, addedAt: 'soon', order: null }],
    });

    expect(data.pins).toEqual([{ url: 'ok', title: '', addedAt: 0, order: 0 }]);
  });

  it('sorts the pins by order, then by addedAt', () => {
    const data = normalizeUserData({
      pins: [pin('c', 1, 30), pin('a', 0, 20), pin('b', 1, 10)],
    });

    expect(urls(data.pins)).toEqual(['a', 'b', 'c']);
  });

  it('de-duplicates pins by url and keeps the earliest known timestamp', () => {
    const data = normalizeUserData({
      pins: [pin('u', 0, 20), pin('u', 1, 30, 'Late'), pin('v', 2, 5, 'V')],
    });

    expect(data.pins).toEqual([
      { url: 'u', title: 'Late', addedAt: 20, order: 0 },
      { url: 'v', title: 'V', addedAt: 5, order: 2 },
    ]);
  });

  it('treats addedAt 0 as unknown and takes the first real timestamp', () => {
    const data = normalizeUserData({ pins: [pin('u', 0, 0), pin('u', 1, 50)] });

    expect(data.pins).toEqual([{ url: 'u', title: '', addedAt: 50, order: 0 }]);
  });

  it('leaves orders non-dense for a gapped payload, and reparks them on the next mutation', () => {
    const data = normalizeUserData({ pins: [pin('u', 0, 20), pin('v', 2, 5, 'V')] });

    expect(data.pins.map((item) => item.order)).toEqual([0, 2]);

    const added = addPin(data, { url: 'https://w/', title: 'W' });
    expectDense(added.data.pins);
    expect(urls(added.data.pins)).toEqual(['u', 'v', 'https://w/']);
  });

  it('keeps the newest record per url in the history', () => {
    const data = normalizeUserData({
      recent: [recent('u', 5, 'new'), recent('u', 3, 'mid'), recent('v', 9)],
    });

    expect(data.recent).toEqual([
      { url: 'v', title: '', ts: 9 },
      { url: 'u', title: 'new', ts: 5 },
    ]);
  });

  it('drops unusable history entries, sorts newest first and caps the list', () => {
    const dropped = normalizeUserData({
      recent: [null, 'x', { title: 'no url' }, { url: 'a', ts: 'soon' }],
    });
    expect(dropped.recent).toEqual([{ url: 'a', title: '', ts: 0 }]);

    const extras = 40;
    const many = Array.from({ length: RECENT_CAP + extras }, (_, index) => recent(`https://r${index}/`, index));
    const capped = normalizeUserData({ recent: many });

    expect(capped.recent).toHaveLength(RECENT_CAP);
    // The newest RECENT_CAP entries survive, oldest first among them last.
    expect(capped.recent[0]?.url).toBe(`https://r${RECENT_CAP + extras - 1}/`);
    expect(capped.recent[0]?.ts).toBe(RECENT_CAP + extras - 1);
    expect(capped.recent[RECENT_CAP - 1]?.url).toBe(`https://r${extras}/`);
    expect(urls(capped.recent)).not.toContain(`https://r${extras - 1}/`);
  });

  it('keeps a well-formed migration marker and drops a malformed one', () => {
    expect(
      normalizeUserData({
        migration: { source: 'legacy:markTabSettings', at: 42, items: { pins: '3', recent: null, foldered: undefined } },
      }).migration,
    ).toEqual({
      source: 'legacy:markTabSettings',
      at: 42,
      items: { pins: 3, recent: 0, foldered: 0 },
    });

    expect(normalizeUserData({ migration: { source: 'x' } }).migration).toEqual({
      source: 'x',
      at: 0,
      items: { pins: 0, recent: 0, foldered: 0 },
    });

    expect(normalizeUserData({ migration: { source: 'x', items: 'nope' } }).migration?.items).toEqual({
      pins: 0,
      recent: 0,
      foldered: 0,
    });

    expect(normalizeUserData({ migration: { source: 7 } }).migration).toBeUndefined();
    expect(normalizeUserData({ migration: 'fresh' }).migration).toBeUndefined();
  });

  it('is idempotent', () => {
    const messy = {
      schema: 3,
      pins: [pin('u', 2, 0), pin('u', 0, 50, 'T'), { url: '' }, pin('v', 1, 4)],
      recent: [recent('u', 1), recent('u', 9, 'U'), { url: '' }],
      migration: { source: 'legacy:v2', at: 5 },
    };
    const once = normalizeUserData(messy);

    expect(normalizeUserData(once)).toEqual(once);
    expect(normalizeUserData(normalizeUserData(once))).toEqual(once);
  });
});
