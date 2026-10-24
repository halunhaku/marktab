# MarkTab 3 — Design System

MarkTab 3's visual language, quoted from the code that implements it. **Every value here comes
from `src/ui/styles/tokens.css`** plus the global element defaults in `src/ui/styles/base.css`;
if this document and those files disagree, the CSS wins and this document is a bug.

The token set is called **"Paper"**: a warm neutral ramp, ink text, one ochre accent family that
is never configurable (ADR-022), hairlines instead of elevation, **no blur anywhere**
(ADR-024), and a local serif reserved for the greeting and a page's own title (ADR-023).

| Earlier rule | Paper replacement |
| --- | --- |
| Cool neutral ramp with a blue accent (ADR-004) | Warm paper ramp, one ochre accent — **ADR-022** |
| Serif banned entirely, sans headings (ADR-005) | Sans headings, serif only through `.serif-heading` — **ADR-023** |
| Two blurred surfaces (rail, scrim) (ADR-006) | Zero `backdrop-filter`; opacity-only motion — **ADR-024** |

---

## 1. Colour

Colour is applied through four layers, resolved in this order:

1. `:root` — light defaults, also used before hydration;
2. `[data-theme='dark']` — the resolved dark palette;
3. `[data-density='compact']` — geometry only, never colour or type size;
4. `[data-motion='reduced']` — durations.

`public/theme-boot.js` writes `data-theme`, `data-density`, `data-motion`, `data-booting` and
`data-platform` on `<html>` before the first frame, so an explicit dark choice never flashes
light paper. The theme switch itself is instant: no colour transition is declared on `body`.

### 1.1 Paper ramp

Every surface is **opaque**. There is no translucency, so a card over the canvas can never
read as a grey smudge.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` | `#f7f3e9` | `#191713` | The page. |
| `--canvas-deep` | `#eee7d9` | `#12110e` | Recessed page tone (drawer ground, empty blocks). |
| `--surface-1` | `#fcf9f1` | `#211e19` | The rail, empty-state boxes, one step off the page. |
| `--surface-2` | `#fffdf7` | `#29251f` | Cards, fields, panels — the "sheet". |
| `--surface-3` | `#eee7d9` | `#332e26` | Thumbnails, keycaps, loading bars. |
| `--surface-hover` | `#efe7d8` | `#393229` | Hover wash. Opaque, like everything else. |
| `--surface-active` | `#e9decb` | `#40362b` | Pressed/selected wash. |
| `--overlay-scrim` | `rgb(38 31 23 / 28%)` | `rgb(8 7 5 / 64%)` | Behind the palette, dialogs and the drawer. Plain tint, no blur. |
| `--text-1` | `#29231c` | `#f3ecdf` | Primary ink. |
| `--text-2` | `#554a3c` | `#d2c6b3` | Secondary text (hosts, descriptions). |
| `--text-3` | `#685a48` | `#bcb09b` | Muted tier: meta, counts, hints. Measured worst case 5.02:1 (light) / 5.52:1 (dark). |
| `--border-1` | `#d5cbbb` | `#554c3f` | Hairline rules and dividers. Decorative; no contrast floor. |
| `--border-2` | `#7d715f` | `#9d917c` | Control outlines — the *only* thing that says "this is a control". Measured worst case 3.59:1 / 3.80:1 (WCAG 1.4.11 needs 3:1). |

### 1.2 Accent family (the only accent)

| Token | Light | Dark |
| --- | --- | --- |
| `--accent` | `#8a3f25` | `#f0b294` |
| `--accent-hover` | `#72311c` | `#fac8ae` |
| `--accent-soft` | `#f3e1d6` | `#443027` |
| `--on-accent` | `#fffdf7` | `#2c1c14` |

Aliases keep one meaning per job, and all of them point at the values above:

| Alias | Points at | Job |
| --- | --- | --- |
| `--accent-strong`, `--accent-solid` | `var(--accent)` | The accent as text/icon, and as a fill. |
| `--accent-contrast`, `--text-inverse` | `var(--on-accent)` | The label on an accent fill. |
| `--accent-border`, `--border-strong` | `var(--border-2)` | A control outline (there is no separate accent outline). |
| `--accent-softer` | `var(--surface-hover)` | A neutral wash, not an accent tint. |
| `--focus` | `#8a3f25` / `#fac8ae` | The focus ring colour. |

