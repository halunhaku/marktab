import { existsSync } from 'node:fs';
import { mkdir, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

/**
 * Captures the store screenshots for MarkTab 3.
 *
 * Everything is taken from the real unpacked build in `dist/extension`, in a
 * throwaway profile seeded with a representative library, at exactly 1280×800
 * (the size Chrome Web Store and Edge Add-ons ask for) plus the 440×280 promo
 * tile. Each shot is written as PNG (store upload) and JPEG (listing page).
 *
 * Usage: `npm run build && npm run screenshots`
 */

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionDir = path.join(root, 'dist', 'extension');
const outputDir = path.join(root, 'store-assets');
const SETTINGS_KEY = 'marktab:settings:v3';
const DATA_KEY = 'marktab:data:v3';

const VIEWPORT = { width: 1280, height: 800 };
const PROMO = { width: 440, height: 280 };

/** A library that reads like a real one: four folders, no placeholder names. */
const LIBRARY = {
  Design: [
    ['Linear – Plan and build products', 'https://linear.app/'],
    ['Raycast', 'https://www.raycast.com/'],
    ['Figma', 'https://www.figma.com/'],
    ['Mobbin – Mobile design patterns', 'https://mobbin.com/'],
  ],
  Development: [
    ['GitHub', 'https://github.com/'],
    ['MDN Web Docs', 'https://developer.mozilla.org/'],
    ['Vite', 'https://vite.dev/'],
    ['Preact', 'https://preactjs.com/'],
    ['Chrome Extensions', 'https://developer.chrome.com/docs/extensions'],
    ['caniuse', 'https://caniuse.com/'],
  ],
  Reading: [
    ['Hacker News', 'https://news.ycombinator.com/'],
    ['Lobsters', 'https://lobste.rs/'],
    ['Stratechery', 'https://stratechery.com/'],
  ],
  Tools: [
    ['Excalidraw', 'https://excalidraw.com/'],
    ['Squoosh', 'https://squoosh.app/'],
    ['Ray.so', 'https://ray.so/'],
  ],
};

const PINS = [
  ['GitHub', 'https://github.com/'],
  ['Linear – Plan and build products', 'https://linear.app/'],
  ['Hacker News', 'https://news.ycombinator.com/'],
  ['MDN Web Docs', 'https://developer.mozilla.org/'],
];

const RECENT = [
  ['Vite', 'https://vite.dev/'],
  ['MDN Web Docs', 'https://developer.mozilla.org/'],
  ['Raycast', 'https://www.raycast.com/'],
  ['Excalidraw', 'https://excalidraw.com/'],
  ['Squoosh', 'https://squoosh.app/'],
  ['Figma', 'https://www.figma.com/'],
];

/* ---- preflight --------------------------------------------------------- */

const build = await readdir(extensionDir).catch(() => null);
if (!build?.includes('manifest.json')) {
  console.error('dist/extension is missing. Run `npm run build` before capturing screenshots.');
  process.exit(1);
}

let playwright;
try {
  playwright = require('@playwright/test');
} catch {
  console.error('@playwright/test is not installed. Run `npm install` first.');
  process.exit(1);
}

if (!existsSync(playwright.chromium.executablePath())) {
  console.error('Chromium is not installed. Run `npx playwright install chromium` first.');
  process.exit(1);
}

/* ---- capture ----------------------------------------------------------- */

const profileDir = path.join(os.tmpdir(), `marktab-store-${Date.now()}`);
await mkdir(outputDir, { recursive: true });

const context = await playwright.chromium.launchPersistentContext(profileDir, {
  channel: process.env.MARKTAB_E2E_CHANNEL ?? 'chromium',
  // `--lang` sets the browser UI language, which is what Chrome names its own
  // root bookmark folders after (`locale` only affects the page).
  args: [
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    '--lang=en-US',
  ],
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  colorScheme: 'light',
});

const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const extensionId = new URL(worker.url()).host;

await worker.evaluate(
  async ({ library, pins, recent, settingsKey, dataKey }) => {
    const tree = await chrome.bookmarks.getTree();
    const bar = tree[0]?.children?.[0];
    if (!bar) throw new Error('no bookmarks bar in the fresh profile');
    for (const [folderTitle, items] of Object.entries(library)) {
      const folder = await chrome.bookmarks.create({ parentId: bar.id, title: folderTitle });
      for (const [title, url] of items) {
        await chrome.bookmarks.create({ parentId: folder.id, title, url });
      }
    }
    const now = Date.now();
    await chrome.storage.local.set({
      [dataKey]: {
        schema: 1,
        pins: pins.map(([title, url], order) => ({ url, title, addedAt: now - order * 60_000, order })),
        recent: recent.map(([title, url], index) => ({ url, title, ts: now - (index + 1) * 90_000 })),
      },
    });
    // Note for reviewers: the rail, breadcrumb and home folder row show the two
    // browser root folders with the names the browser gave them. Those names come
    // from the *browser's* UI locale (Chrome refuses to rename them), so on a
    // non-English machine they appear in that language inside otherwise English
    // screenshots.
    await chrome.storage.sync.set({
      [settingsKey]: { schema: 3, theme: 'system', language: 'en', density: 'comfortable', motion: 'system' },
    });
  },
  { library: LIBRARY, pins: PINS, recent: RECENT, settingsKey: SETTINGS_KEY, dataKey: DATA_KEY },
);

/** Best-effort: visits the seeded sites so Chrome caches their real favicons. */
async function warmFavicons() {
  const visitor = await context.newPage();
  let warmed = 0;
  for (const [, items] of Object.entries(LIBRARY)) {
    for (const [, url] of items) {
      try {
        // `domcontentloaded` (not `commit`): Chrome starts fetching the favicon
        // while the document loads, and that fetch is what fills its cache.
        await visitor.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await visitor.waitForTimeout(400);
        warmed += 1;
      } catch {
        /* offline or slow: the screenshot falls back to Chrome's default icon */
      }
    }
  }
  await visitor.close();
  console.log(`warmed ${warmed} favicon(s) from the network`);
}

async function setTheme(theme) {
  await worker.evaluate(
    async ({ key, value }) => {
      const current = (await chrome.storage.sync.get(key))[key] ?? {};
      await chrome.storage.sync.set({ [key]: { ...current, schema: 3, language: 'en', theme: value } });
    },
    { key: SETTINGS_KEY, value: theme },
  );
}

/** Opens an extension page with a settled library, whatever the previous shot did. */
async function openOn(page, target, viewport = VIEWPORT) {
  await page.setViewportSize(viewport);
  await page.goto(`chrome-extension://${extensionId}/${target}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#marktab-root main, #marktab-popup-root > *', { timeout: 15_000 });
  await page.waitForTimeout(600);
}

const written = new Set();

/** Drops the focus ring an automated click leaves on the first item of a group. */
async function blurActive(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}

async function shoot(page, name, { size = VIEWPORT, blur = true } = {}) {
  if (blur) await blurActive(page);
  const png = path.join(outputDir, `${name}.png`);
  const jpg = path.join(outputDir, `${name}.jpg`);
  await page.screenshot({ path: png, clip: { x: 0, y: 0, ...size } });
  await page.screenshot({ path: jpg, type: 'jpeg', quality: 92, clip: { x: 0, y: 0, ...size } });
  written.add(path.basename(png));
  written.add(path.basename(jpg));
  console.log(`captured ${name} (${size.width}×${size.height})`);
}

/** Capture surface by surface, light first, then the same surface in dark. */
async function captureTheme(theme) {
  const suffix = theme === 'dark' ? 'dark' : 'screenshot';
  await setTheme(theme);
  // A fresh page per theme: the previous one is closed when its pass finishes.
  const page = await context.newPage();

  await openOn(page, 'newtab.html');
  await shoot(page, `newtab-${suffix}-1280x800`);

  // Command palette.
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(250);
  await page.keyboard.type('raycast');
  await page.waitForTimeout(450);
  await shoot(page, `palette-${suffix}-1280x800`, { blur: false });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // Folder view, opened from the rail the way a user would.
  await page.getByRole('complementary').getByRole('button', { name: 'Development' }).click();
  await page.waitForTimeout(450);
  await shoot(page, `folder-${suffix}-1280x800`);

  if (theme === 'light') {
    await page.getByRole('complementary').getByRole('button', { name: 'Pinned' }).click();
    await page.waitForTimeout(400);
    await shoot(page, 'pinned-1280x800');

    await page.getByRole('complementary').getByRole('button', { name: 'Recent' }).click();
    await page.waitForTimeout(400);
    await shoot(page, 'recent-1280x800');

    await page.keyboard.press('Meta+,');
    await page.waitForTimeout(500);
    await shoot(page, 'settings-1280x800');
  }
  await page.close();
}

await warmFavicons();

await captureTheme('light');
await captureTheme('dark');

/* ---- popup, composed on the 1280×800 canvas ---------------------------- */

// Captured at its natural size and composed onto the store canvas.
//
// The panel reads the *active* tab to offer "bookmark this page", and that state
// belongs to a real toolbar invocation: `activeTab` is granted by the browser and
// a page loaded as a tab cannot stand in for it. The screenshot therefore shows
// the panel's honest fallback ("this page cannot be bookmarked") rather than a
// state a reviewer could not reproduce.
const popupPage = await context.newPage();
await setTheme('light');
await popupPage.setViewportSize({ width: 400, height: 620 });
await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'domcontentloaded' });
await popupPage.waitForSelector('#marktab-popup-root > *');
await popupPage.waitForTimeout(400);

const panel = await popupPage.evaluate(() => {
  const rect = document.getElementById('marktab-popup-root')?.firstElementChild?.getBoundingClientRect();
  return { width: Math.ceil(rect?.width ?? 360), height: Math.ceil(rect?.height ?? 400) };
});
// Re-lay the panel out at exactly its own size: no dead space in the asset.
await popupPage.setViewportSize(panel);
await popupPage.waitForTimeout(300);

const popupShot = await popupPage.screenshot({ type: 'png' });
await popupPage.close();

const composed = await context.newPage();
await composed.setViewportSize(VIEWPORT);
await composed.setContent(
  `<body style="margin:0;height:800px;display:grid;place-items:center;background:#f5f6f9;font-family:ui-sans-serif">
     <img alt="" src="data:image/png;base64,${popupShot.toString('base64')}"
          style="border-radius:18px;box-shadow:0 24px 48px -22px rgb(19 26 45 / 34%);border:1px solid #e3e6ee" />
   </body>`,
);
await composed.waitForTimeout(300);
await shoot(composed, 'popup-screenshot-1280x800');
await composed.close();

/* ---- 440×280 promo tile ------------------------------------------------ */

// The small tile is a marketing image, not a screenshot: a legible wordmark on
// the product's own ambient background, drawn from the same tokens the app uses
// (`src/ui/styles/tokens.css`). Nothing here is a fabricated interface.
const promo = await context.newPage();
await promo.setViewportSize(PROMO);
await promo.setContent(`<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 440px; height: 280px; display: grid; place-items: center;
    font-family: ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif;
    background:
      radial-gradient(28rem 18rem at 8% -12%, rgb(91 108 255 / 6%), transparent 62%),
      radial-gradient(24rem 16rem at 106% 6%, rgb(91 108 255 / 6%), transparent 60%),
      linear-gradient(178deg, #f5f6f9 0%, #eceef3 100%);
    color: #14161b;
  }
  .stack { display: grid; justify-items: center; gap: 14px; text-align: center; padding: 0 28px; }
  .mark {
    width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: linear-gradient(150deg, #5b6cff, #4150e4);
    box-shadow: 0 6px 16px rgb(91 108 255 / 26%);
  }
  .mark span {
    width: 18px; height: 18px; border-radius: 5px;
    border: 2.6px solid #fff; border-block-end-color: transparent; border-inline-end-color: transparent;
    transform: rotate(45deg) translate(1.5px, -1.5px);
  }
  h1 { font-size: 34px; letter-spacing: -0.02em; font-weight: 600; }
  p { font-size: 14px; line-height: 1.45; color: #5a6172; max-width: 330px; }
  em { font-style: normal; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #14161b; }
</style></head>
<body>
  <div class="stack">
    <div class="mark"><span></span></div>
    <h1>MarkTab</h1>
    <p>Your bookmarks on every new tab. Search everything with <em>⌘K</em> — private, local, instant.</p>
  </div>
</body></html>`);
await promo.waitForTimeout(250);
await shoot(promo, 'small-promo-440x280', { size: PROMO });
await promo.close();

await context.close();
await rm(profileDir, { recursive: true, force: true });

/* ---- drop anything this run did not produce ---------------------------- */

for (const file of await readdir(outputDir)) {
  if (!/\.(png|jpg)$/i.test(file)) continue;
  if (written.has(file)) continue;
  await rm(path.join(outputDir, file), { force: true });
  console.log(`removed stale ${file}`);
}

console.log(`\n${written.size} files written to store-assets/.`);
