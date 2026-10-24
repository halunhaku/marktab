import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Motion contract (ADR-024).
 *
 * A panel's exit fade is timed once, when it opens, and painted from a
 * non-interactive copy when it closes. That makes one sequence the tokens alone
 * cannot cover: a motion preference that changes while the panel is on screen.
 * The close has to consult the *current* preference, or it starts one last fade
 * with timing that no longer applies.
 *
 * The page records every Web Animation it starts, with its duration: 120 ms is an
 * overlay entering, 80 ms an overlay leaving. Sizes are exact so an unexpected
 * extra fade fails the test even when the visible result looks the same.
 */

declare global {
  interface Window {
    /** Durations of the Web Animations this page has started, filled by `recordFades`. */
    __fadeDurations?: number[];
  }
}

/** Records the Web Animations the page starts, so a fade cannot go unnoticed. */
async function recordFades(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__fadeDurations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ): Animation {
      const duration = typeof options === 'number' ? options : (options?.duration ?? 0);
      (window.__fadeDurations ??= []).push(Number(duration));
      return original.call(this, keyframes, options);
    };
  });
}

function fadeDurations(page: Page): Promise<number[]> {
  return page.evaluate(() => window.__fadeDurations ?? []);
}

/**
 * Waits inside the page for a fade to be recorded.
 *
 * The exit runs from an unmount effect, so it lands after the click resolves;
 * polling in the page is steadier than sleeping in the runner.
 */
async function waitForFades(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (expected) => (window.__fadeDurations ?? []).length >= expected,
    count,
    { timeout: 10_000 },
  );
}

test.describe('motion', () => {
  test('turning on reduced motion stops a panel that is already open from fading out', async ({
    newTab,
  }) => {
    const searchEntry = newTab.getByRole('button', { name: /Search bookmarks/ });
    const field = newTab.getByRole('combobox', { name: 'Search bookmarks' });
    const open = async (): Promise<void> => {
      await searchEntry.click();
      await expect(field).toBeVisible();
    };
    const closeWithPointer = async (): Promise<void> => {
      await newTab.mouse.click(6, 6);
      await expect(field).toHaveCount(0);
    };

    await expect(newTab.locator('#marktab-content')).toBeVisible();
    await recordFades(newTab);

    // Control: a normal pointer open fades in over 120 ms, and its close paints
    // the 80 ms exit copy.
    await open();
    await closeWithPointer();
    await waitForFades(newTab, 2);
    expect(await fadeDurations(newTab)).toEqual([120, 80]);

    // The case that regressed: the panel is already open when the OS preference
    // changes to reduced motion. Its exit timing was resolved before that, so the
    // close must check the current preference — and start no fade at all, in or
    // out, because every duration is zero by then.
    await open();
    await newTab.emulateMedia({ reducedMotion: 'reduce' });
    await expect(newTab.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await closeWithPointer();

    // Nothing new may be recorded: reduced motion turns both the enter fade and
    // the exit copy off, and the close must not reuse the timing cached earlier.
    await newTab.waitForTimeout(600);
    expect(await fadeDurations(newTab)).toEqual([120, 80, 120]);
    await expect(newTab.locator('body > [inert]')).toHaveCount(0);
  });
});