There is no second accent, no accent-colour preference and no decorative accent fill. The
accent marks state (active nav row, active palette row, pinned edge), focus, and the one
primary action on a surface. Contrast, measured against the worst surface each can land on:
accent-as-text 5.60:1 light / 6.46:1 dark; `--on-accent` on accent 7.33:1 / 8.96:1. Status
colours stay distinguishable from ochre in both themes.

### 1.3 Status

| Token | Light | Dark |
| --- | --- | --- |
| `--success` / `--success-soft` | `#236142` / `#e7f0e8` | `#a3dbb5` / `#20382a` |
| `--warning` / `--warning-soft` | `#795017` / `#f6ecd9` | `#e7c28b` / `#393222` |
| `--error` / `--error-soft` | `#a32636` / `#f9e5e8` | `#ffb0b8` / `#432931` |

Status tones appear as text on their own soft fill (6.03–6.30:1 light, 7.55–8.04:1 dark) and
as the edge of an inline notice. They are never a page fill and never a gradient.

### 1.4 No ambient background

`body` paints `--canvas` and nothing else. There is no `body::before` wash, no radial pool and
no decorative gradient anywhere except two drawn chevrons (`TextField`'s select arrow), which
are clipped edges rather than colour. Selection uses `--accent-soft` with `--text-1`.

## 2. Elevation

Paper does not float: a card is a hairline box, a row is a rule, and a control is an outline.

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-1` | `none` | `none` |
| `--shadow-2` | `none` | `none` |
| `--shadow-focus` | `none` | `none` |
| `--shadow-3` | `0 8px 24px -16px rgb(48 34 17 / 20%)` | `0 8px 24px -16px rgb(9 7 4 / 45%)` |
| `--ring` | `0 0 0 2px var(--surface-2), 0 0 0 4px var(--focus)` | same definition |

`--shadow-3` is spent on exactly the surfaces that sit above live content: the palette, menus,
dialogs, toasts, the drawer and the drawer's floating toggle. Nothing else casts — a card, a
row or a control never does. `--ring` is the two-solid-ring focus construction;
`:focus-visible` in `base.css` renders the same idea with an outline and a 2 px offset.

## 3. Blur budget: none

`backdrop-filter` appears zero times in `src/**`. `--rail-blur` and `--scrim-blur` exist at
`0` so no component can reintroduce one by reaching for a token that looks available. The
scrim's tint (28% warm ink light, 64% dark) carries the separation instead (ADR-024).

## 4. Typography

### 4.1 Families

```css
--font-sans: system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC',
  'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
--font-mono: ui-monospace, 'SF Mono', SFMono-Regular, 'JetBrains Mono', 'Cascadia Mono', Menlo,
  Consolas, monospace;
--font-serif: Georgia, 'Times New Roman', 'Songti SC', SimSun, serif;
--font-heading: var(--font-serif);
--font-clock: var(--font-mono);
```

- **Body, labels and headings: sans.** `base.css` sets `body { font-family: var(--font-sans);
  font-size: var(--text-md); }` and `h1..h4 { font-weight: var(--weight-semibold); line-height:
  var(--leading-tight); letter-spacing: var(--tracking-tight); text-wrap: balance; }`.
- **Serif is a two-line voice, applied by class.** `.serif-heading` (in `base.css`) sets
  `font-family: var(--font-heading)` and regular weight. It is composed on exactly two
  elements: the home greeting (`Hero`) and the `h1` from `SectionHeader level="page"` (folder,
  pinned, recent, settings). Dialog titles and section titles stay sans. No serif is applied to
  `h1..h4` wholesale (ADR-023).
- **Numerals, dates, hosts and the clock: monospace with tabular figures.**
  `.tabular-numerals` is the utility; the clock uses `--font-clock` and every count/meta line
  that can change uses `font-variant-numeric: tabular-nums` so digits do not jitter.
- No network font is requested. A machine without Georgia or Songti falls back to a system
  serif, which is the intended behaviour.

### 4.2 Scale

| Token | Value | Use |
| --- | --- | --- |
| `--text-xs` | `0.75rem` (12px) | Meta, captions, keycaps, counts |
| `--text-sm` | `0.8125rem` (13px) | Dense rows, labels, descriptions |
| `--text-md` | `0.875rem` (14px) | Body (the `body` default) |
| `--text-lg` | `0.9375rem` (15px) | Section titles, emphasised body |
| `--text-xl` | `1.0625rem` (17px) | Dialog and view titles |
| `--text-2xl` | `1.5rem` (24px) | A page's own title (serif) |
| `--text-3xl` | `2.25rem` (36px) | The hero greeting (serif) |
| `--text-clock` | `clamp(2.5rem, 4.5vw, 3.5rem)` | The hero time |

Weights: `--weight-regular: 400`, `--weight-medium: 500`, `--weight-semibold: 600`,
`--weight-bold: 680`. Leading: `--leading-tight: 1.2`, `--leading-snug: 1.4`,
`--leading-normal: 1.65`. Tracking: `--tracking-tighter: -0.02em`, `--tracking-tight: -0.01em`,
`--tracking-wide: 0.02em`, `--tracking-caps: 0.06em`.

## 5. Space

A 4 px base scale; use the token, never a raw pixel value.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--space-0` | `0` | `--space-6` | `1.5rem` |
| `--space-1` | `0.25rem` | `--space-8` | `2rem` |
| `--space-2` | `0.5rem` | `--space-10` | `2.5rem` |
| `--space-3` | `0.75rem` | `--space-12` | `3rem` |
| `--space-4` | `1rem` | `--space-16` | `4rem` |
| `--space-5` | `1.25rem` | | |

Rhythm tokens: `--section-gap` (`--space-12`) separates chapters, `--card-gap` (`--space-3`)
spaces a grid, `--card-pad` (`--space-4`) is the inside of a card.

## 6. Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | `2px` | Keycaps, selection rules, favicon tiles |
| `--radius-sm` | `4px` | Buttons, fields, chips |
| `--radius-md` | `4px` | Row washes, toasts |
| `--radius-lg` | `6px` | Cards, panels' inner blocks |
| `--radius-xl` | `8px` | The palette, dialogs |
| `--radius-full` | `999px` | **Only** the switch track and thumb |

## 7. Motion

| Token | Value |
| --- | --- |
| `--dur-instant` | `50ms` |
| `--dur-fast` | `80ms` |
| `--dur-base` | `120ms` |
| `--dur-slow` | `160ms` |
| `--dur-tick` / `--dur-theme` / `--dur-results` / `--stagger` / `--dur-none` / `--delay-none` | `0ms` |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--ease-emphasis` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

Only opacity and transform are ever animated; `transition: all` is forbidden, and nothing
animates `height`, `width`, `filter`, `backdrop-filter` or `box-shadow`.

| What | Motion | Where |
| --- | --- | --- |
| Hover, press, focus | colour / border / text tone on the same frame — no transition at all, so no movement, scale or lag | every `*.module.css`; the only `transition` declarations left are `opacity` |
| Palette, menu, dialog, drawer | opacity `.85 → 1` in 120 ms; close is an 80 ms fade of a non-interactive copy | `src/ui/motion.ts` + `useOverlayMotion` |
| Toast, popup "saved" confirmation | opacity `.85 → 1` in 120 ms | `useOverlayMotion`, `PopupApp.module.css` |
| Pin icon | opacity `.65 → 1` in 50 ms | `LinkCard` / `LinkRow` `.pinButton` |
| Clock, theme, results, switch, appended rows, desktop rail collapse | `0ms` | `ClockDial` (no transition), `Switch` (no transition), shell (no transition) |
| Keyboard-triggered open | `0ms` | `motion.ts` tracks the last input modality |

`motion` is an independent axis with three settings — `system`, `reduced`, `full`:

- `[data-motion='reduced']` zeroes every duration, so transitions collapse to nothing rather
  than merely getting faster.
- `@media (prefers-reduced-motion: reduce)` applies the same zeroing to `:root:not([data-motion=
  'full'])`, so an explicit "full" choice is honoured while the OS default is respected.
- `motion.ts` reads the duration tokens off the element, so both switches reach the WAAPI
  animations without a second code path, and a keyboard open or close skips them entirely.

Focus, `inert` and pointer handling are effective on the frame the state changes; the 80 ms
exit is a copy appended at the overlay's last rect, never a deferred unmount. The first frame
of a page has no entry animation.

## 8. Layout tokens

| Token | Value | Meaning |
| --- | --- | --- |
| `--rail-w` | `252px` | Navigation rail width |
| `--rail-w-rail` | `68px` | Collapsed (icon) rail width |
| `--content-max` | `1240px` | Content column max width |
| `--content-pad` | `var(--space-8)` | Content padding (`--space-6` when compact) |
| `--toolbar-h` | `56px` | Sticky toolbar / header height |
| `--control-h-sm` | `32px` | Small control (icon button, chip, menu item) |
| `--control-h` | `36px` | Default control |
| `--control-h-lg` | `40px` | Large control, text field, palette field |
| `--row-h` | `60px` | List row height |
| `--grid-min` | `200px` | Card grid floor |
| `--card-h` | `96px` | Grid card height |
| `--hero-min-h` | `176px` | Home masthead minimum |
| `--palette-max-w` | `640px` | Palette panel cap |
| `--popup-w` / `--popup-max-h` | `360px` / `600px` | Popup sheet |
| `--z-rail` | `20` | Rail / drawer |
| `--z-sticky` | `30` | Sticky toolbar, drawer toggle |
| `--z-menu` | `60` | Context menus |
| `--z-overlay` | `80` | Palette, dialogs |
| `--z-toast` | `100` | Toasts, skip link |

The shell (`App.module.css`) is a two-area grid — `grid-template-areas: 'rail content'` with
`grid-template-columns: var(--rail-w) minmax(0, 1fr)`, and nothing else in it (ADR-012). Every
other layer (palette, menus, dialogs, toasts) is declared as overlay state and hosted once near
the root (ADR-007), so the shell itself never re-lays out.

### 8.1 Density

`data-density="compact"` is a spacing/geometry axis. It never shrinks type — a smaller row is a
denser list, not a smaller word.

| Token | Comfortable | Compact |
| --- | --- | --- |
| `--control-h-sm` | `32px` | `28px` |
| `--control-h` | `36px` | `32px` |
| `--control-h-lg` | `40px` | `36px` |
| `--row-h` | `60px` | `52px` |
| `--card-pad` | `var(--space-4)` | `var(--space-3)` |
| `--content-pad` | `var(--space-8)` | `var(--space-6)` |

## 9. Components

The design kit lives in `src/ui/components/`. Each component owns a CSS module next to it and
reads tokens only.

| Component | Exports | Notes |
| --- | --- | --- |
| `Button` | `Button`, `IconButton` | `variant`: `primary`, `secondary`, `ghost`, `danger`, `link`; `size`: `sm`, `md`, `lg`; optional `icon`. `primary` is the accent fill, `secondary` an outline, `ghost` a wash. `IconButton` **requires** a `label`, used as the accessible name and the tooltip. |
| `TextField` | `TextField`, `SelectField` | Persistent label plus an optional hint/error line; identified by its `--border-2` outline. |
| `Switch` | `Switch` | Labelled toggle; the whole row is the hit target; settles instantly. |
| `Segmented` | `Segmented` | Mutually exclusive options: theme, density and motion in Settings, folder view and sort. Selected segment is `--accent-soft`. |
| `Menu` | `Menu`, `MenuHost` | One menu at a time, positioned from an anchor rect; fades in on open. |
| `Dialog` | `Dialog` | Owns initial focus, the Tab ring, Escape, scroll lock and focus restoration. Fades in on open; closes with an 80 ms copy. |
| `Toast` | `ToastHost` | Polite, dismissible, never focuses itself. Undo actions ride here. |
| `Favicon` | `Favicon` | Site icon with a letter-tile fallback; a hairline square, no shadow. |
| `CardGrid` | `CardGrid` | Grid with a `--grid-min` floor and `--card-gap`. |
| `SectionHeader` | `SectionHeader` | Title on a hairline rule, mono meta, optional action. `level="page"` renders an `h1` with `.serif-heading`. |
| `EmptyState` | `EmptyState` | One hairline box: icon, title, description, optional action. |
| `Skeleton` | `Skeleton` | A static `--surface-3` block that reserves final geometry; no shimmer. |
| `Kbd` | `Kbd`, `keycaps`, `isMacPlatform` | Mono keycaps; renders `Mod+K` as ⌘K on macOS and Ctrl+K elsewhere. |
| `Icon` | `Icon`, `ICON_NAMES`, `IconName` | One 24×24 stroke icon set; `strokeWidth` `1.6` (or `0.9` for filled glyphs). |
| `cx` | `cx` | Class-name joiner. |

Feature-level patterns (`src/ui/features/**`) that behave like components: `LinkRow` (60 px,
continuous rules), `LinkCard` (96 px index card, controls stacked in the corner), the folder
grid/toolbar/breadcrumb/chips, the palette panel and rows, the settings rows and sections, and
the rail.

## 10. Responsive contract

The shell is a navigation rail plus one content column and nothing else (ADR-012), and the rail
has exactly one breakpoint, mirrored in CSS and JS (ADR-013): the media queries in
`App.module.css` must stay in sync with `DRAWER_QUERY = '(max-width: 1200px)'` in `App.tsx`,
where `useMediaQuery` is the only JS reader.

| Range | Behaviour |
| --- | --- |
| **> 1200 px** | Fixed rail: two-column grid, rail as a real column, collapsible to the `68px` icon rail. Collapse is instant. |
| **≤ 1200 px** | Drawer: single column, the rail becomes a `position: fixed` overlay that is `visibility: hidden` while closed, opened by the floating `drawerToggle`; opening paints a flat `--overlay-scrim` and fades the rail in, and the toggle hides while the drawer is open. The content column keeps `--space-4 + --control-h-lg` of top clearance so the toggle never sits on a greeting. The drawer closes on navigation and when the window grows. |
| **≤ 768 px** | Compact shell padding; the hero stacks (copy, clock, search), the clock ring shrinks, the palette moves to `6vh` top padding and drops row paths, settings rows wrap, the settings nav stops being sticky, breadcrumbs and the folder toolbar reflow, and list rows let the host fall onto its own line under the title. |

At every width the content column scrolls, not the page: `body { overflow: hidden; }` and
`.content { overflow-y: auto; overscroll-behavior: contain; }`. When an overlay is open,
`body[data-scroll-locked='true'] { overflow: hidden; }`.

## 11. Do / Don't

**Do**

- Read tokens for colour, type, space, radius, duration and easing; add a token before adding a
  one-off value.
- Keep one accent family, one icon set (`Icon`) and one focus construction.
- Express depth with `--border-1` hairlines and `--border-2` control outlines; express state
  with `--surface-hover` / `--surface-active` / `--accent-soft`.
- Reserve final geometry for loading content (`Skeleton`, `--row-h`, `--grid-min`, `--card-h`)
  so nothing shifts.
- Render numerals, dates, hosts and the clock in `--font-mono` with tabular figures.
- Keep targets at least 24×24 CSS px, aiming at `--control-h-sm` / `--control-h` /
  `--control-h-lg`, and give every icon-only control an accessible name.
- Route overlay motion through `src/ui/motion.ts` / `useOverlayMotion`.

**Don't**

- Don't add `backdrop-filter`, a gradient behind text, or a card shadow.
- Don't reintroduce serif headings, a serif body, or a second display face — the serif is two
  elements, applied by class.
- Don't ship a theme-colour / accent picker.
- Don't animate a response to input: hover, press, focus, typing, filtering, the clock, theme
  changes and the switch are instant.
- Don't use `transition: all`, and don't animate `height`, `width`, `filter`,
  `backdrop-filter` or `box-shadow`.
- Don't nest interactive elements (a button inside a clickable row) — one interactive node per
  row, secondary actions in the context menu.
- Don't hard-code light-mode colours in a CSS module; both themes must be expressible through
  tokens.
- Don't remove or hide a focus ring.
