<p align="center">
  <img src="./public/icons/icon128.png" alt="MarkTab logo" width="72" height="72">
</p>

<h1 align="center">MarkTab</h1>

<p align="center">
  A fast, private, keyboard-first bookmark new tab for Chrome.<br>
  <em>书签，一次按键就位</em>
</p>

<p align="center">
  <code>Manifest V3</code>
  · <code>Chrome 114+</code>
  · <code>Preact 11</code>
  · <code>v3.0.0</code>
</p>

---

## What it is

MarkTab replaces the browser's new tab page with a bookmark surface built from your own
`chrome.bookmarks` tree. There is no account, no developer-operated service and no server: the
extension reads the bookmark tree the browser already keeps, indexes it in memory and renders
it. Everything else (pins, recents, appearance, layout preferences) is stored in extension
storage on the device — preferences in `chrome.storage.sync`, so they follow the browser
profile if you have sync enabled, and MarkTab's own data in `chrome.storage.local`.

MarkTab 3 is a rebuild, not a refactor (ADR-002): the v2 UI — one root-level `newtab.js`
paired with a 65 KB `styles.css`, both keyed to DOM ids — was replaced by a Preact 11 +
`@preact/signals` application over a UI-free domain core. The reasoning and the rejected
alternatives are recorded in [docs/decisions/README.md](./docs/decisions/README.md).

## Features

| Capability | Detail |
| --- | --- |
| New tab replacement | Registered through `chrome_url_overrides.newtab` → `newtab.html`. |
| Command palette | `Mod+K` (⌘K on macOS) opens one field that searches bookmark titles, hosts, folder paths, URLs, folders, app actions and the web. |
| Fuzzy ranking | Every token must match (AND); each token scores its best field (`title` 1000, `host` 620, `path` 420, `url` 260) with whole-word, prefix and subsequence bonuses, plus a frecency bonus from pins and recents. |
| Pinning | Pin any bookmark (or any URL) to the home page; the Pinned view reorders the hand-curated list, and the browser bookmark tree is never rewritten. `P` in the palette toggles a pin, and `home.pinnedLimit` decides how many cards Home shows. |
| Recent history | URLs opened through MarkTab are recorded with a timestamp, deduplicated by URL, capped at 200; `recentCount` decides how many show on Home. |
| Folder browsing | Rail folder tree plus a folder view with grid/list layout, sorting by manual order, title or recency, and folder-scoped search. |
| Reversible folder hiding | Hidden folder ids live in settings and hide the whole subtree; browser bookmarks are never modified (ADR-008). |
| Rail navigation | Home / Recent / Pinned / Folders / Settings, collapsible to an icon rail, becoming a drawer at 1200 px and below (ADR-012, ADR-013). |
| Appearance | Theme (light/dark/system), density (comfortable/compact) and motion (system/reduced/full) as three independent axes. |
| Bilingual UI | English and Simplified Chinese copy with typed key parity, plus `auto` following the browser UI language. |
| Data portability | Settings + MarkTab-owned data (pins, recents) export to JSON and import back; the bookmark tree is never touched by either. (Note: the two data keys live in different storages — an import cannot be atomic, so a browser crash mid-import could apply settings without data. Keep exports until the UI confirms the import.) |
| First-run welcome | A dismissible card pointing at the palette; the acknowledgement is device-local. |
| Toolbar popup | Library stats, one-click theme cycle, "bookmark the current page", open the new tab page (optionally pre-filled with a query), open the browser bookmark manager, installed version. |
| Migration | MarkTab 1.x/2.x state (`markTabSettings`, `rainbowBookmarkSettings`) is mapped onto the v3 model once, and left in place. |

## Privacy stance

- No developer-owned server, no network requests, no analytics and no telemetry. The release
  gate fails the build if `fetch(`, `XMLHttpRequest`, `eval(`, `new Function(`, `document.write(`
  or an analytics SDK appears in any shipped `.js` file (`scripts/validate-release.mjs`).
- No remote code: all HTML, CSS, JS, locale data and icons are packaged with the extension;
  the built HTML is checked for inline scripts, remote scripts, inline event handlers and
  remote stylesheets.
- Requested permissions are exactly `bookmarks`, `favicon`, `search`, `storage` and
  `activeTab`. There are no `host_permissions`, no `optional_permissions` and no content
  scripts, so the extension cannot read page content.
- `activeTab` is used for one user-triggered action only: reading the current tab's title and
  URL in the popup when you click "Bookmark the current page".
- The one outgoing data flow is deliberate and user-initiated: submitting a web search sends
  the query to the search engine you configured in the browser.

