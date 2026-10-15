# MarkTab 3 — Design System

MarkTab 3's visual language, quoted from the code that implements it. **Every value here comes
from `src/ui/styles/tokens.css`** plus the global element defaults in `src/ui/styles/base.css`;
if this document and those files disagree, the CSS wins and this document is a bug.

The token set is called **"Quiet Signal"**: a low-chroma neutral ramp, one blue accent family
that is never configurable (ADR-004), cool-tinted elevation that is never pure black, and a
hard budget of two blurred surfaces (ADR-006).

Two superseded v2 rules are explicitly *not* part of this system:

| v2 rule | v3 replacement |
| --- | --- |
| Serif headings (`Noto Serif SC`) with sans body | Sans headings, monospace for numerals — **ADR-005** |
| User-selectable accent colour ("Mist Blue" variant selector) | One accent family, `--accent*` — **ADR-004** |

---

## 1. Colour

Colour is applied through three layers, resolved in this order:

1. `:root` — light defaults, also used before hydration;
2. `[data-theme='dark']` — the resolved dark palette;
3. `[data-density]` / `[data-motion]` — non-colour preferences.

`public/theme-boot.js` writes `data-theme`, `data-density`, `data-motion`, `data-booting` and
`data-platform` on `<html>` before the first frame, so an explicit dark choice never flashes
white.

### 1.1 Neutral ramp

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` | `#f5f6f9` | `#0c0e12` | Page background (behind the ambient wash). |
| `--canvas-deep` | `#eceef3` | `#080a0d` | Lower stop of the ambient gradient. |
| `--surface-1` | `rgb(255 255 255 / 88%)` | `rgb(26 29 36 / 84%)` | Translucent card surface (rail, cards). |
| `--surface-2` | `#ffffff` | `#191c22` | Opaque raised surface (menus, dialogs, fields). |
| `--surface-3` | `#eceef3` | `#22262e` | Recessed fill (thumbnails, tiles, code). |
| `--surface-hover` | `rgb(19 26 45 / 4%)` | `rgb(255 255 255 / 6%)` | Hover wash over a surface. |
| `--surface-active` | `rgb(19 26 45 / 7%)` | `rgb(255 255 255 / 10%)` | Pressed/selected row wash. |
| `--overlay-scrim` | `rgb(20 24 33 / 32%)` | `rgb(4 6 9 / 56%)` | Behind the drawer, palette and dialogs. |
| `--text-1` | `#14161b` | `#edf0f5` | Primary text. |
| `--text-2` | `#4b5260` | `#a8b0bd` | Secondary text (hosts, meta). |
| `--text-3` | `#626976` | `#97a0b0` | Tertiary text (labels, hints). Tuned so it clears WCAG AA (4.5:1) on the lightest surface it can land on — 4.76:1 light, 4.92:1 dark on the palette's active row. |
| `--text-inverse` | `#ffffff` | `#0c0e12` | Text on an accent-filled control. |
| `--border-1` | `rgb(19 26 45 / 9%)` | `rgb(255 255 255 / 8%)` | Hairline dividers. |
| `--border-2` | `rgb(19 26 45 / 15%)` | `rgb(255 255 255 / 15%)` | Control outlines. |
| `--border-strong` | `rgb(19 26 45 / 26%)` | `rgb(255 255 255 / 26%)` | Emphasised outlines, hovered scrollbar thumb. |

### 1.2 Accent family (the only accent)

| Token | Light | Dark |
| --- | --- | --- |
| `--accent` | `#5b6cff` | `#7aa2ff` |
| `--accent-strong` | `#4150e4` | `#93b4ff` |
| `--accent-solid` | `#4150e4` | `#7aa2ff` |
| `--accent-hover` | `#5f70ff` | `#8cadff` |
| `--accent-soft` | `rgb(91 108 255 / 11%)` | `rgb(122 162 255 / 16%)` |
| `--accent-softer` | `rgb(91 108 255 / 6%)` | `rgb(122 162 255 / 9%)` |
| `--accent-border` | `rgb(91 108 255 / 34%)` | `rgb(122 162 255 / 38%)` |
| `--accent-contrast` | `#ffffff` | `#0b0f1a` |
| `--accent-glow` | `rgb(91 108 255 / 18%)` | `rgb(122 162 255 / 22%)` |

There is no second accent and no accent-colour preference. The accent marks state, focus and
key actions only; it is not a decorative fill and it is not a gradient.

