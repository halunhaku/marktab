# MarkTab 3 — Architecture

How the extension is put together, module by module, and why. Every claim here is checkable
against `src/**`, `scripts/**`, `tests/**` and `public/manifest.json`; the decisions behind the
structure are recorded in [`decisions/README.md`](./decisions/README.md).

---

## 1. Shape

Manifest V3, three entry points, three layers with a single direction of dependency:

```text
src/entries/**  ──▶  src/ui/**  ──▶  src/core/**
 (thin hosts)        (app + kit)     (UI-free domain)
```

- `src/core/**` never imports from `src/ui/**`, renders nothing, and is the only layer allowed
  to touch `chrome.*` (through `platform/`). It is imported by the new tab page, the popup *and*
  the service worker (which has no DOM at all), which is why the rule is enforced by structure
  rather than by convention (ADR-003). The only globals core touches are the guarded ones the
  appearance paint cache and the link/clipboard helpers need; none of them is used for layout or
  rendering.
- `src/ui/**` renders and mutates through stores; it reads state through signals. The shell is
  a navigation rail plus one content column and nothing else (ADR-012).
- `src/entries/**` mount. They contain no logic beyond import side effects, stylesheet imports
  and `render(...)`.

Runtime dependencies are exactly `preact` and `@preact/signals`; everything else in
`package.json` is build/test tooling. The build target is `chrome114` (matching
`minimum_chrome_version`), so no transpilation floor is wasted.

## 2. Module map

### 2.1 `src/core` — domain

