import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [css, js] = await Promise.all([
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../newtab.js', import.meta.url), 'utf8')
]);

test('home layout uses the approved wide container and responsive search width', () => {
  assert.match(css, /\.home-container\s*\{[^}]*width:\s*min\(88vw,\s*1680px\)/s);
  assert.doesNotMatch(css, /\.home-container\s*\{[^}]*1180px/s);
  assert.match(css, /\.home-search-card\s*\{[^}]*width:\s*clamp\(520px,\s*44vw,\s*760px\)/s);
});

test('pinned layout caps desktop rows at five cards', () => {
  assert.match(css, /\.home-pinned-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.home-pinned-grid:is\([^}]+\)\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /@media\s*\(max-width:\s*1199px\)[\s\S]*?\.home-pinned-grid[^{]*\{[^}]*repeat\(3,/s);
});

test('home favicon shells share the approved dimensions', () => {
  assert.match(css, /\.home-card-favicon,\s*\.home-recent-favicon\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;[^}]*border-radius:\s*14px/s);
  assert.match(css, /\.home-card-favicon-img,\s*\.home-recent-favicon-img\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px/s);
});

test('recent bookmarks render as two presentation cards', () => {
  assert.match(js, /function createRecentGroup\(bookmarks\)/);
  assert.match(js, /recentGroups\.map\(createRecentGroup\)\.join\(''\)/);
  assert.match(css, /\.home-recent-card\s*\{/);
  assert.match(css, /\.home-recent-item\s*\+\s*\.home-recent-item\s*\{/);
});

test('folders use a dedicated large-radius panel', () => {
  assert.match(css, /\.home-folder-pills\s*\{[^}]*border-radius:\s*var\(--radius-card-lg\)/s);
  assert.match(css, /\.folder-pill-count\s*\{[^}]*min-width:\s*22px;[^}]*height:\s*22px/s);
});