Two tokens exist because the accent has two jobs that need different values: `--accent-solid`
is the accent *as a fill* behind `--accent-contrast` text (primary buttons), and
`--accent-strong` is the accent *as text or an icon* on a light surface or on `--accent-soft`
(active rail and settings items, link-style buttons, pin state). Using `--accent` for either
job fails WCAG AA — it is a mid-tone that reads well as a border, glow or bar, and badly as
text or as a label background. `tests/e2e/a11y.spec.ts` is the check that keeps this honest.

### 1.3 Status

| Token | Light | Dark |
| --- | --- | --- |
| `--success` / `--success-soft` | `#17805a` / `rgb(23 128 90 / 12%)` | `#46c390` / `rgb(70 195 144 / 15%)` |
| `--warning` / `--warning-soft` | `#9a6212` / `rgb(154 98 18 / 13%)` | `#e0a852` / `rgb(224 168 82 / 15%)` |
| `--error` / `--error-soft` | `#c93b41` / `rgb(201 59 65 / 12%)` | `#ff7a80` / `rgb(255 122 128 / 15%)` |
| `--focus` | `#4356ff` | `#8fadff` |

`--focus` is separate from `--accent`: status and focus must stay distinguishable from the
brand blue in both themes.

### 1.4 Ambient background

`body::before` paints one fixed, non-interactive wash: two `--accent-softer` radial pools plus a
`178deg` `--canvas → --canvas-deep` linear gradient, clipped with `transparent 62%` / `60%`. It
carries no information, stays below the 3% alpha threshold and costs a single paint. No other
decorative gradient is permitted except brand/icon surfaces and the popup primary treatment.
**Gradients on text are forbidden.**

## 2. Elevation

Cool-tinted, never pure black.

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-1` | `0 1px 2px rgb(19 26 45 / 6%), 0 1px 1px rgb(19 26 45 / 4%)` | `0 1px 2px rgb(0 0 0 / 40%)` |
| `--shadow-2` | `0 2px 4px rgb(19 26 45 / 5%), 0 10px 22px -14px rgb(19 26 45 / 26%)` | `0 2px 6px rgb(0 0 0 / 38%), 0 12px 26px -16px rgb(0 0 0 / 70%)` |
| `--shadow-3` | `0 4px 10px rgb(19 26 45 / 7%), 0 24px 48px -22px rgb(19 26 45 / 34%)` | `0 6px 14px rgb(0 0 0 / 42%), 0 28px 56px -24px rgb(0 0 0 / 78%)` |
| `--shadow-focus` | `0 0 0 3px rgb(91 108 255 / 22%)` | `0 0 0 3px rgb(122 162 255 / 26%)` |
| `--ring` | `0 0 0 2px var(--surface-2), 0 0 0 4px var(--focus)` | same definition |

`--shadow-1` is a resting card, `--shadow-2` a floating control (drawer toggle, sticky bar),
`--shadow-3` an overlay (drawer, menu, dialog). `--ring` is the two-part focus ring: a surface
gap plus the focus colour, so it stays visible on any surface.

## 3. Blur budget

`backdrop-filter` is allowed on exactly two surfaces — the surfaces that sit above live content:

| Token | Light | Dark | Surface |
| --- | --- | --- | --- |
| `--rail-blur` | `18px` | `22px` | The navigation rail |
| `--scrim-blur` | `6px` | `8px` | The overlay scrim (palette, drawer, dialogs) |

Everything else may be translucent (`--surface-1`) but must not blur. Blurring cards destroys
the layering that makes these two surfaces legible and pays a compositing cost on a page that
opens with every new tab (ADR-006).

## 4. Typography

### 4.1 Families and the sans/mono rule

```css
--font-sans: system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC',
  'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
--font-mono: ui-monospace, 'SF Mono', SFMono-Regular, 'JetBrains Mono', 'Cascadia Mono', Menlo,
  Consolas, monospace;
