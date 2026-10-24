# Architecture decisions

MarkTab 3 was rebuilt from the product definition up. Every entry below records a
decision that a future maintainer would otherwise have to reverse-engineer, with
the alternative that was considered and why it lost. Earlier decisions that were
superseded are kept with an explicit **Superseded by** line rather than deleted.

---

## ADR-001 — Ship Preact + Signals instead of React, Vue or Svelte

**Status:** accepted (2026-10)

**Context.** The new tab page is a cold-start-critical surface: Chrome creates it
on every new tab, and the first paint happens while the user is already deciding
where to go. The v2 implementation was a 58 KB hand-written `newtab.js` that
rebuilt its DOM imperatively; it worked but had no component model, no types and no
testable seams.

**Decision.** Preact 11 with `@preact/signals`, bundled by Vite 8.

**Alternatives.**
- *React 19* — familiar, but the runtime plus `react-dom` costs roughly 45 KB gzip
  before a single component renders, and reconciliation of a 5 000-row folder list
  needs manual virtualisation anyway.
- *Vue 3* — similar bundle cost to React, and its SFC tooling adds a second
  language (template DSL) inside a codebase that is otherwise plain TypeScript.
- *Svelte 5* — smallest runtime of the four, but the compiler's runes are close
  enough in spirit to signals that the win is small, while its ecosystem is thinner
  for the low-level, non-UI work this project is mostly made of (a search index, a
  storage migration, a bookmark tree).

**Consequences.** Components are functions returning VNodes; state is signals, so
reading `settings.value` inside a component subscribes it and no manual
`useMemo`/dependency arrays are needed for derived data. The whole UI layer is plain
TypeScript, which is what makes the core testable in `happy-dom` without a browser.

---

## ADR-002 — A rebuild, not a refactor

**Status:** accepted (2026-10)

**Context.** The v2 extension had a working data model but its UI layer was a single
58 KB script paired with a 65 KB stylesheet, both keyed to DOM ids. Adding the
product's core interaction (a command palette over every bookmark) would have meant
threading new global state through the same script.

**Decision.** Keep the domain problems that were already solved well — bookmark
indexing, search ranking, settings normalisation, legacy migration — and rebuild
everything else: routing, state, components, styles, build, tests, release tooling.

**Consequences.** The v2 runtime files (`newtab.js`, `styles.css`, `popup.js`, the
root `manifest.json`, the root `_locales`) are deleted rather than kept alongside.
The previous implementation remains recoverable from git history and from the
`v2.1.1` tag, which the release workflow never rewrites.

---

## ADR-003 — Keep the domain core, and keep it UI-free

**Status:** accepted (2026-10)

**Context.** `src/core/**` (bookmark index, fuzzy search, settings + migration,
recent/pin store, i18n, browser API wrappers) was written for the rebuild before the
UI existed, and it is the part of the codebase with the most logic per line.

**Decision.** The core stays as the single source of truth for behaviour, keeps
zero imports from `src/ui/**`, and is the only layer allowed to touch `chrome.*`
(through `core/platform`). `src/ui/**` reads core signals and calls core commands.

**Consequences.** Core can be unit-tested with a fake `chrome` object and no DOM;
UI code cannot smuggle browser APIs in. The rule is enforceable by a lint-free
convention: if a file under `src/ui/**` imports from `core/platform/chrome`, it is
a bug.

---

## ADR-004 — One accent family, no user-configurable theme colour

