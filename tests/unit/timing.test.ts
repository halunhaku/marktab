import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce, throttle } from '@/core/util/timing';

const START = 1_000_000;

beforeEach(() => {
  // `now` is far enough from the throttle's initial `lastCall = 0` that the
  // first call is a leading-edge call, exactly like in a real page.
  vi.useFakeTimers({ now: START, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('debounce', () => {
  it('runs once with the last arguments after the quiet period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    expect(debounced.pending()).toBe(true);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
    expect(debounced.pending()).toBe(false);
  });

  it('restarts the quiet period on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    vi.advanceTimersByTime(80);
    debounced('b');
    vi.advanceTimersByTime(80);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('flush runs the pending call immediately and leaves no timer behind', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
    expect(debounced.pending()).toBe(false);

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush with nothing pending is a no-op', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced.flush();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel drops the pending call and its arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced.cancel();
    expect(debounced.pending()).toBe(false);

    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();

    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  it('calls immediately, then at most once per window with the newest arguments', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');

    throttled('second');
    throttled('third');
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(99);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('third');
  });

  it('starts a new window for the trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    throttled('second');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenLastCalledWith('second');

    throttled('third');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenLastCalledWith('third');
  });

  it('cancel drops the trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    throttled('second');
    throttled.cancel();
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('does not queue a second trailing call once the window has passed', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    vi.advanceTimersByTime(100);
    throttled('second');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });
});