Full text: [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).

## Install

Requires **Node.js >= 20** (`package.json` → `engines.node`) to build. To run the built
extension, no tooling is needed.

```bash
npm install
npm run build
```

The build emits the whole extension to `dist/extension`. Then:

1. Open `chrome://extensions/`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/extension` folder — not the repository root, which contains TypeScript
   sources that no browser can load.

For store installs, download `marktab-3.0.0.zip` from the GitHub release, unzip it to a
permanent folder, and load that folder unpacked.

## Development

```bash
npm install
npm run dev        # vite build --watch --mode development: rebuilds dist/extension on change
```

`npm run dev` is the same Vite build in development mode (`vite build --watch --mode
development`) writing the same three entries into the same `dist/extension` folder, so its
output is what you load unpacked in the browser: after each rebuild, press **Reload** on the
extension card in `chrome://extensions/`. There is no dev server and no HMR — extension pages
are files, not a served app.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | `vite build --watch --mode development` — rebuild `dist/extension` on change. |
| `npm run build` | `vite build` — production build into `dist/extension`. |
| `npm run typecheck` | `tsc --noEmit` over `src`, `tests` and the three config files (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `verbatimModuleSyntax`). |
| `npm test` | `npm run test:unit && npm run test:scripts`. |
| `npm run test:unit` | `vitest run` — happy-dom unit tests in `tests/unit/**` (core logic, migration, i18n parity). |
| `npm run test:unit:watch` | `vitest` in watch mode. |
| `npm run test:scripts` | `node --test scripts/*.test.mjs` — release tooling tests. |
| `npm run test:e2e` | `npm run build && playwright test` — real Chromium against `dist/extension`: behaviour specs, a 3 000-bookmark performance guard, and an `axe-core` WCAG A/AA audit of every surface in both themes. |
| `npm run validate` | `node scripts/validate-release.mjs` — validates the **built** tree in `dist/extension` plus the docs. |
| `npm run package` | `node scripts/package-release.mjs` — deterministic zip of `dist/extension`. |
| `npm run release:check` | `typecheck && test && build && validate && package` — the full local gate. |
| `npm run screenshots` | `node scripts/capture-store-assets.mjs` — recaptures `store-assets/` from the built extension. |
| `npm run cws:publish -- <zip>` | Uploads the zip to the Chrome Web Store (credentials from env). |
| `npm run bump -- 3.0.0` | Writes the new version into `package.json`, `public/manifest.json`, `README.md`, `CHROME_STORE_SUBMISSION.md` and `cloudflare/marktab-home-worker.js`. |

`npm run build` must run before `npm run validate`, `npm run package` or `npm run test:e2e`:
all three consume `dist/extension`, and the validator fails fast with
`dist/extension is missing. Run npm run build before validating.` if it is absent.

## Architecture

Three layers, one direction of dependency: `entries` → `ui` → `core`. `src/core/**` never
imports from `src/ui/**`, renders nothing, and is the only layer allowed to touch `chrome.*`
(through `core/platform/`) — which is why the domain is unit-testable with a fake `chrome`
object and reusable by the service worker, which has no DOM at all (ADR-003).

```text
marktab/
├─ newtab.html, popup.html        # Vite HTML entries; both load theme-boot.js then their module
├─ vite.config.ts                 # 3 entries → dist/extension, target chrome114, CSS Modules
├─ public/
│  ├─ manifest.json               # the shipped MV3 manifest (copied verbatim by Vite)
│  ├─ theme-boot.js               # classic, blocking first-paint appearance script
│  ├─ _locales/{en,zh_CN}/messages.json   # Chrome i18n for appName / appDescription
│  └─ icons/                      # 16/32/48/128 px extension icons
├─ src/
│  ├─ core/                       # UI-free domain
│  │  ├─ platform/                # thin chrome.* wrappers: chrome, storage, bookmarks, favicon
│  │  ├─ bookmarks/               # index.ts (tree → flat index), search.ts (ranking), store.ts (sync)
│  │  ├─ settings/                # types.ts (schema + keys), normalize.ts, store.ts, migrate.ts
│  │  ├─ userdata/                # model.ts (pins/recents), store.ts
│  │  ├─ state/                   # bootstrap.ts (hydration + migration), signals.ts, selectors.ts
│  │  ├─ appearance.ts            # theme/density/motion resolution + localStorage paint cache
│  │  └─ util/                    # fuzzy.ts, url.ts, time.ts, timing.ts
│  ├─ ui/
│  │  ├─ features/                # app/, home/, folders/, library/, links/, palette/, settings/, popup/
│  │  ├─ components/              # design kit (Button, Menu, Dialog, Toast, Kbd, …)
│  │  ├─ hooks/                   # useAppearance, useMediaQuery, useNow, useIncremental
│  │  ├─ actions/                 # links.ts, folders.ts, data.ts (export/import)
│  │  ├─ state/                   # router.ts, overlay.ts, toast.ts, onboarding.ts
│  │  └─ styles/                  # tokens.css, base.css
│  ├─ entries/                    # newtab/, popup/, background/ — three thin entry points
│  └─ locales/                    # en.ts (source of truth), zh.ts, index.ts (t(), locale resolution)
├─ scripts/                       # validate/package/publish/bump-release tooling + its node --test tests
├─ tests/
│  ├─ unit/                       # vitest + happy-dom
│  └─ e2e/                        # Playwright, real Chromium, unpacked dist/extension
└─ docs/                          # architecture, design principles, ADRs, release log
```

