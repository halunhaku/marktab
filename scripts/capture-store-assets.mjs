import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

/**
 * Captures the store screenshots for MarkTab 3.
 *
 * Everything is taken from the real unpacked build in `dist/extension`, in a
 * throwaway profile seeded with a representative library, at exactly 1280×800
 * (the size the Chrome Web Store asks for) plus the 440×280 promo
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

/* ---- paper tokens, read from the built stylesheet ---------------------- */

/**
 * The popup canvas and the promo tile are drawn rather than screenshotted, so
 * their values must not come from a second, hand-written palette: the previous
 * template kept the retired blue, its gradients and its drop shadow alive long
 * after the product stopped using them. Every colour, font and radius below is
 * read from the built CSS — `src/ui/styles/tokens.css` as shipped — and a token
 * that is missing from the build is a hard failure, never a silent default.
 */
async function readPaperTokens() {
  const assetsDir = path.join(extensionDir, 'assets');
  const files = (await readdir(assetsDir)).filter((file) => file.endsWith('.css'));
  if (files.length === 0) throw new Error('the build ships no stylesheet; run `npm run build` first.');
  const css = (await Promise.all(files.map((file) => readFile(path.join(assetsDir, file), 'utf8')))).join('\n');

  const maps = { light: new Map(), dark: new Map() };
  // Flat `selector { declarations }` pairs: minified output has no nesting here.
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const part of selector.split(',')) {
      const map = /^\s*:root\s*$/.test(part)
        ? maps.light
        : /\[data-theme=['"]?dark['"]?\]/.test(part)
          ? maps.dark
          : null;
      if (!map) continue;
      for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) map.set(name, value.trim());
    }
  }

  // The drawings live on a blank page, not inside the extension: the app's
  // `:root` does not apply there, so `var(--accent-solid)` would resolve to
  // nothing. Follow the aliases to their final value here instead.
  const resolve = (name, theme, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`token ${name} refers to itself.`);
    seen.add(name);
    const raw = maps[theme].get(name);
    if (raw === undefined) throw new Error(`token ${name} is missing from the built stylesheet (${theme}).`);
    return raw.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, ref) => resolve(ref, theme, seen));
  };

  return (name, theme = 'light') => {
    const value = resolve(name, theme);
    if (value.includes('var(')) throw new Error(`token ${name} still references an unresolved variable: ${value}`);
    return value;
  };
}

const paperToken = await readPaperTokens();

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

// The canvas is paper, the sheet is separated by a hairline and nothing lifts:
// the product has no elevation shadow, so the asset must not invent one.
const composed = await context.newPage();
await composed.setViewportSize(VIEWPORT);
await composed.setContent(
  `<body style="margin:0;height:800px;display:grid;place-items:center;background:${paperToken('--canvas')};font-family:${paperToken('--font-sans')}">
     <img alt="" src="data:image/png;base64,${popupShot.toString('base64')}"
          style="display:block;border:1px solid ${paperToken('--border-1')};border-radius:${paperToken('--radius-xl')}" />
   </body>`,
);
await composed.waitForTimeout(300);
await shoot(composed, 'popup-screenshot-1280x800');
await composed.close();

/* ---- 440×280 promo tile ------------------------------------------------ */

// The small tile is a marketing image, not a screenshot: a legible wordmark on
// the product's own paper, drawn from the tokens the build ships
// (`src/ui/styles/tokens.css`). No gradient, no shadow, no blur — the paper
// language is one ochre accent on a warm sheet, and the wordmark is set in the
// serif the product reserves for a page's own title. Nothing here is a
// fabricated interface.
const promo = await context.newPage();
await promo.setViewportSize(PROMO);
await promo.setContent(`<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 440px; height: 280px; display: grid; place-items: center;
    font-family: ${paperToken('--font-sans')};
    background: ${paperToken('--canvas')};
    color: ${paperToken('--text-1')};
  }
  .stack {
    display: grid; justify-items: center; gap: ${paperToken('--space-3')};
    padding-inline: ${paperToken('--space-6')}; text-align: center;
  }
  .mark {
    display: grid; place-items: center;
    width: 42px; height: 42px;
    border-radius: ${paperToken('--radius-sm')};
    background: ${paperToken('--accent-solid')};
  }
  .mark span {
    width: 16px; height: 16px; border-radius: 1px;
    border: 2.4px solid ${paperToken('--on-accent')};
    border-block-end-color: transparent; border-inline-end-color: transparent;
    transform: rotate(45deg) translate(1.4px, -1.4px);
  }
  h1 {
    font-family: ${paperToken('--font-heading')};
    font-size: ${paperToken('--text-3xl')};
    font-weight: ${paperToken('--weight-semibold')};
    letter-spacing: ${paperToken('--tracking-tighter')};
    line-height: ${paperToken('--leading-tight')};
  }
  p {
    max-width: 330px;
    font-size: ${paperToken('--text-sm')};
    line-height: ${paperToken('--leading-snug')};
    color: ${paperToken('--text-2')};
  }
  em {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding-inline: 5px;
    border: 1px solid ${paperToken('--border-1')};
    border-radius: ${paperToken('--radius-xs')};
    background: ${paperToken('--surface-2')};
    color: ${paperToken('--text-2')};
    font-style: normal;
    font-family: ${paperToken('--font-mono')};
    font-size: ${paperToken('--text-xs')};
    font-weight: ${paperToken('--weight-medium')};
    line-height: 1;
    vertical-align: -3px;
  }
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
