import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outputDir = path.join(root, 'store-assets');
const tmpDir = path.join(root, '.tmp-store-assets');

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    const require = createRequire(`${globalRoot}/`);
    return require('playwright');
  }
}

function toJpeg(pngPath, jpgPath) {
  execFileSync('sips', ['-s', 'format', 'jpeg', pngPath, '--out', jpgPath], { stdio: 'ignore' });
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
    toJpeg(pngPath, path.join(outputDir, jpgName));
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
      background:
        radial-gradient(circle at 22% 18%, rgba(120, 184, 162, 0.2), transparent 32%),
        radial-gradient(circle at 76% 74%, rgba(214, 199, 161, 0.16), transparent 36%),
        linear-gradient(135deg, #101215 0%, #16191d 52%, #252b30 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
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
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
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
    toJpeg(pngPath, path.join(outputDir, jpgName));
  }
}

const { chromium } = await loadPlaywright();
await mkdir(outputDir, { recursive: true });
await rm(tmpDir, { recursive: true, force: true });
await mkdir(tmpDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

await screenshotPage(page, 'newtab.html', 1280, 800, 'newtab-screenshot-1280x800.png', 'newtab-screenshot-1280x800.jpg');
await screenshotPage(page, 'newtab.html', 1280, 720, 'newtab-screenshot.png', null);
toJpeg(path.join(outputDir, 'newtab-screenshot.png'), path.join(outputDir, 'newtab-screenshot.png'));

await screenshotPopup(page, 1280, 800, 'popup-screenshot-1280x800.png', 'popup-screenshot-1280x800.jpg');
await screenshotPopup(page, 1280, 720, 'popup-screenshot.png', null);
toJpeg(path.join(outputDir, 'popup-screenshot.png'), path.join(outputDir, 'popup-screenshot.png'));
await screenshotPage(page, 'newtab.html', 440, 280, 'small-promo-440x280.png', 'small-promo-440x280.jpg');
await rm(path.join(outputDir, 'small-promo-440x280.png'), { force: true });

await browser.close();
await rm(tmpDir, { recursive: true, force: true });

console.log('Store screenshots updated in store-assets/.');