Module-by-module responsibilities, data flow and state ownership:
[docs/architecture.md](./docs/architecture.md).

## Storage and migration

| Key | Area | Contents |
| --- | --- | --- |
| `marktab:settings:v3` | `chrome.storage.sync` | Schema version, theme/language/density/motion, `railCollapsed`, home visibility + counts, folder view/sort/hidden ids, search preferences. |
| `marktab:data:v3` | `chrome.storage.local` | Pins (ordered) and recent visits (deduplicated, capped at 200). |
| `marktab.appearance.v3` | `localStorage` | Paint cache only: the appearance settings `theme-boot.js` needs before the first frame. |
| `marktab.onboarding.v3` | `localStorage` | `dismissed` once the first-run card has been acknowledged. |

- Settings are written under a 6 KiB sync-item budget (`SYNC_ITEM_BUDGET`); hidden folder ids
  are capped at 2000.
- Migration (ADR-009) reads the legacy v1/v2 keys `markTabSettings` and
  `rainbowBookmarkSettings` **once**, maps what it can onto the v3 model (theme, language,
  hidden folders, pins, recents, counts, search engine/template), normalizes everything else
  to defaults, and then **never writes or deletes** the legacy keys. A v2 install therefore
  keeps a working rollback path.
- The service worker runs the same bootstrap on start, so an update migrates state even if the
  user never opens the new tab page; the worker also opens the new tab page once on a fresh
  install.

## Internationalization

Two catalogues with different jobs:

- `public/_locales/{en,zh_CN}/messages.json` — Chrome i18n, used only for the manifest's
  `__MSG_appName__` and `__MSG_appDescription__` (`default_locale: en`).
- `src/locales/en.ts` + `src/locales/zh.ts` — the in-app copy. `en.ts` is the source of truth
  (`MessageKey = keyof typeof en`), and `zh.ts` is typed as `Record<MessageKey, string>`, so a
  missing or misspelled Chinese key fails `npm run typecheck` instead of shipping an English
  string into the Chinese UI. **Adding a message means adding it to both files.**

`currentLocale` resolves `settings.language` (`auto` | `en` | `zh`); `auto` matches the browser
UI language, treating `zh`, `zh-cn`, `zh-hans`, `zh-sg` and `zh-my` as Simplified Chinese.
`t('some.key', { count })` interpolates `{placeholders}`.

## Keyboard

The global map lives in `src/ui/features/app/App.tsx`; the palette's own map lives in
`src/ui/features/palette/CommandPalette.tsx`; the in-app table in **Settings → About** is
generated from the same list this table documents.

| Shortcut | Action |
| --- | --- |
| `Mod+K` | Open or close the command palette. |
| `Escape` | Peel one layer: close the top drawer, menu or dialog; in the palette, clear the query first, then close. |
| `Mod+,` | Open Settings. |
| `Mod+1` / `Mod+2` / `Mod+3` | Jump to Home / Recent / Pinned (ignored while the palette is open). |
| `↑` / `↓` | Move the active palette result (wraps). |
| `Home` / `End` | Jump to the first / last result. |
| `Enter` | Open the active result. |
| `Shift+Enter` | Open the active result in a new tab. |
| `Mod+Enter` | Search the web for the current query with the configured engine. |
| `Mod+C` | Copy the active bookmark's URL. |
| `P` / `R` / `M` | With a bookmark row active: pin/unpin, rename, move. |