| Module | Responsibility |
| --- | --- |
| `platform/chrome.ts` | The only place `chrome.*` is reached for generically: `getChrome()`, `getTabsApi()`, `getI18nApi()`, `runtimeUrl()`. Every accessor is defensive, so core code runs unchanged in tests and previews. |
| `platform/bookmarks.ts` | Bookmark-tree reads and mutations: `createBookmark()`, `readActivePage()` (the `activeTab` path), `CurrentPage`, `BookmarkMutation`. |
| `platform/storage.ts` | `readKey` / `writeKey` / `subscribeToKey` / `approximateSize` over `storage.sync` and `storage.local`, with quota-aware failure reporting instead of throwing. |
| `platform/favicon.ts` | `faviconUrl(pageUrl, size)` builds a `runtime.getURL('/_favicon/')` URL with `pageUrl` + `size` — resolved by Chrome from its local cache, which is why no host permission is needed — plus `fallbackGlyph()` and `glyphHue()` for the letter tile. |
| `bookmarks/types.ts` | `RawBookmarkNode`, `BookmarkEntry`, `FolderEntry`, `BookmarkIndexData`, `IndexStatus`, `ROOT_PARENT_ID`. |
| `bookmarks/index.ts` | `buildIndex(tree)`: one non-recursive pass over the bookmark tree into a flat, search-ready index. Every string the matcher needs (`sTitle`, `sUrl`, `sHost`, `sPath`) is lower-cased exactly once, and folders carry both `count` (direct) and `total` (with descendants). Also `EMPTY_INDEX` and `isIndexEmpty()`. |
| `bookmarks/search.ts` | `searchIndex(index, query, options)` plus `highlightRanges()`. Ranking is described in §5. |
| `bookmarks/store.ts` | Owns `bookmarkIndex`, `indexStatus`, `indexError`, `indexRevision`. `reloadBookmarks()` single-flights the tree read; `startBookmarkSync()` subscribes to `onCreated`/`onRemoved`/`onChanged`/`onMoved`/`onChildrenReordered`/`onImportBegan` plus `onImportEnded` through a 220 ms debounce; `refreshBookmarksNow()` bypasses the debounce after the app's own mutations. |
| `settings/types.ts` | The settings model, `DEFAULT_SETTINGS`, `cloneDefaults()`, and every storage constant: `SETTINGS_KEY` (`marktab:settings:v3`), `DATA_KEY` (`marktab:data:v3`), `SETTINGS_SCHEMA` (3), `DATA_SCHEMA` (1), `LEGACY_SETTINGS_KEYS`, `RECENT_CAP` (200), `HIDDEN_FOLDER_CAP` (2000), the `recentCount`/`pinnedLimit` bounds, and `SYNC_ITEM_BUDGET` (6 KiB). |
| `settings/normalize.ts` | Coerces any unknown payload into a valid `Settings`, so a hand-edited or partially migrated object can never crash a view. |
| `settings/store.ts` | Owns the `settings` signal and `settingsStatus` / `settingsNotice` (`'sync-quota-trimmed'`, `'sync-write-failed'`). `updateSettings(patch)` merges and schedules a debounced write; `pruneForSync()` drops hidden ids until the payload fits the sync budget; `flushSettings()` forces the pending write; `persistSettingsNow()` writes even when nothing is scheduled; `watchSettings()` mirrors cross-tab changes. |
| `settings/migrate.ts` | `migrateLegacyState({ markTabSettings, rainbowBookmarkSettings })` → `{ applied, source, settings, data }`, plus `hasLegacyPayload()`. Reads legacy themes, hidden folders, pins, recents, counts and search settings; anything unrecognised normalizes to defaults. |
| `userdata/model.ts` | The pure data model for MarkTab-owned state: `PinRecord`, `RecentRecord`, `addPin`/`removePin`/`togglePin`/`movePin`/`setPinTitle`, `recordVisit` (dedupe by URL, newest first, capped at `RECENT_CAP`), `clearRecent`, `removeRecent`, `reindexPins`, `frecencyWeights()`. |
| `userdata/store.ts` | Owns `userData`, `pins`, `recent`, `pinsByUrl`, `recentByUrl`, `searchWeights` and `userDataWriteError`; load/flush/replace (`persistUserDataNow()`) and `watchUserData()` for cross-tab sync, `markUserDataHydrated()`. |
| `state/bootstrap.ts` | The single hydration path (§6). Also `persistEverything()`, `readRawKeys()`, `writeRawKey()` and a test seam. |
| `state/signals.ts` | Read-side barrel (`settings`, `userData`, `pins`, `recent`, `searchWeights`, `bookmarkIndex`, …) so consumers never import a write-side store — which is what keeps store imports acyclic. |
| `state/selectors.ts` | `computed` derivations for views: `linkContext`, `bookmarkByUrl`, `hiddenFolderSet` (subtree expansion), `visibleFolders`, `folderRows` (depth-labelled rail tree), `folderOptions`, `stats`, `pinnedItems`, `recentItems`, `pinnedPreview`, `recentPreview`, `rootFolderCards`, `breadcrumbFor`, `rootOf`, `subtreeFolderIds`. |
| `appearance.ts` | Theme/density/motion resolution and the paint cache: `resolveAppearance()`, `applyAppearance()` (writes `data-theme`/`data-density`/`data-motion`), `readAppearanceCache`/`writeAppearanceCache`, `watchSystemAppearance()`, plus `openUrl()` and `copyText()`. |
| `util/fuzzy.ts` | `tokenize`, `indexOfHit`, `atWordBoundary`, `subsequenceHit` — the primitives the scorer is built from. |
| `util/url.ts` | `hostOf`, URL/template parsing, `SEARCH_ENGINES` (`google`, `duckduckgo`, `bing`), `findEngine`, `buildSearchUrl`, `isValidTemplate`. |
| `util/time.ts` | Clock, greeting bucketing (`morning`/`afternoon`/`evening`/`night`) and relative-time bucketing. |
| `util/timing.ts` | `debounce` and `throttle` with `cancel`/`flush`. |

### 2.2 `src/ui` — application

