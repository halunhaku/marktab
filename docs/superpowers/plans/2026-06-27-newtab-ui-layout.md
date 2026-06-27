# MarkTab New Tab UI Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the MarkTab home view so five pinned cards fit one desktop row, Recent becomes two complete modules, Folders moves into a stronger panel, and favicon shells are visually consistent without changing extension behavior.

**Architecture:** Keep the existing native HTML/CSS/JavaScript application and data flow. Add a source-level layout contract test, change only the Recent presentation markup in `newtab.js`, and implement the approved layout through scoped home-view CSS and responsive breakpoints.

**Tech Stack:** Chrome Manifest V3, HTML, CSS, vanilla JavaScript, Node.js built-in test runner, existing release scripts.

---

## File Map

- Modify `package.json`: expose the new source-level layout test through `npm test`.
- Create `scripts/newtab-layout.test.mjs`: enforce the agreed home-view layout and presentation contracts without adding dependencies.
- Modify `newtab.js`: group up to four recent items into two presentation-only cards while preserving item markup and event wiring.
- Modify `styles.css`: implement container sizing, five-column Pinned behavior, Recent modules, Folders panel, favicon shells, background depth, and responsive rules.
- Do not modify `manifest.json`, permissions, localization data, popup files, bookmark data structures, or search behavior.

### Task 1: Add a failing home-layout contract test

**Files:**
- Create: `scripts/newtab-layout.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the layout contract test**

Create `scripts/newtab-layout.test.mjs` with Node's built-in test runner. Read the production sources and assert the exact approved contracts:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [css, js] = await Promise.all([
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../newtab.js', import.meta.url), 'utf8')
]);

test('home layout uses the approved wide container and responsive search width', () => {
  assert.match(css, /\.home-container\s*\{[^}]*width:\s*min\(88vw,\s*1680px\)/s);
  assert.match(css, /\.home-search-card\s*\{[^}]*width:\s*clamp\(520px,\s*44vw,\s*760px\)/s);
});

test('pinned layout caps desktop rows at five cards', () => {
  assert.match(css, /\.home-pinned-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
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
```

- [ ] **Step 2: Add the npm test command**

Add this script to `package.json` without changing existing commands:

```json
"test": "node --test scripts/newtab-layout.test.mjs"
```

- [ ] **Step 3: Run the new test and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because the production CSS still uses the 1180px container and unrestricted `auto-fit`, and `newtab.js` does not yet define `createRecentGroup`.

- [ ] **Step 4: Commit the failing contract test**

```powershell
git add package.json scripts/newtab-layout.test.mjs
git commit -m "test: define new tab layout contract"
```

### Task 2: Implement the approved home-view presentation

**Files:**
- Modify: `newtab.js:472-509`
- Modify: `styles.css:120-129,194-801,2086-2244`
- Test: `scripts/newtab-layout.test.mjs`

- [ ] **Step 1: Group Recent items into presentation cards**

Add this helper beside `createRecentRow`:

```js
function createRecentGroup(bookmarks) {
  return `<div class="home-recent-card">${bookmarks.map(createRecentRow).join('')}</div>`;
}
```

Replace the flat Recent assignment with groups of two while keeping the existing four-item cap:

```js
const recentGroups = [];
for (let i = 0; i < recent.length; i += 2) {
  recentGroups.push(recent.slice(i, i + 2));
}
el.homeRecentGrid.innerHTML = recentGroups.map(createRecentGroup).join('');
```

Do not alter `afterRenderRecent`, `trackVisit`, `openFolderViewForBookmarks`, View all visibility, or the empty state.

- [ ] **Step 2: Implement the wide centered page and calmer vertical rhythm**

Update the home background and sizing with token-based colors:

```css
body {
  background:
    radial-gradient(circle at 50% 0%, rgba(47, 111, 78, 0.045), transparent 34rem),
    var(--bg);
}

.home-view {
  padding: clamp(36px, 5vh, 72px) clamp(24px, 4vw, 72px) clamp(32px, 5vh, 64px);
}

.home-container {
  width: min(88vw, 1680px);
  max-width: 1680px;
}

.home-search-card {
  width: clamp(520px, 44vw, 760px);
  max-width: 100%;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
}

.home-hero { margin-bottom: clamp(24px, 3vh, 36px); }
.home-section { margin-bottom: clamp(24px, 3vh, 36px); }
```

- [ ] **Step 3: Implement deterministic five-column Pinned cards**

Use five fixed desktop columns so item six wraps:

