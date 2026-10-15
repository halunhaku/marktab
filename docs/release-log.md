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
  with `HTTP 401` before any operation existed — so the Edge submission is still missing and the
  GitHub Release is still a draft. Store review is asynchronous and must be confirmed in both
  dashboards.
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
    `CHROME_STORE_SUBMISSION.md` and `EDGE_STORE_SUBMISSION.md`; the v2-era
    [docs/superpowers/](./superpowers/) specs and plans are kept as historical records.
  - **Screenshots:** `store-assets/` was recaptured from the 3.0.0 build by
    `npm run screenshots`; the inventory and the recapture rule are in
    [CHROME_STORE_SUBMISSION.md](../CHROME_STORE_SUBMISSION.md#screenshots).