**Status:** accepted (2026-10) — the rule stands, the colour is superseded by
[ADR-022](#adr-022--a-single-ochre-accent-family-no-user-configurable-colour)

**Context.** v2 shipped an accent-colour selector. It multiplied every visual state
by N themes, and it was the most common source of unreadable combinations.

**Decision.** Exactly one accent family (`#5b6cff` light / `#7aa2ff` dark) plus a
light/dark/system switch. Density (comfortable/compact) and motion
(system/reduced/full) are separate axes because they change information density and
comfort rather than hue.

**Consequences.** Every component can assume one contrast pair for interactive
surfaces; the accent is also the only saturated colour in the UI, which is what
gives the interface its calm reading. The accent is not exposed in settings, and a
future contribution adding one would have to justify re-testing the whole token
matrix.

---

## ADR-005 — Sans-serif headings, monospace numerals

**Status:** superseded by [ADR-023](#adr-023--a-local-serif-for-the-greeting-and-a-pages-own-title)
(2026-10); the monospace-numerals half still stands and is restated there

**Context.** The v2 design system paired a serif display face with sans body text.
That pairing reads as editorial, and it fights the product's actual tone: a
keyboard-first tool that renders mixed English/Chinese bookmark titles.

**Decision.** One sans stack for all text (system UI fonts per platform, with
PingFang SC / Microsoft YaHei / Noto Sans SC for CJK), and `--font-mono` for
counts, dates, hosts and clocks.

**Consequences.** Hierarchy now comes from weight and tracking rather than from a
second family, which keeps Latin and CJK on the same baseline grid. No web fonts
are downloaded — an offline extension must not depend on a font CDN, and a FOUT on
every new tab would be worse than any typographic nicety.

---

## ADR-006 — Blur is spent on two surfaces only

**Status:** superseded by [ADR-024](#adr-024--zero-blur-and-opacity-only-motion) (2026-10):
the paper language has no blur budget at all

**Context.** `backdrop-filter` is the most expensive thing a page can put in a
composited layer, and on a new tab page it runs while the index is still building.

**Decision.** Blur is allowed on exactly two surfaces: the navigation rail and the
overlay scrim (command palette, dialog). All other translucency is plain
`rgb(... / a)` over an opaque canvas.

**Consequences.** Scrolling a folder never blurs live content behind it. The rule is
checkable by grepping for `backdrop-filter` — the count is expected to stay at 2.

---

## ADR-007 — Overlays are declared as state, hosted once

**Status:** accepted (2026-10)

**Context.** Context menus and dialogs are usually rendered next to their trigger.
That breaks here: bookmark cards lift on hover (`transform`), and a transformed
ancestor makes `position: fixed` behave like `position: absolute`.

**Decision.** Menus and dialogs are values in `src/ui/state/overlay.ts` signals; a
single `MenuHost` / `DialogHost` at the application root renders them.

**Consequences.** One focus trap, one Escape handler and one outside-click listener
instead of one per trigger; a menu opened from the palette or a folder row is
identical. The cost is that a menu action must be expressible as data (label, icon,
handler) rather than arbitrary JSX — which is also what makes the menu testable.

---

## ADR-008 — Hiding a folder is a preference, never a bookmark operation

**Status:** accepted (2026-10)

**Context.** Large libraries contain folders a user never wants to see on the new
tab (archive, imports, work projects). Deleting them is not acceptable: the
bookmarks are the user's data and the browser's own UI is the place to manage them.

**Decision.** Hiding writes the folder id into `settings.folders.hiddenIds` (which
also hides the subtree, and lives in the synced settings object) and the toast
carries an immediate Undo. Settings exposes the full list with a "show again" action
per entry.

**Consequences.** Every bookmark survives, hiding syncs across devices, and there is
always a reachable recovery path. The hidden list is the only setting that can grow
without bound, so `pruneForSync` trims it to stay inside the 8 KB per-item
`storage.sync` quota.

---

## ADR-009 — Storage schema is additive, migration is one-way and non-destructive

**Status:** accepted (2026-10)

**Context.** v2 stored state under `markTabSettings` and `rainbowBookmarkSettings`;
v3 stores `marktab:settings:v3` (sync) and `marktab:data:v3` (local).

**Decision.** `bootstrapState()` reads the legacy keys, maps them onto the v3 model
once, and writes only the v3 keys. Legacy keys are never written, never rewritten and
never deleted. `loadUserData` and `normalizeSettings` accept unknown or partial
payloads and normalise rather than throw.

**Consequences.** A user who downgrades to v2.1.1 gets their pins and history back
untouched. Migration is idempotent (a second call returns the cached result), and it
runs in the service worker as well as in the page, so it completes even for users who
never open the new tab.

---

## ADR-010 — Permissions stay at five, and none of them can read page content

**Status:** accepted (2026-10)

**Context.** The obvious way to support "bookmark the page I was just on" from the
new tab page is the `tabs` permission, which exposes the URL of every open tab.

**Decision.** Keep `bookmarks`, `favicon`, `search`, `storage`, `activeTab`. The
"bookmark this page" action exists only in the popup, where `activeTab` grants
exactly one tab after an explicit user invocation. `host_permissions` and
`content_scripts` stay empty, and `scripts/validate-release.mjs` fails the build if
that changes.

**Consequences.** MarkTab cannot read page content, cannot see browsing history and
cannot inject anything. The trade-off is deliberate: the new tab page does not offer
"bookmark the last tab", because supporting it would cost a permission that
contradicts the privacy claim on the store listing.

---

## ADR-011 — Resilience over cleverness in the release pipeline

**Status:** accepted (2026-10)

**Context.** A release is published to a store with human review on the other side. v2 had a
draft-based flow that could leave a half-published release if the store rejected the upload.

**Decision.** Keep the v2 flow's shape — tag → verify version → test → **build** → validate →
package → create/refresh a draft GitHub release → publish to the Chrome Web Store → only then
flip the GitHub release out of draft — and add the build step that v3 requires. `npm run
validate` and `npm run package` run against `dist/extension`, the exact tree that was built, and
the zip is reproducible (`SOURCE_DATE_EPOCH`, sorted entries) so a store diff is meaningful.
The Chrome Web Store is the only store in the pipeline: the Edge Add-ons publisher, its API
client, its secrets and its two recovery inputs were removed from the repository, because a
second store doubled the failure surface for a product that only needs one listing
(`CHROME_STORE_SUBMISSION.md#microsoft-edge--publishing-retired`).

**Consequences.** A failure at the store step leaves the GitHub release as a draft; recovering
means re-running the tag with `publish_github_release_only` (Chrome already accepted the
submission) instead of re-uploading to Chrome. No path exists that publishes a GitHub release
for a build the store has not accepted.

---

## ADR-012 — The shell is a rail plus one content column, and nothing else

**Status:** accepted (2026-10)

**Context.** The new tab page competes with the browser's own chrome for vertical
space: every band above the bookmark list is a band the list does not get. Navigation
(home / recent / pinned / folders), the settings entry point and the library counters
all need a home, and the v2 markup (recoverable from the `v2.1.1` tag) repeated its
chrome per view: a home view with a `home-sidebar`, a folder view with a
`folder-sidebar` and a `folder-toolbar`, each written out separately.

**Decision.** `src/ui/features/app/App.module.css` declares exactly two areas —
`grid-template-columns: var(--rail-w) minmax(0, 1fr)` with
`grid-template-areas: 'rail content'` — and the file header states the rule: "Two
areas, and only two: the navigation rail and the content column." `App.tsx` builds the
rail's contents (`navItems`, `folderItems`, and a `footer` holding the library counters
and the settings `IconButton`) and renders a single `main` whose `inner` div switches
on the route (`RecentView`, `PinnedView`, `SettingsView`, `FolderView`, `HomeView`).
Nothing else is shell chrome: everything that is not the rail or the content column is
an overlay mounted once at the root (`CommandPalette`, `MenuHost`, `DialogHost`,
`ToastHost`) per ADR-007. A view may still own a toolbar *inside* the content column —
`FolderView.tsx` renders `FolderToolbar` for filter, sort, view and visibility — but
that toolbar belongs to the view, not to the shell.

**Alternatives.**
- *A global topbar (product name, view tabs, search field) above the content* — the
  conventional answer, and close to what v2 already had with its `search-bar`; it costs
  a fixed band of height on every route, and its search field would duplicate the
  palette, which runs the same query against the same index behind `Mod+K`.
- *Move navigation into a topbar and drop the rail* — cheapest in vertical space, but
  the folder list is an unbounded tree and no horizontal strip expresses depth; the
  rail's scrollable folder section is where that tree lives.
- *Rail on the folder view only, topbar everywhere else* — two navigation models for
  the same five destinations, and the folder tree would remount on every route change.

**Consequences.** Content gets the full height, and every global control has exactly one
home, so the "one always-visible navigation surface" claim in `docs/design-principles.md`
is a property of the stylesheet rather than a convention. The shell also stays static
while views change: nothing in `App.tsx` re-renders because a view's data changed, which
is why the overlay hosts are siblings of the content column instead of children of a
route. The cost is that a future global control has nowhere to go but the rail footer,
where space is already tight.
---

## ADR-013 — One breakpoint at 1200px: collapsible rail above, transient drawer below

**Status:** accepted (2026-10)

**Context.** The expanded rail is 252 px (`--rail-w` in `src/ui/styles/tokens.css`).
Below some viewport width that stops being affordable, and the two ways to give the
space back are not equivalent: collapsing to icons keeps navigation one click away,
while hiding the rail makes it a modal surface with the focus and dismissal behaviour
that implies.

**Decision.** A single breakpoint, deliberately mirrored in both layers:
`DRAWER_QUERY = '(max-width: 1200px)'` in `App.tsx` ("Must match the drawer media query
in `App.module.css`") and `@media (max-width: 1200px)` in `App.module.css`, with
`useMediaQuery` as the only JS reader of it. Above the breakpoint the rail collapses to
icons: `toggleRail` writes `settings.railCollapsed` (synced, and migrated from v2's
`sidebarCollapsed` in `src/core/settings/migrate.ts`), the shell swaps `--rail-w` for
`--rail-w-rail` (68 px), and the collapsed class is applied only when
`collapsed && !isDrawer`. At or below it the same rail becomes an overlay drawer:
`.railSlot` turns `position: fixed` and off-canvas (`translateX(-102%)`), `.drawerOpen`
slides it back in over a scrim that closes it on click, a fixed `drawerToggle` button
opens it, and `toggleRail` flips the local `drawerOpen` signal instead of touching
settings. Drawer state is never persisted and never outlives its context: an effect
closes it on route change and when `narrow` flips, and while the drawer is open it owns
the screen (`.drawerOpen .drawerToggle { visibility: hidden }`). Only the content
padding changes at 768 px.

**Alternatives.**
- *Icon-only collapse at every width, no drawer* — one mechanism instead of two, but at
  375 px an icon rail still costs 68 px and hides the folder names, which are the only
  reason to show folders at all.
- *A CSS-only drawer (checkbox hack or `:has()`), keeping the breakpoint in one file* —
  the CSS is easy, the behaviour is not: navigating from the drawer must close it, and
  the same button must either persist a setting or flip ephemeral state, so JS needs the
  breakpoint anyway.
- *Persisting the drawer's open state* — a drawer that is open on load covers the content
  the user came for, and a synced flag would open it on a wider device than the one it
  was set on.
- *Two different breakpoints for the two transitions* — more states to test (including
  the width where both apply) for no product reason.

**Consequences.** Exactly one width changes the rail's character, and "collapsed" and
"drawer" are mutually exclusive by construction rather than by convention. The price is
a JS/CSS pair that must agree; a mismatch would leave the toggle writing `railCollapsed`
into settings while the shell renders a drawer, which is why the constant and the media
query carry mutual-reference comments.
---

## ADR-014 — The global key map lives in `App`, while the palette owns its own combobox keys

**Status:** accepted (2026-10)

**Context.** Keyboard is the primary way into this product, so chords have to work
wherever focus happens to be — in a dialog, in a folder filter field, in the palette's
input, or on nothing at all. The characteristic failure is a chord that fires twice, or
fires in the wrong layer.

**Decision.** One `keydown` listener on `window`, installed by the effect in `App.tsx`
whose comment declares the ownership: "Global key map. Everything documented in
Settings → Keyboard lives here." It owns `Escape` with a fixed cascade (close the
drawer, then `closePalette()`, then `closeMenu()`, then `closeDialog()`), `Mod+K`
(close the palette if open, otherwise open it), and the section jumps `Mod+,`, `Mod+1`,
`Mod+2`, `Mod+3`. That set is exactly the table rendered by
`src/ui/features/settings/AboutSection.tsx` (`SHORTCUTS`), so the documentation cannot
drift from the handler without an edit in both files. Surfaces that need keys of their
own handle them locally and stop the event before it can reach that map — `Menu.tsx`,
`Dialog.tsx` and `FolderView.tsx`'s filter escape each call `stopPropagation()` — and
the palette owns the combobox keys that only make sense while it is open: `ArrowUp` /
`ArrowDown`, `Home` / `End`, `Enter`, `Shift+Enter`, `Mod+Enter`, from a `document`
listener bound to its `role="combobox"` field and `role="listbox"` result list, with
`aria-activedescendant` tracking the selection. `App` then delegates explicitly: it
returns early for the section jumps while `paletteOpen.value` is true ("Section jumps
stay out of the way of the palette's own Enter/typing"), keeping only `Mod+K` for
itself.

**Alternatives.**
- *One central shortcut registry consulted by every surface* — the tidy-sounding option,
  and wrong for contextual chords: `Mod+Enter` means "open the selected row in a new tab"
  for a selected row and "search the web with this query" for a raw one, a decision that
  belongs with the result model in `CommandPalette.tsx` (`runWebSearch`), not in a global
  table.
- *Handle everything in `App`, including palette navigation* — would move selection index
  and row identity into the application root and make the palette unusable — and
  untestable — in isolation.
- *Let each overlay own its own `Escape` and drop the global cascade* — the drawer is
  shell state with no component of its own, so the cascade has to live where the drawer
  does; splitting it across surfaces also loses the defined order between palette, menu
  and dialog.

**Consequences.** From the file being edited you can predict where a chord is handled,
and adding a global shortcut means one handler edit plus one `SHORTCUTS` row. The
dependency runs one way on purpose: the global map knows the palette exists
(`paletteOpen`, `inPalette`), while the palette knows nothing about routes. The cost is
two `stopPropagation` boundaries to keep honest, which is why both files comment on
where the map ends.
---

## ADR-015 — The first-run acknowledgement lives in `localStorage`, not in synced settings

**Status:** accepted (2026-10)

**Context.** The welcome card is only for an empty library: `HomeView.tsx` gates it on
`status === 'ready' && !onboardingDismissed.value && pinnedItems.value.length === 0 &&
recentItems.value.length === 0`. Dismissing it has to survive a reload, and the v3
settings object is a synced, normalised, migrated schema (ADR-009) whose shape is the
contract with MarkTab 2.x.

**Decision.** Keep the acknowledgement out of `chrome.storage` altogether:
`src/ui/state/onboarding.ts` stores the plain string `'dismissed'` under
`ONBOARDING_KEY = 'marktab.onboarding.v3'` in `localStorage`, behind an
`onboardingDismissed` signal, a `dismissOnboarding()` command and a
`resetOnboardingForTests()` seam. Every access is wrapped in `try`/`catch`, so storage
being unavailable costs a repeated card rather than a broken page. The module header
states the reason: it is a device-local acknowledgement, not a user preference, and
keeping it out of the synced object is what keeps the storage schema exactly as migrated
from 2.x, with nothing extra to migrate or repair.

**Alternatives.**
- *A boolean in `settings`* — syncs, which is the opposite of what this state means:
  dismissing the card on one machine would hide it on a machine the user has only just
  installed, and the field would then be carried by `normalizeSettings`,
  `prepareForWrite` and the legacy migration forever.
- *`chrome.storage.local`* — the technically correct tier, but it costs the storage
  wrapper, an awaited read on the boot path and a key inside `marktab:data:v3` (which
  holds pins and recents) for a value only this device cares about.
- *A cookie, or state in the URL* — the new tab page has no durable URL to hang state
  on, and a cookie for a UI hint is worse on every axis.

**Consequences.** "Has this person seen the welcome card on this machine?" is answered
without touching the extension's own storage schema, so onboarding can never break
migration or sync, and the state resets trivially in tests. The trade-off is that it is
the one piece of UI state outside the two `chrome.storage` keys, so clearing site data
shows the card again.
---

## ADR-016 — Appearance is painted by a classic boot script over a `localStorage` cache

**Status:** accepted (2026-10)

**Context.** Theme, density and motion come from `chrome.storage.sync`, which is
asynchronous, while MV3 forbids inline scripts. Without something synchronous in front of
the module bundle, a dark-theme user would see one frame of the light background on every
new tab — the most visible regression possible on a page whose entire job is to appear
instantly.

**Decision.** Ship `public/theme-boot.js` as a plain classic script referenced from
`<head>` in `newtab.html` (`<script src="theme-boot.js"></script>`) ahead of the module
entry, and let it read a paint cache rather than the real settings. It reads
`marktab.appearance.v3` — the key exported as `APPEARANCE_CACHE_KEY` by
`src/core/appearance.ts` — out of `localStorage`, resolves `system` against
`prefers-color-scheme` and `prefers-reduced-motion`, and writes `data-theme`,
`data-density`, `data-motion`, `data-booting` and `data-platform` on `<html>` plus
`style.colorScheme`. It has no imports and no side effects beyond those attributes, and
its header records the constraint: "MV3 forbids inline scripts, so this must stay a real
file." Every failure path falls back to the defaults (`system` / `comfortable` / `full`).
`useAppearance` rewrites the cache whenever settings change, applies the resolved
appearance, and deletes `data-booting` once the shell has mounted. The cache is a cache,
never a source of truth: `theme-boot.js` only ever reads a value the app wrote after
reading real settings. `data-platform` exists for the same reason at a smaller scale —
`src/ui/components/Kbd.tsx`'s `isMacPlatform()` reads it, so keycap glyphs are correct in
the first frame instead of flipping from `Ctrl` to `⌘`.

**Alternatives.**
- *Render nothing until `chrome.storage` answers* — no flash, but the new tab page opens
  blank every time, which is the one thing this product cannot do.
- *Inline the boot code in the HTML* — one request fewer, but MV3's CSP forbids it and
  `scripts/validate-release.mjs` fails any built HTML that contains an inline script or
  an inline event handler.
- *Trust the OS preference and ignore the stored theme until hydration* — removes the
  cache and breaks exactly the case the setting exists for: a user on a light OS who
  chose dark.
- *Block on the storage API from a module* — there is no synchronous read; an extension
  page cannot wait for `chrome.storage` before its first paint.

**Consequences.** The first frame matches the last explicit choice, and the marker
attribute keeps the pre-hydration state observable. The costs are structural: a second
storage mechanism whose only legal content is appearance, so losing it degrades to a
flash rather than to wrong state; and a classic script that cannot import anything, so
theme and motion resolution is written twice — once in `theme-boot.js` and once in
`resolveAppearance`. Both files carry comments pointing at the other for that reason, and
`src/entries/newtab/index.tsx` stays thin so the shell mounts in the same task.
---

## ADR-017 — Tests are layered by what they can observe, and the release gate runs all of them

**Status:** accepted (2026-10)

**Context.** Not everything worth testing is observable in the same environment: the
index, the ranking and the migration are pure logic; the release tooling is Node scripts
with their own API clients; and the behaviour a user actually notices — focus order,
overlays, the drawer, the palette's combobox contract, real `chrome.bookmarks` — only
exists in a real browser with the extension loaded. One runner would mean testing two of
those three against fakes.

**Decision.** Three layers, each with a stated job:
- `npm run test:unit` → `vitest run`. `vitest.config.ts` runs `tests/unit/**/*.test.ts(x)`
  in `happy-dom` with `tests/unit/setup.ts`, and covers `src/core`. Browser APIs are
  faked per suite through `tests/unit/helpers/fakes.ts`, which deep-clones on write "so a
  test that accidentally shares a mutable reference with the store fails here the same
  way it would in the browser"; `setup.ts` restores timers, unstubs globals, removes the
  `chrome` global and clears `localStorage` after every test. There are no UI component
  tests — the UI is exercised in a browser instead of in a DOM emulator.
- `npm run test:scripts` → `node --test scripts/*.test.mjs` covers the release tooling
  itself (version bump, packaging, the Chrome Web Store client, the workflow shape), so a
  broken release script fails before a tag exists.
- `npm run test:e2e` → `npm run build && playwright test`. `playwright.config.ts` points
  at `tests/e2e` and is pinned to `workers: 1` / `fullyParallel: false` because extension
  state is shared; CI installs Chromium and runs it with `MARKTAB_E2E_CHANNEL=chromium`.
`npm run release:check` chains the layers in dependency order — `typecheck` → `test`
(unit + scripts) → `build` → `validate` → `package` — which is the same sequence the tag
flow of ADR-011 runs. What makes the strategy binding rather than aspirational is
`scripts/validate-release.mjs`, which asserts against the *built* tree: the required
runtime files exist; no `.map`, `.ts`/`.tsx` or `.md` file ships; permissions are exactly
the five allowed ones; `host_permissions`, `optional_permissions` and `content_scripts`
stay empty; the CSP is not permissive; `chrome_url_overrides.newtab`,
`action.default_popup`, `background.service_worker` (module) and the manifest version
match the package; no HTML carries an inline script, inline handler, `javascript:` URL,
remote script or remote stylesheet; no JS matches `eval`, `new Function`,
`document.write`, `XMLHttpRequest`, `fetch` or an analytics SDK name; both locale files
carry their message keys; the payload stays inside the JS/CSS/total budgets; and the store
documents exist and mention each permission.

**Alternatives.**
- *Component tests in `happy-dom` for the UI* — cheaper than a browser, but the
  interactions this project cares about (ADR-007's hosted overlays, the drawer,
  `chrome.bookmarks`, favicon URLs) would all be tested against a fake browser instead of
  a real one.
- *One Playwright suite covering the pure logic too* — turns a ranking regression into a
  slow browser failure with no useful diff, and makes the fast feedback loop depend on a
  browser download.
- *Replace `validate-release.mjs` with the store consoles' review checklists* — those
  checks encode store rules and the privacy claims made on the listing; a checklist that
  is not executed by CI is a checklist that gets skipped on a rushed release.
- *Coverage thresholds on the unit suite* — measures lines rather than the behaviours
  above, and rewards shallow tests over the performance and migration tests that guard
  the risky parts.

**Consequences.** A green `release:check` means the payload is shippable, not merely that
it compiles; the pure logic runs in milliseconds under `happy-dom`; and the release
scripts are tested like product code. The browser layer the harness was built for now exists:
`tests/e2e/**` holds the specs that exercise what `happy-dom` cannot — first run and the empty
states, the global key map, the rail drawer below 1200px, bookmarks created while the page is
open, folder navigation, filtering, sorting and layout persistence, palette search across
titles, URLs and folder names, opening a result in a new tab, pin and recent persistence across
a reload, delete-with-undo writing back to `chrome.bookmarks`, hidden-folder recovery, theme,
density, motion and language, the v1/v2 migration path, and the popup — plus a 3 000-bookmark
performance guard that fails if boot, search latency or a single long task exceeds a stated
budget. The fixtures load the unpacked `dist/extension` in a throwaway persistent profile and
seed bookmarks, clear state and plant legacy profiles from inside the MV3 worker.
---

## ADR-018 — Search scores the whole index per keystroke; the index is one non-recursive pass

**Status:** accepted (2026-10)

**Context.** The command palette filters the entire library while the user types, and
libraries of 20 000 bookmarks are normal for this product's audience. Two costs have to
stay bounded: the index build, which repeats after every `chrome.bookmarks` mutation, and
the search itself, which runs while the page is already painting.

**Decision.** Two rules, each stated at the code that has to obey it.
1. *One pass, no recursion, normalise once.* `buildIndex` in
   `src/core/bookmarks/index.ts` walks the `chrome.bookmarks.getTree()` output with an
   explicit `Frame` stack — "Single pass over the tree, no recursion (deep trees stay
   safe), and every string that the matcher needs is lower-cased exactly once". It emits
   the flat `bookmarks`/`folders` arrays plus the `byId`, `byFolder` and `childFolders`
   maps, and every entry carries its pre-lowered fields (`sTitle`, `sPath`, `sUrl`), so
   breadcrumbs, folder contents and root lookups are map reads and scoring never
   lower-cases anything.
2. *Score everything, allocate nothing per comparison, cap only the output.* `fieldScore`
   in `src/core/bookmarks/search.ts` is "Branch-light and allocation-free: the whole index
   is scored on every keystroke, so this runs hundreds of thousands of times per search",
   on top of the primitives in `src/core/util/fuzzy.ts` ("Both are allocation-free (no
   regex, no normalisation beyond the caller's pre-lowered fields)"). `SearchOptions.limit`
   and `folderLimit` cut the *returned* hits and are documented as "Maximum bookmark hits
   returned (scoring still covers the whole index)"; the palette passes `limit: 40,
   folderLimit: 8` from `CommandPalette.tsx`. Shared constants (`NO_MATCH`,
   `FOLDER_NO_MATCH`) stand in for per-call objects, and `searchIndex` reports its own
   `elapsedMs`.
The search path is deliberately not debounced: `debounce` from `src/core/util/timing.ts`
is used where the latency is invisible — the bookmark-reload subscription (220 ms),
settings persistence and userdata persistence — while the palette calls `searchIndex`
synchronously, in the same tick as the keystroke. The reload itself is serialised:
`reloadBookmarks` in `src/core/bookmarks/store.ts` keeps one in-flight promise and re-runs
once if events arrived while it was running.
Guards: `tests/unit/bookmarks-search.test.ts` builds 200 folders × 100 bookmarks
(`PERF_FOLDERS`, `PERF_PER_FOLDER`), asserts `PERF_INDEX.counts.bookmarks === 20_000`,
and requires a warm `searchIndex` over that index to finish in under 150 ms *and* to
report 200 total matches — the cap narrows the output, not the scan.
`scripts/validate-release.mjs` holds the payload side of the same budget (JS 420 KiB, CSS
130 KiB, 1.2 MiB total).

**Alternatives.**
- *Debounce the query, or move it to an idle callback or a worker* — the palette is the
  product's main interaction, so a debounce trades the instant feel away, and a worker
  would need the index and the ranking duplicated to buy a win the 20 000-bookmark test
  says is not needed.
- *Precompute an inverted index or n-gram table during the build* — turns substring lookup
  into a map hit, but multiplies memory, makes every bookmark mutation pay for a rebuild,
  and does nothing for the subsequence path that lets `ghr` find `github.com/react`.
- *Stop scanning once `limit` hits are found* — the tempting micro-optimization, and wrong
  here: ranking is global, so an early exit would drop better matches that appear later in
  browser order and make results depend on folder layout.
- *Match with regexes or normalise tokens at query time* — a line shorter, and an
  allocation plus a compiled pattern per field per keystroke, which is exactly what
  `fuzzy.ts` is written to avoid.

**Consequences.** Typing stays synchronous and results are deterministic for a given query
and index, and the per-comparison cost has to stay trivial forever — which is why the
scoring loop is the place in `src/core` whose comments talk about allocation. The 150 ms
assertion is a regression detector rather than a target: it times a warm call with
`performance.now()` and logs the measured number in CI.


---

## ADR-019 — Migration only ever fills blanks; it never overwrites state that exists

**Status:** accepted (2026-10)

**Context.** MarkTab 3 keeps its state in two new keys (`marktab:settings:v3` in
`storage.sync`, `marktab:data:v3` in `storage.local`) and reads the v1/v2 payload once to
seed them. ADR-009 makes the legacy keys immortal — they are never written or deleted, so
a v2-upgraded user keeps them forever. That makes "a legacy payload exists" true on every
later run and on every new device, and the original condition for migrating,
`settingsRead.value === undefined || !existed`, is false for the *second* device only until
sync delivers the settings key. A security review of the persistence layer (2026-10) showed
the consequence: when sync has v3 settings and this device's local data is still absent,
the bootstrap re-migrated and **overwrote the live settings** with the older v2 payload —
reverting density, motion, language, sort, hidden folders and the custom search template —
and then propagated that reversion to every other device through `watchSettings`
(`src/core/settings/store.ts`). `storage.sync` bringing settings to a device whose local
storage is empty is ordinary behaviour, not an edge case.

**Decision.** Migration runs only when *both* v3 keys are absent and both reads
**succeeded**:

- `settingsMissing`/`dataMissing` in `src/core/state/bootstrap.ts` require
  `value === undefined && error === undefined` — a read that failed is not an absent key, so
  nothing is written on top of data that could not be seen;
- `needsMigration = settingsMissing && dataMissing`, so a partial state never migrates;
- the two writes inside the migration are the only writers, and the "fill the blank" step
  below them fills *only* the missing half, so an existing key is never replaced;
- `hasLegacyPayload` and `migrateLegacyState` require at least one field they actually
  recognise (`LEGACY_FIELDS`), because an empty `markTabSettings: {}` would otherwise report
  itself as an applied migration and rebuild v3 state from defaults — an upgrade that reads
  as "everything was lost".

**Alternatives.**
- *Migrate whenever either key is missing (the original rule)* — the failure above: the
  older payload wins over live settings, and `storage.sync` makes that everyone's settings.
- *Delete the legacy keys after migrating* — makes the condition true only once, but breaks
  the downgrade promise in ADR-009 and in `PRIVACY_POLICY.md`, and silently discards a
  payload the user cannot otherwise recover.
- *Migrate into a "pending" key and merge on next start* — a second schema to maintain for a
  scenario that a one-line condition already handles correctly, and the merge rules
  themselves would have to decide which side is newer.
- *Trust `chrome.storage` reads to succeed* — the wrapper deliberately resolves errors into
  `{ value: undefined, error }` (`src/core/platform/storage.ts`), so treating an error as
  absence writes defaults over data the user still has.

**Consequences.** A v2 installation still upgrades on first run with its theme, engine,
sort, hidden folders, pins and history intact, and the legacy payload is left in place. A
second device now keeps the settings sync delivered and only seeds its own empty local data.
`tests/unit/persistence-guards.test.ts` and the e2e case *"never rewrites settings that
already exist on this profile"* (`tests/e2e/migration.spec.ts`) pin both directions: the
multi-device case must not migrate, and the genuine first run still must.

---

## ADR-020 — One allow-list decides what MarkTab will open

**Status:** accepted (2026-10)

**Context.** Bookmark URLs are data the user did not necessarily type: an import file, a
synced profile or a page that talked someone into saving a link can all put a `javascript:`,
`data:` or `file:` URL into the tree. MarkTab opens bookmark URLs from four places — the
card/row anchor, the context menu's "open in new tab/new window", palette rows and the typed
destination row — and the original guard (`/^(https?|chrome-extension):/`) existed in only
one branch of `openUrl`, the `current`-tab one. The other two branches handed the URL
straight to `chrome.tabs.create` / `window.open`, and `linkAnchorProps` put it in a real
`href`, which browsers treat as a navigation target for middle-click and the native context
menu.

**Decision.** `canOpenUrl()` in `src/core/util/url.ts` is the single allow-list
(`http:`, `https:`, `chrome-extension:`), and it is the first statement of `openUrl` for
every disposition, so a blocked URL cannot reach a tab, a window or the current page.
`linkAnchorProps` consults the same helper: a bookmark whose scheme is not openable renders
an anchor with no `href`, and both its click handlers return early without recording a
visit — nothing opened, so nothing is remembered as opened.

**Alternatives.**
- *Rely on the extension CSP and Chrome's own URL filtering* — the CSP (`script-src 'self'`)
  does block script URLs inside an extension page, which is why this stayed a low-severity
  finding, but it says nothing about `data:`/`file:` in a new tab, and "the browser will
  probably refuse" is not a policy.
- *Filter only the JS paths and leave `href` alone* — leaves middle-click and the native
  context menu as unguarded navigation targets for exactly the URLs the rule exists to stop.
- *Sanitize by rewriting the URL* — MarkTab has no business rewriting a user's bookmark, and
  a rewritten URL that silently points elsewhere is worse than not opening it.

**Consequences.** A bookmark with an unsupported scheme stays visible, is still searchable,
can be renamed, moved, copied or deleted, and simply does not open; the browser's own
bookmark manager remains the place to open it. The rule is one function, used everywhere,
and the extension cannot be used as a launcher for a scheme it did not decide to support.

---

## ADR-021 — A failed write is reported, not swallowed

**Status:** accepted (2026-10)

**Context.** Both stores write on a short debounce
(`src/core/settings/store.ts` 150 ms, `src/core/userdata/store.ts` 120 ms) and dropped the
boolean that `writeKey` returns. `settingsNotice` existed for exactly one case — the
`storage.sync` per-item trim — and nothing in the UI rendered it, so a rejected sync write
(quota) or an exhausted `storage.local` looked identical to a successful save. The user's
next action was built on a change that was not there.

**Decision.** `writeKey`'s result is consumed in both stores: `settingsNotice` becomes
`'sync-write-failed'` on a rejected sync write and is cleared back to the trim notice (or
`null`) by the next successful one, and `userDataWriteError` (exported through
`src/core/state/signals.ts`) mirrors the local write. The settings **Data** section renders
either state as a `role="status"` warning row, translated in both catalogues, styled with
`--warning` — the data is intact, the write is not, which is why it is not an error tone.

**Alternatives.**
- *Retry with backoff inside the store* — hides a systematic failure (a full quota does not
  become empty by waiting) and adds a timer to a page that is open for seconds.
- *Throw from `writeKey`* — every caller is a UI event handler, and an unhandled rejection
  in a Preact event handler is a console error, not a message the user can act on.
- *Only log the failure* — a console line in a new tab page nobody has open is the same as
  silence.

**Consequences.** Silent data loss on the write path is now visible where the user would
look for it, and the two tested paths
(`tests/unit/persistence-guards.test.ts`: a rejected sync write, a rejected local write,
each cleared by the next success) keep it that way.

---

## ADR-022 — A single ochre accent family, no user-configurable colour

**Status:** accepted (2026-10) — supersedes the colour half of ADR-004

**Context.** The v3 surface was built on a mid-tone blue (`#5b6cff` / `#7aa2ff`) over a
cool grey ramp. The redesign brief asked for a paper surface: warm neutrals, ink text and
printed rules. A blue accent on warm paper reads as a link pasted onto a page, and it was
the only cool element left in the composition.

**Decision.** One accent family, ochre (`#8a3f25` light / `#f0b294` dark), with a soft
wash (`--accent-soft`), a hover tone and an on-accent ink. The aliases the old system used
(`--accent-strong`, `--accent-solid`, `--accent-contrast`, `--accent-border`,
`--accent-soft(er)`) are kept as pointers to those values so no call site had to be
rewritten into a different vocabulary. There is still no accent picker and no second
accent: `--success`, `--warning`, `--error` and `--focus` are status tones, not brand
variants.

**Alternatives.**
- *Keep the blue and change only the neutrals* — the warm ramp with a cool accent is the
  most common "editorial" mistake; the accent stops looking printed.
- *Add a second, decorative tone for markers and badges* — every added tone is another
  contrast pair to re-verify in both themes, and the accent already marks state, focus and
  the one primary action per surface.
- *Expose the accent in Settings* — ADR-004's reasoning is unchanged: N accents multiply
  every visual state.

**Consequences.** Every accent usage is one contrast pair, verified at 5.60:1 (light) and
6.46:1 (dark) as text on the worst surface it lands on, and 7.33:1 / 8.96:1 as a fill
behind `--on-accent`. Status colours are chosen to stay distinguishable from ochre in both
themes (`--success` is a green that is darker in light mode and lighter in dark mode,
never a second warm). `tests/e2e/a11y.spec.ts` remains the enforcement.

---

## ADR-023 — A local serif for the greeting and a page's own title

**Status:** accepted (2026-10) — supersedes ADR-005's "no serif" rule

**Context.** ADR-005 removed the serif because v2 paired a display serif with sans body on
mixed English/Chinese bookmark titles. The paper direction needs a human, printed voice for
the one place the page speaks to the reader (the greeting) and for the title of a page; a
whole serif UI would not survive the density of rows, hosts and counts.

**Decision.** `--font-serif` is a **local-only** stack — `Georgia`, `Times New Roman`,
`Songti SC`, `SimSun`, `serif` — and `--font-heading` points at it. It is applied through
the global `.serif-heading` class in `base.css` to exactly two things: the home greeting,
and the `h1` rendered by `SectionHeader level="page"` (folder, pinned, recent, settings).
`h1..h4` themselves stay sans, so a new heading is sans unless it opts in. Counts, hosts,
dates and the clock stay in `--font-mono` with `font-variant-numeric: tabular-nums`; the
clock's family token is `--font-clock`, a pointer at the mono stack.

**Alternatives.**
- *Ship a webfont (Fraunces, Newsreader, Source Serif)* — an offline extension must not
  fetch a font, and a FOUT on every new tab is worse than any typographic nicety.
- *Serif every heading* — it collapses the hierarchy in dense surfaces and puts CJK
  headings on a different baseline from their own meta line.
- *Serif body text* — unreadable at 12–14 px with mixed Latin/CJK titles.

**Consequences.** Two sizes carry the serif: `--text-3xl` (36 px, the greeting) and
`--text-2xl` (24 px, page titles), both at regular weight — a bold serif at display size
reads as a headline rather than a page. A machine without Georgia/Songti falls back to a
system serif, which is the intended behaviour, not a bug.

---

## ADR-024 — Zero blur, and opacity-only motion

**Status:** accepted (2026-10) — supersedes ADR-006

**Context.** ADR-006 allowed `backdrop-filter` on the rail and the scrim. In the paper
language both are opaque sheets: a blurred rail over warm paper reads as frosted glass and
loses the printed edge that separates the spine from the page, and blurring a new tab page
while its index is still building is the most expensive thing the first paint can do.

**Decision.** `backdrop-filter` appears nowhere; `--rail-blur` / `--scrim-blur` exist at
`0` so a component cannot reach for a value that would reintroduce one. Elevation is spent
on exactly three overlays (palette, menu/dialog, drawer) with a single soft edge
(`--shadow-3`); cards, rows and controls are hairline boxes. Motion is:

| Element | Motion |
| --- | --- |
| hover / press / focus | colour, border and text tone change on the same frame; no movement, no scale, no shadow transition |
| palette, menu, dialog, drawer | opacity `.85 → 1` in `--dur-base` (120 ms); on close an 80 ms non-interactive copy fades out |
| toast, popup "saved" confirmation | opacity `.85 → 1` in `--dur-base` |
| pin icon | opacity `.65 → 1` in `--dur-instant` (50 ms) |
| clock, theme, results, switch, appended rows, desktop collapse | `0 ms` |
| keyboard-triggered open (Enter/Space/Escape/arrows) | `0 ms` |

The primitives live in `src/ui/motion.ts` (Web Animations API) and read `--dur-base`,
`--dur-fast` and `--ease-out` from the element, so `[data-motion='reduced']` and
`prefers-reduced-motion: reduce` collapse them to nothing without a second code path. An
overlay's focus, `inert` state and pointer handling are effective on the frame the state
changes, never after the fade: the exit is a copy, not a deferred unmount. Nothing animates
`height`, `width`, `filter`, `backdrop-filter` or `box-shadow`, and the first frame of a
page has no entry animation.

**Alternatives.**
- *Keep the two blurred surfaces for continuity* — they were the only two, and they were
  the two that most contradicted the paper metaphor.
- *Slide or scale panels in* — transform motion at 120 ms reads as a spring; the paper
  language wants a page that is simply there.
- *Transition hover colours over 150–200 ms* — a new tab is opened dozens of times a day,
  and a slow tint makes a keyboard-first surface feel laggy; 80 ms is the longest cue that
  still feels immediate.

**Consequences.** The rule is checkable: `backdrop-filter` is expected to appear zero times
in `src/**`, `--shadow-1` and `--shadow-2` are `none`, and the only `transition` declarations
left in a module animate `opacity` — a hover, a press or a focus change paints on the same
frame it happens, with no transition at all. The cost is that overlays can no longer imply
depth through blur, so the scrim (28% warm ink light / 64% dark) carries it on its own.