```

- **Headings and body: sans.** `base.css` sets `body { font-family: var(--font-sans); font-size:
  var(--text-md); }` and `h1..h4 { font-weight: var(--weight-semibold); line-height:
  var(--leading-tight); letter-spacing: var(--tracking-tight); text-wrap: balance; }`. There is
  no display face (ADR-005).
- **Numerals, dates and clock values: monospace.** The clock, rail statistics
  (`App.module.css → .statValue`) and formatted dates use `--font-mono`, so digits do not jitter
  as they change.
- Both stacks include Simplified Chinese fallbacks (`PingFang SC`, `Hiragino Sans GB`,
  `Microsoft YaHei`, `Noto Sans SC`) so the Chinese catalogue renders with the same metrics.

### 4.2 Scale

| Token | Value | Use |
| --- | --- | --- |
| `--text-2xs` | `0.6875rem` (11px) | Badges, `Kbd` chips |
| `--text-xs` | `0.75rem` (12px) | Meta, captions |
| `--text-sm` | `0.8125rem` (13px) | Dense rows, labels |
| `--text-md` | `0.875rem` (14px) | Body (the `body` default) |
| `--text-lg` | `1rem` (16px) | Emphasised body, section titles |
| `--text-xl` | `1.25rem` (20px) | View titles |
| `--text-2xl` | `1.625rem` (26px) | Page headings |
| `--text-clock` | `clamp(2.5rem, 6vw, 3.75rem)` | Hero clock |

Weights: `--weight-regular: 400`, `--weight-medium: 500`, `--weight-semibold: 600`,
`--weight-bold: 680`. Leading: `--leading-tight: 1.2`, `--leading-snug: 1.35`,
`--leading-normal: 1.5`. Tracking: `--tracking-tighter: -0.03em`, `--tracking-tight: -0.015em`,
`--tracking-wide: 0.02em`, `--tracking-caps: 0.08em`.

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

## 6. Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | `6px` | Badges, small chips |
| `--radius-sm` | `8px` | Buttons, fields, `Kbd` |
| `--radius-md` | `11px` | Rows, menu items |
| `--radius-lg` | `15px` | Cards, tiles |
| `--radius-xl` | `20px` | Panels, dialogs, palette |
| `--radius-full` | `999px` | Pills, avatars, status dots |

## 7. Motion

| Token | Value |
| --- | --- |
| `--dur-instant` | `80ms` |
| `--dur-fast` | `130ms` |
| `--dur-base` | `190ms` |
| `--dur-slow` | `320ms` |
| `--dur-tick` | `1000ms` |
| `--ease-out` | `cubic-bezier(0.16, 0.84, 0.44, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-emphasis` | `cubic-bezier(0.34, 1.32, 0.5, 1)` |

`motion` is an independent axis with three settings — `system`, `reduced`, `full`:

- `[data-motion='reduced']` zeroes every duration; transitions collapse to nothing rather
  than merely getting faster.
- `@media (prefers-reduced-motion: reduce)` applies the same zeroing to `:root:not([data-motion=
  'full'])`, so an explicit "full" choice is honoured while the OS default is respected.

The home clock dial (`ClockDial.module.css`) is the one place where a duration follows the data
rather than an interaction, and its two arcs differ on purpose. Both are redrawn every second from
the current time: the day arc eases over exactly `--dur-tick` — one tick — because at 0.23 px per
minute a shorter duration would turn a creep into a visible step, and the minute ring snaps in
`--dur-fast` because that is the one motion the dial is meant to show. Every other transition stays
at or below `--dur-slow`.

Motion never gates input: no transition may delay a keystroke response (principle 13).

## 8. Layout tokens

| Token | Value | Meaning |
| --- | --- | --- |
| `--rail-w` | `252px` | Navigation rail width |
| `--rail-w-rail` | `68px` | Collapsed (icon) rail width |
| `--content-max` | `1240px` | Content column max width |
| `--content-pad` | `var(--space-8)` | Content padding (`--space-6` when compact) |
| `--toolbar-h` | `56px` | Sticky toolbar / header height |
| `--control-h` | `34px` | Default control height |
| `--control-h-lg` | `40px` | Large control height |
| `--row-h` | `52px` | List row height |
| `--grid-min` | `236px` | Card grid floor |
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

`data-density="compact"` is a spacing/geometry axis, not a colour one. It overrides:

| Token | Comfortable | Compact |
| --- | --- | --- |
| `--control-h` | `34px` | `30px` |
| `--control-h-lg` | `40px` | `34px` |
| `--row-h` | `52px` | `42px` |
| `--grid-min` | `236px` | `204px` |
| `--content-pad` | `var(--space-8)` | `var(--space-6)` |
| `--text-md` | `0.875rem` | `0.8125rem` |
| `--text-lg` | `1rem` | `0.9375rem` |

## 9. Components

The design kit lives in `src/ui/components/`. Each component owns a CSS module next to it and
reads tokens only.

| Component | Exports | Notes |
| --- | --- | --- |
| `Button` | `Button`, `IconButton` | `variant`: `primary`, `secondary`, `ghost`, `danger`, `link`; `size`: `sm`, `md`, `lg`; optional `icon`. `IconButton` **requires** a `label`, used as the accessible name and the tooltip. |
| `TextField` | `TextField`, `SelectField` | Persistent label plus an optional hint/error line. |
| `Switch` | `Switch` | Labelled toggle; the whole row is the hit target. |
| `Segmented` | `Segmented` | Generic segmented control for mutually exclusive options: theme, density and motion in Settings, folder view and sort in the folder toolbar and in Settings → Folders. Takes a required `label` (accessible group name) and an optional `size`. |
| `Menu` | `Menu`, `MenuHost` | One menu at a time, positioned from an anchor rect; `MenuHost` renders whatever the overlay store requests. |
| `Dialog` | `Dialog` | Owns initial focus, the Tab ring, Escape, scroll lock and focus restoration. Consumers never re-implement that. |
| `Toast` | `ToastHost` | Polite, dismissible, never focuses itself. Undo actions ride here. |
| `Favicon` | `Favicon` | Site icon with a letter-tile fallback when the favicon fails or is disabled. |
| `CardGrid` | `CardGrid` | Grid with a `--grid-min` floor. |
| `SectionHeader` | `SectionHeader` | Title, meta line, optional right-aligned action. |
| `EmptyState` | `EmptyState` | Icon, title, description, optional action. |
| `Skeleton` | `Skeleton` | Loading placeholder that reserves final geometry. |
| `Kbd` | `Kbd`, `keycaps`, `isMacPlatform` | Renders `Mod+K` as ⌘K on macOS and Ctrl+K elsewhere. |
| `Icon` | `Icon`, `ICON_NAMES`, `IconName` | One 24×24 stroke icon set; `strokeWidth` `1.6` (or `0.9` for filled glyphs). |
| `cx` | `cx` | Class-name joiner. |

Feature-level patterns (`src/ui/features/**`) that behave like components: `LinkRow`,
`LinkCard`, the folder grid/toolbar/breadcrumb, the palette panel and rows, the settings rows
and sections, and the rail.

## 10. Responsive contract

The shell is a navigation rail plus one content column and nothing else (ADR-012), and the rail
has exactly one breakpoint, mirrored in CSS and JS (ADR-013): the media queries in
`App.module.css` must stay in sync with `DRAWER_QUERY = '(max-width: 1200px)'` in `App.tsx`,
where `useMediaQuery` is the only JS reader.

| Range | Behaviour |
| --- | --- |
| **> 1200 px** | Fixed rail: two-column grid, rail as a real column, collapsible to the `68px` icon rail (`--rail-w-rail`). |
| **≤ 1200 px** | Drawer: single column, the rail becomes a `position: fixed` overlay translated off-canvas, opened by the floating `drawerToggle`; opening paints a scrim with `--overlay-scrim` + `--scrim-blur`, and the toggle hides while the drawer is open. The drawer closes on navigation and when the window grows. |
| **≤ 768 px** | Compact. The shell itself changes only its content padding, to `var(--space-5) var(--space-4) var(--space-8)` (ADR-013); individual features adapt themselves at the same width: the hero collapses to one column, the palette moves to `6vh` top padding, settings rows wrap, the settings nav stops being sticky, breadcrumbs and the folder toolbar reflow. |

At every width the content column scrolls, not the page: `body { overflow: hidden; }` and
`.content { overflow-y: auto; overscroll-behavior: contain; }`. When an overlay is open,
`body[data-scroll-locked='true'] { overflow: hidden; }`.

## 11. Do / Don't

**Do**

- Read tokens for colour, type, space, radius, duration and easing; add a token before adding a
  one-off value.
- Keep one accent family, one icon set (`Icon`) and one focus ring (`--ring`).
- Reserve final geometry for loading content (`Skeleton`, `--row-h`, `--grid-min`) so nothing
  shifts (principle 15).
- Render numerals, dates and the clock in `--font-mono`.
- Keep targets at least 24×24 CSS px, aiming at `--control-h` / `--control-h-lg`, and give every
  icon-only control an accessible name.
- Express states with `--surface-hover` / `--surface-active` / `--accent-soft` rather than new
  colours.

**Don't**

- Don't add `backdrop-filter` outside the rail and the scrim.
- Don't put a gradient behind text or a bookmark title.
- Don't reintroduce serif headings or a second display face.
- Don't ship a theme-colour / accent picker.
- Don't nest interactive elements (a button inside a clickable row) — one interactive node per
  row, secondary actions in the context menu.
- Don't animate a response to input, or delay filtering behind a transition.
- Don't hard-code light-mode colours in a CSS module; both themes must be expressible through
  tokens.
- Don't remove or hide a focus ring.