The palette's own bindings (`↑`/`↓`, `Home`/`End`, `Enter`, `Shift+Enter`, `Mod+Enter`,
`Mod+C`, `P`/`R`/`M`) only fire while the palette is focused; the rest of the table is global.
`P`/`R`/`M` act on the active row and only once the selection has been moved with the arrow keys,
so ordinary typing never triggers them.
Keycaps render per platform: `Mod` becomes ⌘ on macOS and Ctrl elsewhere, driven by the
`data-platform` attribute written by `theme-boot.js`. Reserved browser chords (⌘L, ⌘T, ⌘W,
⌘N, ⌘R, ⌘D, ⌘⇧T, Tab) are never captured, and `Escape` is never a no-op while a layer is open.

## Release process

A pushed `vX.Y.Z` tag is the release boundary; `package.json` and `public/manifest.json` must
already carry that version (`scripts/release-version.mjs` fails the run otherwise).

```bash
npm run bump -- 3.0.0        # sync every version-bearing file
npm run release:check        # typecheck → tests → build → validate → package
git add -A && git commit -m "release: v3.0.0"
git tag v3.0.0 && git push origin HEAD && git push origin v3.0.0
```

`.github/workflows/release.yml` then checks out the tag, verifies the version, runs tests,
builds, validates, packages `dist/marktab-3.0.0.zip` from `dist/extension` (sorted entries and
a fixed timestamp, so the archive is reproducible and a store diff is meaningful), creates a
**draft** GitHub release, submits to the Chrome Web Store, and only then publishes the draft. A
failure at the store step leaves the draft unpublished; recover with `workflow_dispatch` using
`publish_github_release_only` (Chrome already accepted the submission) instead of re-uploading to
Chrome (ADR-011).

**Chrome only.** MarkTab publishes to the Chrome Web Store and nowhere else. The Microsoft Edge
Add-ons pipeline (the `edge:publish` script, its API client, the `EDGE_*` secrets and the
`release.yml` Edge steps and recovery inputs) was removed; the Edge listing itself still has to
be withdrawn by hand in Partner Center, as
[CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md#microsoft-edge--publishing-retired)
describes.

Repository secrets: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_ITEM_ID`,
`CWS_PUBLISHER_ID`. Store review is asynchronous and must be monitored in the Developer Dashboard.
Per-release notes: [docs/release-log.md](./docs/release-log.md).

## Documentation map

| Document | Content |
| --- | --- |
| [docs/architecture.md](./docs/architecture.md) | Module map, data flow, state ownership, storage schema, search, appearance boot, build/release pipeline, testing. |
| [docs/design-principles.md](./docs/design-principles.md) | The 17 rules behind the interface, plus the keyboard and accessibility checklists. |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Token reference: colour, type, space, radius, elevation, motion, components, responsive contract. |
| [docs/decisions/README.md](./docs/decisions/README.md) | ADR-001 … ADR-018 for the v3 rebuild: framework, layering, visual rules, storage, permissions, shell/breakpoints, key map, tests and search. |
| [AGENTS.md](./AGENTS.md) | Rules for contributors and coding agents. |
| [CHROME_STORE_SUBMISSION.md](./CHROME_STORE_SUBMISSION.md) | Chrome Web Store listing, permission justifications and reviewer test script. |
| [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) | The privacy policy (zh + en). |
| [docs/release-log.md](./docs/release-log.md) | Release history, including the 3.0.0 rebuild. |
| [docs/superpowers/](./docs/superpowers/) | **Historical.** v2-era specs and plans, kept only as a record of how the rewrite was planned; they describe neither the current code nor the current process. |

## Assets and screenshots

`store-assets/` holds the store listing images for both stores: home, folder, palette, pinned,
recent, settings and popup in light, plus home, folder and palette in dark, all at 1280×800
(PNG for upload, JPEG for listings), and the 440×280 promo tile. They are captured from the real
unpacked build by `npm run screenshots` (`scripts/capture-store-assets.mjs`), which seeds a
representative library, drives the interface with the same keys a user would press, and deletes
any file it did not produce — so a stale image cannot survive a recapture. Run it after any
visual change and before a submission; no README previews are embedded.

`cloudflare/marktab-home-worker.js` (+ `wrangler.jsonc`) is a legacy artefact: a standalone
hosted landing page for the project, not part of the extension bundle, not built and not shipped.
Its only guard is `scripts/landing-screenshots.test.mjs`, which runs in `npm run test:scripts`
and fails when a preview image the page links to no longer exists in `store-assets/`, or when the
page starts quoting the retired Edge store again. Deploy it with `wrangler deploy` after
changing it: the test proves the links are right, not that the live Worker was updated.
