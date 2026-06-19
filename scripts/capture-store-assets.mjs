import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const root = process.cwd();
const outputDir = path.join(root, 'store-assets');
const readmeScreenshotDir = path.join(root, 'screenshots');
const tmpDir = path.join(root, '.tmp-store-assets');

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {}

  try {
    const globalRoot = process.platform === 'win32'
      ? execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm root -g'], { encoding: 'utf8' }).trim()
      : execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    const require = createRequire(path.join(globalRoot, 'noop.js'));
    return require('playwright');
  } catch {}

  const bundledRoot = path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'node_modules'
  );
  try {
    const require = createRequire(path.join(bundledRoot, 'noop.js'));
    return require('playwright');
  } catch {}

  try {
    const pnpmRoot = path.join(bundledRoot, '.pnpm');
    const entries = await readdir(pnpmRoot);
    const playwrightEntry = entries.find(entry => /^playwright@\d/.test(entry));
    if (playwrightEntry) {
      const packageRoot = path.join(pnpmRoot, playwrightEntry, 'node_modules', 'playwright');
      const require = createRequire(path.join(packageRoot, 'noop.js'));
      return require('playwright');
    }
  } catch {}

  throw new Error('Playwright is required. Install it locally or run inside a Codex desktop runtime with bundled Node modules.');
}

async function screenshotPage(page, file, width, height, pngName, jpgName) {
  await page.setViewportSize({ width, height });
  await page.goto(pathToFileURL(path.join(root, file)).href);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.home-search-card', { state: 'visible', timeout: 8000 });
  await page.waitForFunction(() => {
    const clock = document.querySelector('#homeClock');
    const pills = document.querySelectorAll('.folder-pill');
    return clock && clock.textContent !== '00:00' && pills.length > 0;
  }, { timeout: 10000 });
  await page.waitForTimeout(1000);
  const pngPath = path.join(outputDir, pngName);
  await page.screenshot({ path: pngPath, fullPage: false });
  if (jpgName) {
    await page.screenshot({ path: path.join(outputDir, jpgName), type: 'jpeg', quality: 92, fullPage: false });
  }
}

async function screenshotPopup(page, width, height, pngName, jpgName) {
  const popupUrl = pathToFileURL(path.join(root, 'popup.html')).href;
  const wrapperPath = path.join(tmpDir, `popup-${width}x${height}.html`);
  const wrapper = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarkTab Popup Preview</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #f6f8f3;
      font-family: "Geist", "Noto Sans SC", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
    }
    .stage {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
    }
    iframe {
      width: 320px;
      height: 440px;
      border: 0;
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(37, 58, 43, 0.12);
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="stage">
    <iframe src="${popupUrl}"></iframe>
  </div>
</body>
</html>`;
  await writeFile(wrapperPath, wrapper);
  await page.setViewportSize({ width, height });
  await page.goto(pathToFileURL(wrapperPath).href);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);
  const pngPath = path.join(outputDir, pngName);
  await page.screenshot({ path: pngPath, fullPage: false });
  if (jpgName) {
    await page.screenshot({ path: path.join(outputDir, jpgName), type: 'jpeg', quality: 92, fullPage: false });
  }
}

async function loadNewTabPreview(page, width = 1470, height = 712, deviceScaleFactor = 2) {
  await page.setViewportSize({ width, height });
  await page.goto(pathToFileURL(path.join(root, 'newtab.html')).href);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.home-search-card', { state: 'visible', timeout: 8000 });
  await page.waitForFunction(() => {
    const clock = document.querySelector('#homeClock');
    const pills = document.querySelectorAll('.folder-pill');
    return clock && clock.textContent !== '00:00' && pills.length > 0;
  }, { timeout: 10000 });
  await page.waitForTimeout(600);
}

async function screenshotReadmeAssets(browser) {
  await mkdir(readmeScreenshotDir, { recursive: true });

  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await loadNewTabPreview(page);
  await page.screenshot({ path: path.join(readmeScreenshotDir, 'home.png'), fullPage: false });
  await page.locator('#homePinnedGrid').screenshot({ path: path.join(readmeScreenshotDir, 'pinned.png') });
  await page.locator('#homeRecentGrid').screenshot({ path: path.join(readmeScreenshotDir, 'recent.png') });

  await page.locator('#homeSearchInput').click();
  await page.waitForSelector('#searchPanel', { state: 'visible', timeout: 8000 });
  await page.locator('#searchPanelInput').fill('git');
  await page.waitForTimeout(400);
  await page.locator('#searchPanel').screenshot({ path: path.join(readmeScreenshotDir, 'spotlight.png') });

  await loadNewTabPreview(page);
  await page.locator('.folder-pill').first().click();
  await page.waitForSelector('#folderView', { state: 'visible', timeout: 8000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(readmeScreenshotDir, 'folder.png'), fullPage: false });
  await page.close();

  const popupPage = await browser.newPage({ deviceScaleFactor: 2 });
  const popupUrl = pathToFileURL(path.join(root, 'popup.html')).href;
  await popupPage.setViewportSize({ width: 340, height: 363 });
  await popupPage.goto(popupUrl);
  await popupPage.waitForLoadState('domcontentloaded');
  await popupPage.waitForTimeout(600);
  await popupPage.screenshot({ path: path.join(readmeScreenshotDir, 'popup.png'), fullPage: false });
  await popupPage.close();
}

const { chromium } = await loadPlaywright();
await mkdir(outputDir, { recursive: true });
await rm(tmpDir, { recursive: true, force: true });
await mkdir(tmpDir, { recursive: true });

async function launchBrowser() {
  const attempts = [
    {},
    { channel: 'chrome' },
    { channel: 'msedge' }
  ];
  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch({ headless: true, ...options });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const browser = await launchBrowser();
const page = await browser.newPage({ deviceScaleFactor: 1 });

await screenshotPage(page, 'newtab.html', 1280, 800, 'newtab-screenshot-1280x800.png', 'newtab-screenshot-1280x800.jpg');
await screenshotPage(page, 'newtab.html', 1280, 720, 'newtab-screenshot.png', null);

await screenshotPopup(page, 1280, 800, 'popup-screenshot-1280x800.png', 'popup-screenshot-1280x800.jpg');
await screenshotPopup(page, 1280, 720, 'popup-screenshot.png', null);
await screenshotPage(page, 'newtab.html', 440, 280, 'small-promo-440x280.png', 'small-promo-440x280.jpg');
await rm(path.join(outputDir, 'small-promo-440x280.png'), { force: true });

await screenshotReadmeAssets(browser);

await browser.close();
await rm(tmpDir, { recursive: true, force: true });

console.log('Store screenshots updated in store-assets/.');
console.log('README screenshots updated in screenshots/.');