| Area | Responsibility |
| --- | --- |
| `features/app/` | `App.tsx` owns hydration, subscriptions, the global key map (ADR-014 — the palette owns its own combobox keys separately), the route switch and the overlay hosts. `Rail.tsx` renders navigation + folder tree + footer stats; `DialogHost.tsx` renders whatever dialog the overlay store requests. |
| `features/home/` | `HomeView`, `Hero` (greeting + search), `ClockDial` (the time, the day's arc and the minute ring, redrawn every second), `FolderTile`, `Onboarding` (first-run card), `clockProgress.ts` (`dayProgress`/`minuteProgress` → the 0…1 fractions that drive the dial). |
| `features/folders/` | `FolderView`, `FolderToolbar` (view/sort segmented controls + filter field), `FolderBreadcrumb`, `FolderChips`, `FolderPlaceholder`. |
| `features/library/` | `PinnedView` (includes the ordering controls Home omits) and `RecentView`. |
| `features/links/` | `LinkRow` / `LinkCard` / `LinkList` / `LinkGrid` render the uniform `LinkItem`; `RenameDialog`, `MoveDialog` and `DeleteDialog` are its mutations; `open.ts` records the visit *before* navigating (a page that navigates away cancels pending writes) and supplies the shared `<a href>` anchor props, so middle-click, ⌘/Ctrl-click and the native context menu keep working. |
| `features/palette/` | `CommandPalette` — the combobox, its result sections (`rows.tsx`) and the palette-only key map. |
| `features/settings/` | `SettingsView` + `SettingsNav` (both driven by `sections.ts`), then one file per section: `AppearanceSection`, `HomeSection`, `SearchSection`, `FoldersSection`, `DataSection` (export/import), `AboutSection` (version, shortcut table, privacy, manager link). |
| `features/popup/` | `PopupApp` — stats, theme cycle, "bookmark the current page", open the new tab page (optionally with `?q=`), open the browser bookmark manager, installed version. |
| `components/` | The design kit; the inventory and token rules are in [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). |
| `hooks/` | `useAppearance` (§7), `useMediaQuery` (drives the rail/drawer switch), `useNow` (clock ticks), `useIncremental` (bounded rendering: `initial`/`step`, default 60). |
| `actions/` | `links.ts` (`togglePin`, `copyLink`, delete-with-undo, `openManager`, the shared link context menu), `folders.ts` (hide/unhide — never a bookmark operation), `data.ts` (build/parse/apply the JSON export, engine options, locale labels). |
| `state/` | `router.ts` (route + palette signals, document title), `overlay.ts` (menu/dialog state), `toast.ts` (toast queue), `onboarding.ts` (`marktab.onboarding.v3` — device-local, deliberately outside synced settings, ADR-015). |
| `styles/` | `tokens.css` (all design tokens) and `base.css` (reset, element defaults, ambient background, focus ring, scrollbars, `data-scroll-locked`). |

### 2.3 `src/entries`, `src/locales`, `public`

| Module | Responsibility |
| --- | --- |
| `entries/newtab/index.tsx` | Imports `tokens.css` + `base.css` for side effects and mounts `<App />` into `#marktab-root`. Nothing else — the first frame must not wait on `chrome.storage`. |
| `entries/popup/index.tsx` | Mounts `<PopupApp />` into `#marktab-popup-root`. |
| `entries/background/index.ts` | MV3 module service worker. Two jobs: run `bootstrapState()` once per worker start (so an update migrates state even if the user never opens the new tab page), and open the new tab page once on a fresh install. No timers, no polling, no bookmark listeners. |
| `locales/en.ts` | The message catalogue and the source of truth for `MessageKey`. |
| `locales/zh.ts` | Simplified Chinese catalogue, typed `Record<MessageKey, string>` so parity is a compile error. |
| `locales/index.ts` | `resolveLocale` (honours the `auto` setting against the browser UI language), `currentLocale`, `t()`, `interpolate()`, `localeTag()`. |
| `public/manifest.json` | The shipped manifest. Vite copies `public/**` verbatim into `dist/extension`. |
| `public/theme-boot.js` | Classic, blocking first-paint script (§7). MV3 forbids inline scripts, so it stays a real file. |
| `public/_locales/{en,zh_CN}/messages.json` | Chrome i18n for `appName` and `appDescription` only. |

## 3. Data flow

```text
chrome.bookmarks.getTree()
        │  (platform/bookmarks.ts → platform/chrome.ts)
        ▼
buildIndex(tree)                       bookmarks/index.ts  — one pass, lower-cased fields
        │
        ▼
bookmarkIndex / indexStatus / indexRevision     core/bookmarks/store.ts  (signals)
        │
        ├──▶ searchIndex(index, query, { limit, folderLimit, weights, scopeFolderIds, excludeFolders })
        │                                     core/bookmarks/search.ts
        ▼
core/state/selectors.ts  (computed)     linkContext · stats · folderRows · pinnedItems · recentItems …
        │
        ▼
ui/features/**  (views read signals directly; nothing in App re-renders for a view's data)
```

Two flows feed the same pipeline:

- **Bookmark mutations** — `startBookmarkSync()` subscribes to the six bookmark events plus
  `onImportEnded`, debounces 220 ms, and calls `reloadBookmarks()`, which single-flights
  concurrent reads (`inFlight` + `queued`). After a mutation the app itself performs
  (e.g. add/rename/move/delete from the palette or a card), `refreshBookmarksNow()` skips the
  debounce so the UI does not lag behind the action the user just took.
- **MarkTab-owned state** — pins and recents live in `userdata`, are keyed by URL, and reach
  search as `searchWeights`: a `Map<url, number>` frecency bonus added to a bookmark's score.

## 4. State ownership

| Kind of state | Owner | Notes |
| --- | --- | --- |
| Bookmark index | `core/bookmarks/store.ts` | Rebuilt wholesale from the tree; never patched incrementally (the tree is the source of truth). |
| Settings | `core/settings/store.ts` | Debounced writes to `storage.sync`; `pruneForSync` guarantees the item stays inside the budget. |
| Pins + recents | `core/userdata/store.ts` | Coalesced writes to `storage.local`, mirrored across tabs by `watchUserData()`. |
| Route + palette open/query | `ui/state/router.ts` | Plain signals, deliberately not URL fragments: a new tab page must always start at Home and the back button must not walk through views. The only URL interaction is the popup's `?q=`, which is consumed and removed with `history.replaceState`. |
| Menu, dialog | `ui/state/overlay.ts` | One menu and one dialog at a time, rendered by `MenuHost` / `DialogHost` (ADR-007). |
| Toasts | `ui/state/toast.ts` | Queue rendered by `ToastHost`; carries undo payloads. |
| Onboarding ack | `ui/state/onboarding.ts` | `localStorage['marktab.onboarding.v3']` — device-local, intentionally outside the synced schema. |
| Appearance cache | `core/appearance.ts` | `localStorage['marktab.appearance.v3']` — a paint cache, not a source of truth. |

Rule of thumb: **a store owns the signal, a selector owns the derivation, a view owns only
layout.** `state/signals.ts` exists so read-only consumers do not import the write-side stores.

## 5. Search ranking

`searchIndex` scores every bookmark and folder in the in-memory index on every query — no
`chrome.bookmarks.*` call per keystroke. Query → tokens via `tokenize`; **every token must match
somewhere (AND)**; each token contributes its best field score.

Per-token field bases (`FIELD_BASE`): `title` **1000**, `host` **620**, `path` **420**,
`url` **260**. A token is scored in that field order and the best field wins.

Match-quality multipliers inside a field:

| Situation | Multiplier |
| --- | --- |
| Exact whole-string hit | `base × 2.2` |
| Prefix hit (`index === 0`) | `base × 1.6` |
| Hit at a word boundary | `base × 1.25` |
| Substring hit | `base × 1.0` |
| Subsequence hit (only for tokens of length 3–16) | `base × compactness × 0.45` |

Whole-query bonuses, applied after the tokens are summed:

| Bonus | Value |
| --- | --- |
| Bookmark title starts with the full lower-cased query | `+600` |
| Bookmark host equals the query | `+420` |
| Bookmark URL starts with the query | `+120` |
| Frecency weight for that URL (pins + recents) | `+weights.get(url)` |
| Folder title starts with the query | `+500` |
| Folder size (logarithmic) | `+min(80, log2(total + 1) × 18)` |

Ordering: score descending, then case-insensitive title, then URL (bookmarks) or id (folders) —
a total order, so equal scores never reshuffle between renders. Defaults: `limit` **60**
bookmarks, `folderLimit` **12** folders; the palette narrows that to `limit: 40,
folderLimit: 8`, while `totalBookmarks` / `totalFolders` still report the full match count so it
can say "showing the top N of M" (`search.limitHint`). The cap narrows the *output* only —
scoring always covers the whole index, and the query is never debounced (ADR-018).
`excludeFolders` removes hidden folders and their subtrees; `scopeFolderIds` restricts results to
a folder + descendants for in-folder search. `elapsedMs` is measured with `performance.now()`
when available.

## 6. Storage schema and migration

| Key | Area | Shape |
| --- | --- | --- |
| `marktab:settings:v3` | `storage.sync` | `Settings` + `schema: 3`: `theme`, `language`, `density`, `motion`, `railCollapsed`, `home` (`showClock`/`showPinned`/`showRecent`/`showFolders`, `recentCount` 3–24, `pinnedLimit` 4–40), `folders` (`view`, `sort`, `hiddenIds`), `search` (`engine`, `customTemplate`, `openInNewTab`, `showFavicons`). |
| `marktab:data:v3` | `storage.local` | `UserData` + `schema: 1`: ordered `pins` and `recent` visits (deduped by URL, newest first, capped at `RECENT_CAP` = 200), plus an optional `migration` record. |
| `marktab.appearance.v3` | `localStorage` | Paint cache: `{ theme, density, motion }` as *settings*, not resolved values. |
| `marktab.onboarding.v3` | `localStorage` | `'dismissed'`. |
| `markTabSettings`, `rainbowBookmarkSettings` | `storage.sync` | **Legacy.** Read once during migration; never written, never deleted. |

`bootstrapState()` is the only hydration path (single-flight: a second call returns the first
promise). It runs in the new tab page, the popup and the service worker:

1. read `marktab:settings:v3` (sync) and `marktab:data:v3` (local) in parallel;
2. `loadSettingsFromStorage()` + `loadUserData()` — normalize whatever was found;
3. a key counts as *missing* only when the read succeeded and returned `undefined`. A failed
   read is not an absent key, so nothing is ever written over data that could not be seen;
4. migration runs **only when both keys are missing** — a genuine first run (ADR-019).
   `storage.sync` delivers settings to a second device whose local data is still empty, and the
   legacy keys are immortal (ADR-009), so "either key is missing" would let an older v2 payload
   overwrite live settings and sync that reversion everywhere. If a legacy payload is present
   *and* recognised (at least one field this module understands), `migrateLegacyState()` maps it
   and the result is written to the two v3 keys only;
5. otherwise the *missing half* is filled: a fresh `UserData` with
   `migration: { source: 'fresh' }`, and/or the default settings. An existing key is never
   replaced;
6. `markUserDataHydrated()`, `markSettingsReady()`, then `watchSettings()` + `watchUserData()`
   start mirroring cross-tab changes and return their unsubscribe functions.

Guarantees: only the two namespaced v3 keys are ever written; a legacy key is never deleted or
rewritten; browser bookmarks are never touched; a second call is idempotent; migration never
overwrites state that already exists. Schema changes must therefore stay **additive** and
migration **one-way** (ADR-009, ADR-019) — a v2 install keeps a working rollback.

A write can fail (`storage.sync` write quota, an exhausted `storage.local`), and the browser
reports that only through the call's rejection. Both stores therefore turn a failed write into
a value the UI renders: `settingsNotice` (`'sync-quota-trimmed'` / `'sync-write-failed'`) and
`userDataWriteError`, shown as a `role="status"` warning row in Settings → Data (ADR-021).

## 7. Appearance boot and theming

Themes are resolved in three CSS layers (`:root` light defaults → `[data-theme='dark']` →
`[data-density]`/`[data-motion]`), and the resolved values are written as attributes on `<html>`.
Splitting a pre-paint classic script from the reactive app is ADR-016; three writers keep the
attributes correct:

1. **`public/theme-boot.js`** — a classic, blocking script in `<head>`, before any module. It
   reads `localStorage['marktab.appearance.v3']` (falling back to `system`/`comfortable`),
   resolves `system` against `matchMedia('(prefers-color-scheme: dark)')` and
   `matchMedia('(prefers-reduced-motion: reduce)')`, then writes `data-theme`, `data-density`,
   `data-motion`, `data-booting` and `data-platform` on `<html>`. It has no imports and no other
   side effects, so an explicit dark choice never flashes white. `data-platform` is what makes
   `Kbd` render ⌘ on macOS and Ctrl elsewhere. Because MV3 forbids inline scripts, this must
   remain a real file, and `scripts/validate-release.mjs` requires it to be present.
2. **`useAppearance()`** (in `App`) — a `useSignalEffect` that re-resolves and re-applies the
   appearance whenever the settings, the OS colour scheme or the OS reduced-motion flag change,
   refreshes the paint cache, sets `<html lang>` from the resolved locale, and clears
   `data-booting` after the first effect.
3. **`entries/popup/index.tsx`** — the popup cannot use `useAppearance()` (it does not render
   `App`), so it runs the same three effects itself: apply the resolved appearance, keep the
   paint cache fresh, set `<html lang>`, watch the OS appearance, and clear `data-booting`.

The settings the user picks (`system`/`reduced`/`full` motion) and the system defaults both
funnel through `resolveAppearance()`, so the CSS only ever sees a resolved value.

## 8. Internationalization

Two independent catalogues with different jobs:

- **Chrome i18n** — `public/_locales/en/messages.json` and `public/_locales/zh_CN/messages.json`
  supply `appName` and `appDescription` for the manifest (`__MSG_appName__`,
  `__MSG_appDescription__`, `default_locale: en`). `validate-release.mjs` fails if either key is
  missing.
- **In-app copy** — `src/locales/en.ts` (source of truth) and `zh.ts` (typed
  `Record<MessageKey, string>`). `currentLocale` resolves `settings.language` (`auto` | `en` |
  `zh`); `auto` reads `chrome.i18n.getUILanguage()` (falling back to `navigator.language`) and
  maps `zh`, `zh-cn`, `zh-hans`, `zh-sg`, `zh-my` to Simplified Chinese. `t(key, params)`
  interpolates `{placeholders}`; `localeTag()` gives `Intl` a stable `en-US` / `zh-CN` tag.

Adding a message is a two-file edit — the type checker enforces parity, so no test is needed for
it.

## 9. Build pipeline

`vite.config.ts` produces `dist/extension` from three entries and nothing else:

| Input | Output |
| --- | --- |
| `newtab.html` | `newtab.html` + hashed `assets/newtab-*.js`, `assets/newtab-*.css` |
| `popup.html` | `popup.html` + hashed `assets/popup-*.js`, `assets/popup-*.css` |
| `src/entries/background/index.ts` | `background.js` (never hashed — the manifest names it) |
| `public/**` | copied verbatim: `manifest.json`, `theme-boot.js`, `icons/**`, `_locales/**` |
| *(shared code)* | any chunk both pages need is emitted once, as `assets/<name>-<hash>.js` / `.css`, so the asset list holds shared chunks in addition to the per-entry ones |

Deliberate settings: `target: 'chrome114'`, `modulePreload.polyfill: false` and
`assetsInlineLimit: 0` (Vite's module-preload polyfill is an inline script, which MV3 forbids),
`cssCodeSplit: true` with `cssMinify: 'lightningcss'`, `sourcemap: false`,
`emptyOutDir: true`, CSS Modules with `localsConvention: 'camelCaseOnly'` and
`generateScopedName: '[name]__[local]__[hash:base64:5]'`, and the `@` → `src` alias.

`scripts/validate-release.mjs` then validates the **built** tree:

- required runtime files exist (`manifest.json`, `newtab.html`, `popup.html`, `background.js`,
  `theme-boot.js`, all four icon sizes, both `_locales` catalogues);
- banned file types are absent (`.map`, `.ts`/`.tsx`, `.md`);
- the manifest matches the source manifest and `package.json` versions, `manifest_version` is 3,
  permissions are exactly the five allowed, `host_permissions`/`optional_permissions` are empty,
  there are no content scripts, the extension-pages CSP is not permissive, the three entry names
  and `default_locale` are correct, `name`/`description` use `__MSG_…__`, and every icon size
  resolves to a built file;
- both locale catalogues parse and carry `appName` + `appDescription`;
- every built HTML file loads its bundle as a module and has no inline script, remote script,
  inline event handler, `javascript:` URL or remote stylesheet;
- no built `.js` matches the forbidden patterns (`eval(`, `new Function(`, `document.write(`,
  `XMLHttpRequest`, `fetch(`, analytics SDKs, `sourceMappingURL`);
- budgets hold: JavaScript ≤ 420 KiB, CSS ≤ 130 KiB, total payload ≤ 1.2 MiB;
- `README.md`, `PRIVACY_POLICY.md` and `CHROME_STORE_SUBMISSION.md` exist, mention each
  permission (warning), and the privacy policy does not mention analytics without saying there
  are none (warning).

## 10. Release pipeline

```text
npm run bump -- X.Y.Z    → package.json + public/manifest.json + README + CHROME_STORE_SUBMISSION + cloudflare worker
npm run release:check    → typecheck → test → build → validate → package
git tag vX.Y.Z           → .github/workflows/release.yml
```

`scripts/package-release.mjs` zips **exactly** `dist/extension` into `dist/marktab-<version>.zip`
with sorted entries and a fixed timestamp (`SOURCE_DATE_EPOCH`, clamped to the ZIP epoch range
[1980-01-01, 2107-12-31]) so two runs from the same sources are byte-identical — a store diff
then answers "did the right build get published?". It deletes stale `marktab-X.Y.Z.zip` files
first, refuses to package an empty or missing `dist/extension`, and uses PowerShell
`System.IO.Compression` on Windows and `zip -X` elsewhere.

`release.yml` verifies the tag against both version sources (`scripts/release-version.mjs`),
runs tests/build/validate/package, creates a **draft** GitHub release with the zip attached,
submits to the Chrome Web Store (`npm run cws:publish`), and only publishes the draft after that
API call succeeds. Recovery mode: `publish_github_release_only` (Chrome already accepted the
submission) — it never offers Chrome the same version twice (ADR-011). The Chrome Web Store is
the only store in the pipeline: the Edge Add-ons publisher and its two recovery inputs were
retired, and `CHROME_STORE_SUBMISSION.md#microsoft-edge--publishing-retired` records why and what
a human still has to do in Partner Center. `.github/workflows/ci.yml` runs
typecheck/test/build/validate on Node 22 plus a Playwright job that installs Chromium with
`MARKTAB_E2E_CHANNEL=chromium`.

## 11. Testing strategy

| Layer | Runner | Scope |
| --- | --- | --- |
| Domain units | Vitest + happy-dom (`tests/unit/**`, `npm run test:unit`) | `buildIndex` (tree → index), `searchIndex` ranking, `fuzzy`/`url`/`time`/`timing` primitives. Fast, no browser. `tests/unit/helpers/fakes.ts` provides `chrome.*` fakes. |
| Release tooling | `node --test scripts/*.test.mjs` (`npm run test:scripts`) | Packaging determinism, version agreement, the workflow contract, and the Chrome Web Store API client. |
| Accessibility | `tests/e2e/a11y.spec.ts` runs `axe-core` inside every surface (home, folder, palette, pinned, recent, settings, popup) in both themes against the WCAG 2.0/2.1/2.2 A+AA rule sets. axe is injected with `page.addInitScript` because the extension's own CSP forbids inline scripts. It is the check that forced `--text-3`, `--accent-strong` and the primary button fill to their current values. |
| End to end | Playwright Chromium against the unpacked `dist/extension` (`tests/e2e/**`, `npm run test:e2e` = build + `playwright test`) | The three facts happy-dom cannot prove: the unpacked build loads in real Chromium, the MV3 worker registers at `/background.js`, and the new tab page paints its shell with the resolved appearance on `<html>`. `tests/e2e/fixtures.ts` seeds bookmarks, clears state and reads/writes extension storage from inside the worker, including planting legacy v1/v2 profiles. |

`playwright.config.ts` is deliberately serial (`workers: 1`, `fullyParallel: false`,
`retries: 0`, 45 s test timeout) because the specs share one browser profile's bookmark tree and
extension storage.

The layering is a decision, not an accident (ADR-017): each layer tests what it can actually
observe, and there are **no UI component tests** — the UI is exercised in a browser rather than
in a DOM emulator. `npm run release:check` chains all three in dependency order, and
`scripts/validate-release.mjs` is what makes the gate binding, since it asserts against the
*built* tree rather than the sources.

## 12. Historical documents

[`superpowers/`](./superpowers/) holds the v2-era specs and plans that were used while planning
the rebuild. They are kept as a record only — they describe neither the current code nor the
current process, and nothing in `src/**`, `scripts/**` or the workflows depends on them. See
[`superpowers/README.md`](./superpowers/README.md).
