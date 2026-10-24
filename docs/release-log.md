# Release Log

## v1.4.2

- Date: 2026-07-01
- Trigger: pushed `v1.4.2` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v1.4.2`
- Chrome Web Store: version `1.4.2` submitted successfully and currently marked `待审核`
- Validation:
  - `npm test`
  - `npm run validate`
  - `npm run package`
  - `Release` GitHub Actions workflow completed successfully
- Configured repository secrets:
  - `CWS_CLIENT_ID`
  - `CWS_CLIENT_SECRET`
  - `CWS_ITEM_ID`
  - `CWS_REFRESH_TOKEN`
- Notes:
  - This release validated the automated Chrome Web Store publishing flow end-to-end.
  - Chrome Web Store review remains asynchronous and must be monitored in the Developer Dashboard.
  - Follow-up: update deprecated GitHub Actions dependencies noted during the workflow run (`actions/checkout@v4`, `actions/setup-node@v4`).

## v2.0.0

- Date: 2026-07-03
- Trigger: pushed `v2.0.0` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.0`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - Major redesign: home layout "clock anchor variant" (`a51c3c1`), new popup panel, refreshed screenshots.
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v2.0.1

- Date: 2026-07-05
- Trigger: pushed `v2.0.1` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.1`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v2.0.2

- Date: 2026-07-05
- Trigger: pushed `v2.0.2` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.2`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v2.0.3

- Date: 2026-07-09
- Trigger: pushed `v2.0.3` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.3`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v2.0.4

- Date: 2026-07-10
- Trigger: pushed `v2.0.4` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.4`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v2.0.5

- Date: 2026-07-10
- Trigger: pushed `v2.0.5` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.5`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - First release with automated Microsoft Edge Add-ons publishing in the `Release` workflow (`637f2c4`).
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v2.0.6

- Date: 2026-08-03
- Trigger: pushed `v2.0.6` tag on `main`
- GitHub Release: published successfully at `https://github.com/halunhaku/marktab/releases/tag/v2.0.6`
- Validation: `npm test`, `npm run validate`, `npm run package` (all passed)
- Notes:
  - Workflow gained Edge upload resume support (`4fe6e71`); recovery modes: GitHub-only publish and Edge upload resume via `workflow_dispatch`.
  - Chrome Web Store and Edge Add-ons review status not recorded in this repo; confirm in the developer dashboards.

## v3.0.0 — rebuild

- Date: 2026-10-15
- Status: released from `main` (`e72c774`, fast-forwarded from `next-gen`) with the `v3.0.0`
  tag. The `Release` run created the draft GitHub Release with `marktab-3.0.0.zip`
  (92 020 bytes, sha256 `7b55cda1…b9b0a89`, identical to the locally packaged artifact), the
  Chrome Web Store accepted the public review submission, and the Edge Add-ons upload failed
  with `HTTP 401` before any operation existed, which left the GitHub Release as a draft.
  Resolution, 2026-10-20: Chrome review passed, the Edge listing was unpublished, and the draft
  was published from `main` (`8a55050`) — see the 2026-10-20 entry below.
- Recovery: the Edge retry needs refreshed `EDGE_CLIENT_ID` / `EDGE_API_KEY` from Partner Center
  and `workflow_dispatch` with `skip_chrome_web_store`, which skips the Chrome step without
  offering it the same version twice. The mode was added for this failure (`skip_chrome_web_store`
  in `.github/workflows/release.yml`); `publish_github_release_only` remains the last step, once
  both dashboards confirm acceptance.