```css
.home-pinned-grid,
.home-pinned-grid:is(.pinned-count-0, .pinned-count-1, .pinned-count-2, .pinned-count-3, .pinned-count-4) {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
}

.home-card,
.empty-pin-card {
  min-height: 140px;
  padding: 20px;
}

.home-card-title {
  display: block;
  white-space: nowrap;
  word-break: normal;
}
```

Remove the home favicon hover scaling so icons keep a stable visual weight.

- [ ] **Step 4: Unify home favicon shells**

Use shared selectors while retaining the existing loaded/fallback selectors:

```css
.home-card-favicon,
.home-recent-favicon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(107, 137, 116, 0.12);
}

.home-card-favicon-img,
.home-recent-favicon-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
```

- [ ] **Step 5: Style Recent as two complete modules**

```css
.home-recent-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.home-recent-card {
  min-width: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
}

.home-recent-item {
  min-height: 72px;
  padding: 14px 18px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.home-recent-item + .home-recent-item {
  border-top: 1px solid var(--line);
}
```

Keep row hover feedback to a subtle token-based background change.

- [ ] **Step 6: Strengthen the Folders panel**

```css
.home-folder-pills {
  gap: 10px;
  padding: 18px 20px;
  background: color-mix(in srgb, var(--surface) 92%, var(--green-soft));
  border: 1px solid var(--line);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-sm);
}

.folder-pill-count {
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 50%;
}
```

- [ ] **Step 7: Add responsive rules without horizontal overflow**

Add explicit home-only breakpoints:

```css
@media (max-width: 1199px) {
  .home-pinned-grid,
  .home-pinned-grid:is(.pinned-count-0, .pinned-count-1, .pinned-count-2, .pinned-count-3, .pinned-count-4) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .home-container { width: min(100%, calc(100vw - 32px)); }
  .home-search-card { width: 100%; }
  .home-pinned-grid,
  .home-pinned-grid:is(.pinned-count-0, .pinned-count-1, .pinned-count-2, .pinned-count-3, .pinned-count-4) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .home-recent-list { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .home-pinned-grid,
  .home-pinned-grid:is(.pinned-count-0, .pinned-count-1, .pinned-count-2, .pinned-count-3, .pinned-count-4) {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: Run the contract test and verify GREEN**

Run:

```powershell
npm test
```

Expected: five tests pass with zero failures.

- [ ] **Step 9: Inspect the production diff and commit**

Run `git diff --check`, verify no bookmark/search/theme behavior changed, then:

```powershell
git add newtab.js styles.css
git commit -m "feat: refine new tab responsive layout"
```

### Task 3: Validate rendered behavior and release packaging

**Files:**
- Verify: `newtab.html`
- Verify: `newtab.js`
- Verify: `styles.css`
- Verify: `manifest.json`
- Verify: generated `dist/marktab-1.4.1.zip`

- [ ] **Step 1: Run automated project checks**

```powershell
npm test
npm run validate
npm run package
```

Expected: all commands exit 0; validation reports success; package output contains only approved runtime files.

- [ ] **Step 2: Launch the new tab page through the available in-app Browser workflow**

Open the local extension page or the repo's supported screenshot fixture and verify page identity, non-blank content, absence of error overlays, and console health.

- [ ] **Step 3: Check desktop and Windows-scaled viewports**

Inspect at least these CSS viewport widths: 3840, 2560, 1920, 1707, 1536, 1280, 768, and 480. For each relevant desktop width, record:

```js
({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  pinnedColumns: getComputedStyle(document.querySelector('#homePinnedGrid')).gridTemplateColumns,
  recentColumns: getComputedStyle(document.querySelector('#homeRecentGrid')).gridTemplateColumns
})
```

Expected: no horizontal overflow; five columns at wide desktop widths; three/two/one columns only at their intended breakpoints; Recent is two columns on desktop and one on narrow screens.

- [ ] **Step 4: Exercise the unchanged interaction flow**

Test this flow:

```text
home loads -> Ctrl/Cmd+K opens search -> Esc closes search -> pinned item remains navigable -> View all opens Recent folder view -> Home returns -> folder chip opens its folder
```

Expected: each action produces the same state transition as before the visual change, with no relevant console warnings or errors.

- [ ] **Step 5: Capture final screenshot evidence**

Capture light-theme desktop, dark-theme desktop, and one narrow responsive screenshot outside committed source. Confirm the Pinned, Recent, and Folders hierarchy matches the approved Balanced Modules direction.

- [ ] **Step 6: Review repository state**

Run:

```powershell
git status --short
git log -3 --oneline
```

Expected: only the user's pre-existing untracked assets and the visual-companion workspace remain unrelated; implementation files are committed and no generated temporary QA files are staged.
