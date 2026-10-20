# MarkTab Agent Guide

MarkTab is a Chrome Manifest V3 new tab extension that turns the browser's own bookmark tree
into a searchable, keyboard-first dashboard. Keep it small, fast, private and easy to review for
store submission. This file is the contract for anyone — human or agent — changing the
repository.

Current shape: **Preact 11 + `@preact/signals`, Vite 8, TypeScript (strict), CSS Modules**,
MV3, version `3.0.0`. Sources live in `src/**`; **nothing** in this repo ships as a bare
`<script>` from the repository root.

## Product boundaries

- **Single purpose:** a bookmark surface for the new tab page. Do not add unrelated features
  (notes, weather, RSS, page analytics, dashboards).
- **Local only:** never send bookmark titles, URLs, folder names, favicon domains, search
  terms or settings to a developer-owned service. The extension must make no network request
  of its own.
- **No remote code, ever:** no remote scripts, no remote stylesheets, no remotely fetched
  configuration, no `eval`, no `new Function`, no `document.write`. MV3 forbids it, and the
  release gate (`scripts/validate-release.mjs`) fails the build for it.
- **Never mutate the user's bookmarks implicitly.** Hiding a folder is a preference
  (ADR-008); renaming, moving and deleting happen only from an explicit user action, and every
  destructive action offers undo.
- If web search behaviour changes, state the data flow plainly: the query leaves for the
  search engine the user configured in the browser.

## Extension rules

- Maintain MV3 compatibility. The manifest is `public/manifest.json` (Vite copies it verbatim
  into `dist/extension`); there is no second manifest to keep in sync.
- **Permissions stay exactly `bookmarks`, `favicon`, `search`, `storage`, `activeTab`.** No
  `host_permissions`, no `optional_permissions`, no content scripts, no `tabs` permission.
  `activeTab` is only for the user-triggered "bookmark the current page" popup action.
- Adding a permission is a product decision, not an implementation detail: it requires an ADR
  in `docs/decisions/README.md`, and an update to the permission table in `README.md`,
  `PRIVACY_POLICY.md`, `CHROME_STORE_SUBMISSION.md` and `AGENTS.md` (this file).
- `scripts/validate-release.mjs` enforces exactly five permissions, an empty
  `host_permissions`/`optional_permissions`, no `content_scripts`, no permissive
  `content_security_policy.extension_pages` (the manifest declares no CSP, so MV3's default
  `script-src 'self'` applies), the three entry names (`chrome_url_overrides.newtab`,
  `action.default_popup`, `background.service_worker`, the last one a module), the manifest
  version matching `package.json`, and the required runtime files (including `theme-boot.js` and
  both `_locales` catalogues).
- Scripts stay in external files. No inline `<script>`, no inline event handlers (`onclick=`),
  no `javascript:` URLs; the validator rejects them in the built HTML.
- Package only runtime files: `manifest.json`, HTML, CSS, JS, `_locales/`, icons. No source
  maps, no `.ts`/`.tsx`, no Markdown inside the bundle.

## Code layout

- `src/core/**` is the UI-free domain: `platform/` (thin `chrome.*` wrappers), `bookmarks/`,
  `settings/`, `userdata/`, `state/`, `appearance.ts`, `util/`.
  **Core must never import from `src/ui/**`, must render nothing, and is the only layer allowed
  to touch `chrome.*`** (via `platform/`) — ADR-003. It is shared by the new tab page, the popup
  and the service worker, which has no DOM at all.
  A handful of core functions legitimately need a global: the appearance paint cache
  (`localStorage`), `openUrl`/`copyText` and `openBookmarkManager` (`window`/`document`). Each
  guards itself with a `typeof … !== 'undefined'` check. Do not add more, and never use them for
  layout or rendering — if UI code imports `core/platform/chrome`, that is a bug.
- `src/ui/**` is the app: `features/` (one folder per surface), `components/` (the design kit),
  `hooks/`, `actions/`, `state/` (routing, overlays, toasts, onboarding), `styles/`.
- `src/entries/**` are the three thin entry points (`newtab`, `popup`, `background`). Entry
  files mount and nothing else.
- Import through the `@/*` alias, which maps to `src/*` in `vite.config.ts`, `vitest.config.ts`
  and `tsconfig.json`. Keep the three in sync if it ever changes.
- Styling is **CSS Modules plus the tokens in `src/ui/styles/tokens.css`**. Component styles
  live beside their component as `*.module.css`; class names are camelCase (`localsConvention:
  'camelCaseOnly'`), so a class named `.itemRow` is read as `styles.itemRow`.
- **Never hard-code a colour, size, radius, duration or easing.** Read the token. If no token
  fits, add one to `tokens.css` and document it in `DESIGN_SYSTEM.md`.
- Do not introduce a second accent family, a theme-colour picker, serif headings, or
  `backdrop-filter` outside the two permitted surfaces (rail and palette scrim) — ADR-004,
  ADR-005 and ADR-006.
- The shell stays a rail plus one content column (ADR-012), and the rail keeps exactly one
  breakpoint: `(max-width: 1200px)`, written once in `App.module.css` and mirrored by
  `DRAWER_QUERY` in `App.tsx` (ADR-013). Adding a second breakpoint needs a reason.
- Framework and dependency budget: Preact and `@preact/signals` are the only runtime
  dependencies. Adding another needs a reason a maintainer will still accept in six months;
  every kilobyte is a cold start on a page that opens with every new tab.