- Validation: the gate is `npm run release:check` (`typecheck` → `test` (unit + scripts) →
  `build` → `validate` → `package`). On this tree `npm run typecheck`, `npm test`,
  `npm run build` and `npm run validate` pass; `npm run validate` reports an 18-file payload of
  about 236 KiB (JS ~155 KiB, CSS ~56 KiB) with no warnings — the exact byte counts move with
  each rebuild, so treat the file count as the stable fact. `npm run package` produces a
  reproducible `dist/marktab-3.0.0.zip` (18 files, 241 697 bytes uncompressed, 89 KiB on disk)
  with byte-identical output across runs, as
  [docs/architecture.md](./architecture.md#10-release-pipeline) describes.
- Also verified on this tree: `npm run test:e2e` (Playwright against the unpacked build in real
  Chromium) passes, including a 3 000-bookmark performance guard (boot ≈70 ms, search ≈10 ms, no
  long task) and an `axe-core` audit of every surface in both themes. That audit found and fixed
  three real contrast failures — the muted text tier, the accent as text on an accent-soft
  background, and the primary button's white label on `--accent` — plus a WCAG 2.5.3 name
  mismatch on the popup's theme button. The release gate (`release:check`) does not run e2e; CI
  does.
- `npm run screenshots` recaptured every `store-assets/` image from this build.
- Notes:
  - **Full rebuild, not a refactor.** The v2 UI (a single root-level `newtab.js` with a 65 KB
    stylesheet, both keyed to DOM ids) was replaced by a Preact 11 + `@preact/signals`
    application: `src/core/**` (UI-free domain), `src/ui/**` (features, design kit, styles),
    `src/entries/**` (newtab, popup, MV3 service worker), built by Vite 8 into `dist/extension`.
    Every decision is recorded in [docs/decisions/README.md](./decisions/README.md):
    - ADR-001 — Ship Preact + Signals instead of React, Vue or Svelte
    - ADR-002 — A rebuild, not a refactor
    - ADR-003 — Keep the domain core, and keep it UI-free
    - ADR-004 — One accent family, no user-configurable theme colour *(removes the v2 accent selector)*
    - ADR-005 — Sans-serif headings, monospace numerals *(supersedes the v2 serif-heading rule)*
    - ADR-006 — Blur is spent on two surfaces only
    - ADR-007 — Overlays are declared as state, hosted once
    - ADR-008 — Hiding a folder is a preference, never a bookmark operation
    - ADR-009 — Storage schema is additive, migration is one-way and non-destructive
    - ADR-010 — Permissions stay at five, and none of them can read page content
    - ADR-011 — Resilience over cleverness in the release pipeline
  - **Storage:** `marktab:settings:v3` (`storage.sync`) and `marktab:data:v3` (`storage.local`),
    with a `localStorage` paint cache (`marktab.appearance.v3`) and onboarding acknowledgement
    (`marktab.onboarding.v3`). The v1/v2 keys `markTabSettings` and `rainbowBookmarkSettings`
    are read once during migration and are never written or deleted, so upgrading cannot destroy
    existing data.
  - **Permissions unchanged at five** (`bookmarks`, `favicon`, `search`, `storage`, `activeTab`)
    with no host permissions, no optional permissions and no content scripts; `activeTab` is
    used only by the popup's "bookmark the current page" action. The release gate now fails the
    build if the set changes or if any shipped script contains `fetch(`, `XMLHttpRequest`,
    `eval(`, `new Function(`, `document.write(` or an analytics identifier.
  - **Documentation rebuilt for v3**: new [docs/architecture.md](./architecture.md); rewritten
    `README.md`, `AGENTS.md`, `DESIGN_SYSTEM.md`, `PRIVACY_POLICY.md`,
    `CHROME_STORE_SUBMISSION.md` and the now-retired Edge guide; the v2-era
    [docs/superpowers/](./superpowers/) specs and plans are kept as historical records.
  - **Screenshots:** `store-assets/` was recaptured from the 3.0.0 build by
    `npm run screenshots`; the inventory and the recapture rule are in
    [CHROME_STORE_SUBMISSION.md](../CHROME_STORE_SUBMISSION.md#screenshots).

## 2026-10-20 — Edge publishing retired (no release cut)

- Date: 2026-10-20
- Status: repository change only; no tag, no version bump, no store submission. Chrome Web Store
  publishing is unchanged.
- What changed (Chrome Web Store is now the only store):
  - Deleted `scripts/edge-publish.mjs`, `scripts/edge-api.mjs` and their tests, and the
    `EDGE_STORE_SUBMISSION.md` guide.
  - Removed `npm run edge:publish` from `package.json`, along with the Edge description.
  - `.github/workflows/release.yml` no longer has the Edge submission step, the Edge upload
    resume step, or the two Edge-only `workflow_dispatch` recovery inputs. The remaining
    recovery mode is `publish_github_release_only`.
  - `scripts/release-workflow.test.mjs` now asserts the Edge path stays gone (missing scripts,
    missing npm script, no `EDGE_*` secrets or Edge inputs in the workflow) instead of asserting
    its behaviour.
  - Docs follow the code: `README.md`, `AGENTS.md` (new *Release scope* rule),
    `PRIVACY_POLICY.md`, `CHROME_STORE_SUBMISSION.md` (new *Microsoft Edge — publishing retired*
    section), `docs/architecture.md`, ADR-011, the landing-page worker and the screenshot-script
    comment now describe a Chrome-only product.
- Why: the 3.0.0 Edge upload failed with `HTTP 401`, needed refreshed Partner Center credentials
  and two extra recovery modes in `release.yml`, and doubled the release's failure surface for no
  product benefit. The extension is MV3 and still installs in Chromium-based browsers, but it
  ships to one store.
- Historical entries below are left as written; the v2/v3.0.0 notes that describe Edge uploads
  record what happened at the time.
- **Release hygiene, same day:**
  - `.github/workflows/release.yml` could not publish a draft at all on the
    `publish_github_release_only` path: recovery skips every checkout, so `gh` had no `.git`
    to infer the repository from and failed with `fatal: not a git repository`. Both the draft
    check and the edit now pass `--repo "$GITHUB_REPOSITORY"` (`14ae579`), covered by
    `scripts/release-workflow.test.mjs`.
  - The draft GitHub Release `v3.0.0` was published at 2026-10-20T01:37:07Z by
    `workflow_dispatch` + `publish_github_release_only`, after Chrome review passed. The asset
    is the same `marktab-3.0.0.zip` Chrome approved; the Chrome Web Store was not contacted.
  - The landing-page worker's preview images pointed at a `screenshots/` folder that does not
    exist, so all seven (including `og:image`) returned 404; they now use the tracked
    `store-assets/` captures (`8a55050`). The worker still needs a `wrangler deploy` to serve
    the new HTML.
- **Manual steps completed (2026-10-20), by the maintainer:**
  1. MarkTab was **unpublished** from the Microsoft Edge Add-ons store via Partner Center, so the
     item's state is *Unavailable in store → Unpublished from store*: not downloadable by new
     users, existing installs keep working but receive no further updates. No permanent deletion
     was offered or needed; the item stays in the dashboard as an archive.
  2. The `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID` and `EDGE_API_KEY` repository secrets were deleted
     from GitHub → Settings → Secrets and variables → Actions.
  - Background, and why *Hidden* was not used: Microsoft documents *Hidden* as a visibility
    setting that leaves the extension on the store, searchable by direct URL and still updatable,
    while *Unpublish* is the only state that withdraws it
    ([submission states](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/submission-states)).
    The operational notes live in
    [CHROME_STORE_SUBMISSION.md](../CHROME_STORE_SUBMISSION.md#microsoft-edge--publishing-retired).

## v3.1.0 — paper visuals and motion

- Date: 2026-10-24
- Status: release candidate, not tagged and not uploaded. The paper redesign is on `main`
  (`a8336de`); this entry records the version bump, the recaptured store assets and the release
  gate on the bumped tree. Tagging, the GitHub Release, the Chrome Web Store upload and the
  landing-page `wrangler deploy` are still manual steps.
- Validation (this tree, `npm run release:check`):
  - `npm run typecheck` — passed.
  - `npm test` — passed: 323 unit tests in 16 files (vitest), 85 script tests
    (`node --test scripts/*.test.mjs`), no failures or skips.
  - `npm run build` — passed; the Vite build still warns that `theme-boot.js` is a classic
    script, which is deliberate (it runs before the module graph).
  - `npm run validate` — `Release validation passed.` Runtime payload 239.1 KiB (JS 159.9 KiB,
    CSS 55.1 KiB) across 18 files; five permissions, empty host/optional permissions, no content
    scripts and no remote-code patterns.
  - `npm run package` — `dist/marktab-3.1.0.zip`, 18 files, 244 792 bytes uncompressed,
    92 665 bytes on disk, sha256 `386286a2f29f29f2b2d2ac63cc259051eb090e393d18bab27c37d9577094c982`.
  - `npm run test:e2e` — 40/40 passed in 54.8 s against the unpacked `dist/extension` in real
    Chromium, including the `axe-core` audit of every surface in both themes and the 3 000-bookmark
    guard (boot 53 ms, search 9 ms, no long task). `release:check` does not run it; CI does.
- `npm run screenshots` recaptured all 22 `store-assets/` files (11 PNG + 11 JPEG) from this
  build: seven 1280×800 surfaces in light and dark, the composed popup sheet at 1280×800 and the
  440×280 promo tile. File names, formats and dimensions are unchanged, so
  `SCREENSHOT_ASSETS` in the landing-page worker and `scripts/landing-screenshots.test.mjs`
  needed no edit.
- Version: `npm run bump -- 3.1.0` wrote `package.json`, `public/manifest.json`, `README.md`,
  `CHROME_STORE_SUBMISSION.md` and the landing worker's `FALLBACK_VERSION` (which still said
  `2.1.1`, so the landing page would have advertised a version two releases behind); the script
  does not touch `package-lock.json`, so `npm install --package-lock-only` synced its root
  version. Two manual follow-ups the script cannot do: the submission guide's headline said
  3.0.0 and now says 3.1.0, and `public/manifest.json` was re-serialized with its `permissions`
  array expanded — restored to one line so the manifest diff is the version field alone.
- Notes:
  - **The capture tool no longer carries a palette.** `scripts/capture-store-assets.mjs` reads
    the paper tokens out of the built stylesheet (`dist/extension/assets/*.css`) and follows
    `var()` aliases to their final values, so the composed popup canvas and the promo tile are
    painted from `src/ui/styles/tokens.css` as shipped. The previous template hard-coded the
    retired blue, two radial gradients and a drop shadow; all three are gone — the canvas is
    `--canvas`, the popup sheet is separated by a `--border-1` hairline at `--radius-xl`, and the
    tile's wordmark is the local serif. A token missing from the build now fails the run instead
    of falling back to a stale colour.
  - **Product code is untouched.** No `src/**`, `tests/**`, permission, manifest field (beyond
    `version`), privacy or dependency change; `npm ci` reproduced the lock file.
  - **Still manual:** `wrangler deploy` for `cloudflare/marktab-home-worker.js` (it currently
    serves the previous version as its fallback), and the store upload of
    `dist/marktab-3.1.0.zip`. The landing page reads its preview images from `main`, so the
    recaptured screenshots only appear once this branch lands on `main`.
