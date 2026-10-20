import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The Cloudflare landing page is not built or shipped with the extension (README: "a legacy
 * artefact"), so nothing else in this repository would notice when a screenshot it links to is
 * renamed or dropped by `npm run screenshots`. All seven preview images, including `og:image`,
 * pointed at a `screenshots/` folder that does not exist for months, and the only symptom was a
 * 404 on the live page. These checks fail here instead.
 */

const workerPath = fileURLToPath(new URL('../cloudflare/marktab-home-worker.js', import.meta.url));
const storeAssetsPath = fileURLToPath(new URL('../store-assets', import.meta.url));

const ASSETS_BLOCK = /const SCREENSHOT_ASSETS = (\{[\s\S]*?\});/;

async function readWorkerAssets() {
  const source = await readFile(workerPath, 'utf8');
  const block = source.match(ASSETS_BLOCK);
  assert.ok(block, 'marktab-home-worker.js must declare a `const SCREENSHOT_ASSETS = { … };` map.');
  // The map is a flat object of string literals, so evaluating it is safe and avoids shipping a
  // second copy of the list that could drift from the worker.
  const parsed = new Function(`return (${block[1]});`)();
  return { source, assets: parsed };
}

function positionOf(source, token) {
  const position = source.indexOf(token);
  assert.notEqual(position, -1, `Expected the worker to contain: ${token}`);
  return position;
}

test('every landing-page screenshot exists in store-assets', async () => {
  const { assets } = await readWorkerAssets();
  const files = new Set(await readdir(storeAssetsPath));
  const names = Object.entries(assets);
  assert.equal(names.length, 7, 'the landing page previews exactly seven shots');

  for (const [name, file] of names) {
    assert.match(file, /^[a-z0-9][a-z0-9-]*\.(png|jpg)$/, `${name} names a plain asset file`);
    assert.ok(files.has(file), `store-assets/${file} is missing; landing page key "${name}" links to it.`);
  }
});

test('the landing page links to store-assets on main, never to a README-only folder', async () => {
  const { source } = await readWorkerAssets();
  assert.match(
    source,
    /const SCREENSHOT_BASE = 'https:\/\/raw\.githubusercontent\.com\/halunhaku\/marktab\/main\/store-assets';/,
  );
  assert.doesNotMatch(source, /raw\.githubusercontent\.com\/[^'\n]*\/screenshots/, 'There is no screenshots/ folder in this repository.');
});

test('every rendered image comes from the declared asset map', async () => {
  const { source, assets } = await readWorkerAssets();
  // The previews are `${screenshots.<key>}` templates and nothing else, so a hand-typed URL
  // cannot slip past the existence check above.
  const used = [...source.matchAll(/\$\{screenshots\.(\w+)\}/g)].map((match) => match[1]);
  assert.ok(used.length >= 7, 'the page still renders its preview images');
  for (const key of used) {
    assert.ok(Object.hasOwn(assets, key), `screenshots.${key} is rendered but not declared in SCREENSHOT_ASSETS.`);
  }
  assert.ok(used.includes('home'), 'og:image reuses the home shot');
});

test('the landing page no longer advertises the retired Edge store', async () => {
  const { source } = await readWorkerAssets();
  assert.doesNotMatch(source, /Edge Compatible/);
  assert.doesNotMatch(source, /edge:\/\/extensions/);
  // Guard the order, not just presence: the install steps must name Chrome first.
  assert.ok(positionOf(source, 'chrome://extensions/') > 0);
});