## State and storage

- Storage keys are fixed: `marktab:settings:v3` (`chrome.storage.sync`),
  `marktab:data:v3` (`chrome.storage.local`), plus the two `localStorage` paint/acknowledgement
  keys `marktab.appearance.v3` and `marktab.onboarding.v3`.
- The schema is additive and migration is one-way and non-destructive (ADR-009). The legacy
  keys `markTabSettings` and `rainbowBookmarkSettings` are read once and **never written or
  deleted** — do not "clean them up".
- Views read signals; only stores mutate them. `src/core/state/signals.ts` is the read-side
  barrel precisely so that consumers do not import the write-side stores.
- Settings live in `storage.sync` under a 6 KiB per-item budget; anything unbounded (recent
  visits, hidden folders) must be capped before it is written.
- Overlays (menus, dialogs) are declared as state and hosted once near the root (ADR-007) —
  never rendered inline next to a trigger.

## Internationalization

- `src/locales/en.ts` is the source of truth: `MessageKey = keyof typeof en`. `src/locales/zh.ts`
  is typed `MessageDict = Record<MessageKey, string>`.
- **Every user-visible string goes through `t()` and exists in both catalogues.** Parity is a
  hard requirement — a missing Chinese key must fail `npm run typecheck`, not ship as English
  text into the Chinese UI.
- `public/_locales/{en,zh_CN}/messages.json` exists only for the manifest's
  `__MSG_appName__` / `__MSG_appDescription__` fields and must keep both keys.
- The product name `MarkTab` is a proper noun and is not translated.

## UI expectations

- A new tab must feel instant: the palette filters from the in-memory index, never from
  `chrome.bookmarks.*` per keystroke, and every keystroke-driven response paints in under
  100 ms (principle 1).
- Keyboard and mouse are peers. Everything clickable is reachable from the keyboard, and any
  control with a shortcut shows it (principle 2, 10). The global map is `Mod+K`, `Mod+,`,
  `Mod+1/2/3` and `Escape`; never capture ⌘L/⌘T/⌘W/⌘N/⌘R/⌘D/⌘⇧T or Tab (principle 9).
- Accessibility is not optional: focus is always visible, composites are one Tab stop with
  roving `tabindex`, the palette is an `aria-activedescendant` combobox, dialogs own initial
  focus, the Tab ring, Escape and focus restoration, asynchronous results are announced
  politely, and `--dur-*` tokens zero out under reduced motion (principles 3, 5, 6, 8, 12, 13).
- Icon-only buttons carry an accessible name. Interactive targets are at least 24×24 CSS px,
  aiming at the 34–40 px control tokens (principle 16).
- Empty, loading, no-result and error states are compact and share the design kit; loading must
  not shift the layout (principle 15).
- Large libraries stay bounded: render a windowed set and reveal more incrementally
  (principle 17).
- Any visibility or hiding feature must offer a one-step way back (unhide folder, restore from
  the empty state, undo in the toast).

## Verification and release

- Before you claim a change works, run: `npm run typecheck && npm test`.
- **Before any release: `npm run release:check`** — that is `typecheck && test && build &&
  validate && package`, and it is the same sequence the release workflow runs. `npm run
  validate` alone validates the *built* tree, so `npm run build` must have run first. This
  gate does not run the end-to-end suite (CI does): run `npm run test:e2e` yourself for
  anything that touches a view, a shortcut, storage or the migration path.
- **After any visual change: `npm run build && npm run screenshots`** and commit
  `store-assets/`. The script drives the real build and deletes any image it did not
  produce, so a stale screenshot cannot survive a recapture.
- Add or update unit tests under `tests/unit/**` for domain behaviour (indexing, search
  ranking, URL/time utilities, settings migration). Accessibility is not a review step: `tests/e2e/a11y.spec.ts` runs `axe-core` over every surface in both themes and fails on any WCAG A/AA violation, so a token change that lowers contrast fails CI. Use `tests/e2e/**` (Playwright, real
  Chromium, unpacked `dist/extension`) only for behaviour that happy-dom cannot observe.
  There are no UI component tests by design — the layering is ADR-017: unit for pure logic,
  `node --test` for the release tooling, Playwright for the behaviour that only exists in a
  real browser.
- Before uploading, load the unpacked build from `dist/extension` and exercise: new tab paint,
  palette search, pin/unpin, hidden-folder recovery, theme switch, popup stats, and "bookmark
  the current page".
- Keep privacy claims identical across code, `README.md`, `PRIVACY_POLICY.md` and the store
  submission notes. The validator warns when a document stops mentioning a permission.
- Version bumps go through `npm run bump -- X.Y.Z`; never hand-edit one version file. The
  shipped manifest is `public/manifest.json`, and `scripts/release-version.mjs` requires
  `package.json`, that manifest and the release tag to agree.

## Release scope

- **The Chrome Web Store is the only store MarkTab publishes to.** Do not add a second store
  publisher, a second set of store credentials or a second branch in `release.yml`: the
  Microsoft Edge Add-ons pipeline was deliberately removed, and
  `scripts/release-workflow.test.mjs` fails if its scripts, secrets or `workflow_dispatch`
  inputs come back. `CHROME_STORE_SUBMISSION.md` explains why and what a human still has to do
  in Partner Center. The extension still installs in Chromium-based browsers, but "it works in
  Edge" is not a reason to resurrect the Edge publisher.
