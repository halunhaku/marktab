# Historical: v2-era specs and plans

> **Status: historical, superseded, not maintained.**
> Everything in this directory was written for **MarkTab 2.x** — the extension whose runtime
> files lived at the repository root (`newtab.html`, `newtab.js`, `styles.css`, `popup.js`,
> `_locales/`) and whose UI was one root-level script. MarkTab 3 is a rebuild, not a refactor
> ([ADR-002](../decisions/README.md)), and nothing here describes the current codebase, the
> current repository layout, or the current release process.
>
> Kept for one reason: it records *why* the rewrite was planned the way it was, and what the
> v2 product was trying to achieve — context a future maintainer cannot recover from the code
> after the cutover. **Do not follow these documents, and do not update them to match v3**:
> their value is that they are frozen.

Where to look instead:

| Question | Read |
| --- | --- |
| How does MarkTab 3 work today? | [../architecture.md](../architecture.md) |
| What did v3 decide differently, and why? | [../decisions/README.md](../decisions/README.md) |
| What are the design rules? | [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md), [../design-principles.md](../design-principles.md) |
| How do releases work now? | [../../README.md](../../README.md) (Release process), [../release-log.md](../release-log.md) |

## Contents

### `specs/`

| Document | What it was | Why it is obsolete |
| --- | --- | --- |
| `2026-06-19-halunhaku-migration-design.md` | Migration of MarkTab's visual system from a "warm paper + sage green + rounded + glass" variant to the standard HALUNHAKU language (serif headings, forest green, no glass). | Describes the **v2** visual language end to end. v3 replaced it: one blue accent family ([ADR-004](../decisions/README.md)), sans headings ([ADR-005](../decisions/README.md)), a two-surface blur budget ([ADR-006](../decisions/README.md)). It also targets `../../DESIGN_SYSTEM.md` as it existed then, and bumps `marktab-1.4.0.zip`. |
| `2026-06-27-newtab-ui-layout-design.md` | Home-view layout refresh for wide displays: five pinned cards on one row at 1920/2560/3840 px, Recent as two modules, Folders in a panel. | Scoped explicitly to `newtab.html`, `newtab.js` and `styles.css`, none of which exist in v3. Home is now `src/ui/features/home/**` with a tile grid driven by `tokens.css`. |
| `2026-06-27-chrome-store-release-automation-design.md` | Design of the tag-driven release pipeline: GitHub Release + Chrome Web Store submission, OAuth upload scripts, mocked API tests. | The **intent** survived (tag boundary, draft last, mock all HTTP), and the implementation was carried into v3's `scripts/cws-*.mjs` + `.github/workflows/release.yml`; the document itself predates the Edge Add-ons path and the recovery modes in [ADR-011](../decisions/README.md). |

### `plans/`

| Document | What it was | Why it is obsolete |
| --- | --- | --- |
| `2026-06-27-newtab-ui-layout.md` | Task-by-task implementation plan for the layout spec above, written for an agentic worker using "superpowers" sub-skills and a source-level layout contract test. | Assumes the v2 app ("Keep the existing native HTML/CSS/JavaScript application"), edits `newtab.js` and `package.json` scripts that no longer exist, and references a workflow no longer used. |
| `2026-06-27-chrome-store-release-automation.md` | Task-by-task implementation plan for the release-automation spec: draft-first GitHub Release, deterministic packaging, a repository-owned Node.js Chrome Web Store client, and one-time OAuth bootstrap, all on Node 18+. | The tooling it plans was delivered and then restructured for v3 (Edge publishing, recovery modes, a six-step `release:check` gate), so the task list no longer matches the scripts and the workflow. |
