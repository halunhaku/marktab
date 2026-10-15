# MarkTab 3 — Design Principles

MarkTab 3 is a keyboard-first bookmark new tab page: a searchable command palette, a
persistent folder rail, a folder grid with item rows, transient toasts, and a settings
surface, in light and dark themes, driven by keyboard *and* mouse, over libraries that
can hold thousands of bookmarks. These principles are the rules we design those surfaces
by. Each one is deliberately concrete: it names the evidence behind it and the exact
MarkTab surface it governs.

They build on the existing foundations: the HALUNHAKU "Mist Blue" single-accent language,
the tokens in `src/ui/styles/tokens.css` (`--dur-*`, `--focus`, `--control-h`, `--row-h`,
`--grid-min`), the primitives in `src/ui/components/`, and the state APIs in
`src/ui/state/` (`route`, `paletteOpen`, `menuState`, `dialogState`, `toasts`). The rules
extend those foundations; they do not replace them.

---

## Principles

### 1. Latency is the interface

**Rule:** Every keystroke-triggered visual response — palette filtering, result text,
active-row movement — paints in under 100 ms.

**Why:** Superhuman treats 100 ms as the ceiling for every interaction because at or below
it an action "feels instantaneous"
([Superhuman, *Built for speed*](https://blog.superhuman.com/superhuman-is-built-for-speed/)).
Google's responsiveness metric, Interaction to Next Paint, sets the "good" bar at 200 ms
for 75% of interactions and counts the full input-to-paint duration of *all* interactions,
not just the first ([web.dev, *INP*](https://web.dev/articles/inp)). Type-to-filter runs on
every keypress, so it must live in the tighter 100 ms band, not the page-level one.

**In MarkTab:** Palette filtering reads the in-memory bookmark store and the already-built
search index, never `chrome.bookmarks.*` per keystroke. Typing never awaits a query: keep
the previous result set until the next is ready rather than flashing an empty state.

### 2. Keyboard and mouse are peers, not fallbacks

**Rule:** Every action reachable with the mouse is reachable from the keyboard, and every
keyboard action that has a visible affordance names its key.

**Why:** The WAI-ARIA Authoring Practices require all functionality to be operable through
a keyboard interface and composites to manage focus explicitly
([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).
Linear found that contextual menus "are a great tool for onboarding and teaching people how
to use our popular keyboard shortcuts," so the mouse path is also the discovery path for the
keyboard path ([Linear, *Invisible details*](https://linear.app/blog/invisible-details)).

**In MarkTab:** A bookmark row opens on Enter and on click; its context menu (`openMenuAt`)
offers Rename/Move/Delete and prints the matching key beside each item. The rail folder tree
and folder grid are drivable by arrows, Home/End and type-ahead — not only by pointer.

### 3. The palette is one combobox, and focus never leaves the field

**Rule:** The palette input is `role="combobox"` with `aria-expanded`, `aria-controls` and
`aria-activedescendant`; DOM focus stays in the input and only the *active option* moves.

**Why:** The APG combobox pattern specifies this: "When a descendant of a listbox, grid, or
tree popup is focused, DOM focus remains on the combobox and the combobox has
`aria-activedescendant` set to a value that refers to the focused element within the popup"
([APG, *Combobox Pattern*](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)). Moving real
DOM focus into result rows would drop the caret out of the field and break continuous typing.

**In MarkTab:** The palette input owns `aria-activedescendant`, pointing at the highlighted
result's id; results are a `role="listbox"` of `role="option"` rows with `aria-selected`
tracking the active descendant. Arrow keys call `preventDefault()` so the caret never jumps.

### 4. Group and rank results by context, not alphabetically

**Rule:** Order palette results by the user's current context — current folder or view
first — then group by type behind visible section headers.

**Why:** When Linear rebuilt its command menu it grouped commands by function and prioritised
the group matching the current view "based on what you are focusing on, or the view you're
currently in… making it easier to skim over large sets"
([Linear, *New command menu*](https://linear.app/changelog/2019-12-18-new-command-menu)).
Alphabetical order ignores intent and forces the eye to scan the whole list.

**In MarkTab:** Reuse the existing sections (`search.section.bookmarks`, `.folders`,
`.actions`, `.recent`, `.pinned`). Opened from a folder route, folder-scoped results rank
above global ones; recently-opened items surface before the long tail.

### 5. Announce asynchronous results; never steal focus

**Rule:** Result-count changes, search failures and background updates go through a polite
live region; focus stays where the user put it.

**Why:** `aria-live` exists because "screen readers… only focus on one part of the page at a
time; and that part may not be where the update is"; `polite` presents updates "at the next
graceful opportunity" without interrupting the current task
([MDN, `aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)).
Keeping users informed of status is heuristic #1
([NN/g, *10 Usability Heuristics*](https://www.nngroup.com/articles/ten-usability-heuristics/)).

**In MarkTab:** The palette writes its count into a `role="status"` / `aria-live="polite"`
node (the node that already renders `search.resultsCount`), so sighted and screen-reader
users get the same fact once. `toast.searchFailed` is announced, not thrown at the eye only.

### 6. Dialogs own their focus contract completely

**Rule:** Every modal sets initial focus inside itself, contains Tab/Shift+Tab, closes on
Escape, locks background scroll, and returns focus to the invoking element.

**Why:** The APG modal-dialog pattern requires that "when a dialog opens, focus moves to an
element inside the dialog," that Tab stay within it, that Escape close it, and that "when a
dialog closes, focus returns to the element that invoked the dialog"
([APG, *Dialog (Modal) Pattern*](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
Without restoration, browsers move focus to `<body>`, "effectively causing a loss of focus"
([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).

**In MarkTab:** `src/ui/components/Dialog.tsx` already owns initial focus, the tab ring,
Escape, scroll locking and restoration; `RenameDialog`, `MoveDialog` and `DeleteDialog` must
not re-implement it. The move dialog's folder `listbox` (`role="option"`, `aria-selected`)
keeps its navigation inside the modal's ring.

### 7. Escape peels exactly one layer — and always does something

**Rule:** Escape is a stack: it closes the topmost overlay or clears the active query, one
level per press, and is never a no-op while a layer is open.

**Why:** "User control and freedom" is a core heuristic: users need a clearly marked exit to
undo an action ([NN/g, *10 Usability Heuristics*](https://www.nngroup.com/articles/ten-usability-heuristics/)).
The APG makes Escape the standard dismissal for dialogs, menus and listboxes
([APG, *Dialog (Modal)*](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
[APG, *Menu Button*](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)).

**In MarkTab:** Fixed precedence: open dialog → open context menu → open palette (clears the
query first, then closes) → folder-local filter → nothing. `Dialog` and `Menu` already
`stopPropagation()` on Escape; keep the palette on the same contract so one press never
closes two things.

### 8. One tab stop per composite; arrows move inside

**Rule:** A rail tree, folder grid or result list is a single Tab stop; roving `tabindex`
(`0` on the active item, `-1` on the rest) plus arrow keys handle movement.

**Why:** The APG advises managing focus inside composite widgets rather than flooding the tab
sequence, and keeping keyboard focus order aligned with reading order
([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).
Selection following focus is appropriate for single-select lists because it keeps navigation
instantaneous and speech readable.

**In MarkTab:** `Segmented` already implements this (`tabIndex={selected ? 0 : -1}`, arrows,
Home/End), as does `Menu`. Apply the same to the rail's folder tree, the folder grid tiles,
and the palette result list — one Tab enters the region, the next Tab leaves it.

### 9. Never shadow a browser-reserved chord

**Rule:** The global keymap uses ⌘K (palette) and free chords only; it must not intercept
⌘L, ⌘T, ⌘W, ⌘N, ⌘R, ⌘D, ⌘⇧T or Tab.

**Why:** Apple's HIG states that "Apple defines standard keyboard shortcuts to work
consistently across the system and most apps, helping people transfer their knowledge to new
experiences" ([Apple HIG, *Keyboards*](https://developer.apple.com/design/human-interface-guidelines/keyboards)).
The APG permits overriding a browser key only when the app function is frequent, the browser
function is rare, and an alternative path exists — a bar a new-tab page does not meet for Tab
or address-bar chords ([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).

**In MarkTab:** ⌘K opens the palette (already wired via `Mod+K` in `HomeView`). Tab is never
captured, so browser chrome stays reachable; the palette list uses arrows, not Tab, so Tab
leaving the composite is expected. `settings.shortcuts.*` documents these bindings and must
match the handlers.

### 10. Teach the shortcut at the moment of the action

**Rule:** Any button or menu item with a keyboard equivalent renders its `Kbd` chip inline,
so the shortcut is learned by recognition, not memorisation.

**Why:** Heuristic #6 is "Recognition rather than recall: minimize the user's memory load by
making elements, actions, and options visible"
([NN/g, *10 Usability Heuristics*](https://www.nngroup.com/articles/ten-usability-heuristics/)).
Linear leans on this deliberately: a contextual menu lets you "remind yourself of the
keyboard shortcut" beside the mouse action
([Linear, *Invisible details*](https://linear.app/blog/invisible-details)).

**In MarkTab:** `Kbd` already renders platform-correct glyphs (⌘ vs Ctrl). Palette rows
surface `search.hint.open`/`newTab`/`web`/`move`; Settings → Keyboard shortcuts
(`settings.shortcuts.*`) is the canonical list, and its values must match the real handlers.

### 11. Type-ahead must be predictable in every list

**Rule:** In the palette, rail and folder grid, typing a printable character moves the active
item to the next whose label starts with it; Home/End jump to the ends.

**Why:** The APG listbox pattern defines these bindings as the expected list behaviour and
warns that values should read as a short unit of speech so long labels don't force re-reading
([APG, *Listbox Pattern*](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)). Consistent
movement is what makes focus land where users guess it will
([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).

**In MarkTab:** The rail folder tree supports first-letter jump and Home/End; the folder grid
does the same in reading order; the palette's typed text is itself the filter, so type-ahead
is the filter (Home/End still move the active option).

### 12. Focus is always visible and never obscured

**Rule:** Every focusable element shows the token focus ring; sticky chrome and overlays must
not hide the focused element when a list scrolls.

**Why:** WCAG 2.4.7 requires a visible focus indicator on every keyboard-operable component
([WCAG 2.4.7 *Focus Visible*](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html));
WCAG 2.4.11, new in 2.2, requires the focused element not be *completely* hidden by sticky
headers, footers or overlays
([WCAG 2.4.11 *Focus Not Obscured*](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).
The ring is non-text content, so it also needs 3:1 contrast against adjacent colours
([WCAG 1.4.11 *Non-text Contrast*](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).

**In MarkTab:** `base.css` gives `:focus-visible` a 2 px `var(--focus)` outline with offset;
keep it. The sticky toolbar and rail must not overlap a focused grid tile — use
`scroll-padding` so arrowed-to items scroll clear. `--focus` is `#4356ff` light / `#8fadff`
dark; verify both reach 3:1 on `--surface` and on the rail glass.

### 13. Motion never gates input, and respects the reduced-motion switch

**Rule:** Transitions are non-blocking and optional; any interaction-triggered animation is
disabled under `prefers-reduced-motion: reduce` and the in-app motion setting.

**Why:** WCAG 2.3.3 requires that interaction-triggered motion animation "can be disabled,
unless the animation is essential," and names `prefers-reduced-motion` as a sufficient
technique ([WCAG 2.3.3 *Animation from Interactions*](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).
Vestibular reactions — dizziness, nausea, headaches — are the concrete harm.

**In MarkTab:** `tokens.css` already collapses every `--dur-*` token to `0ms` under
`[data-motion='reduced']` and the OS media query; keep all transitions expressed in tokens so
nothing bypasses it. Opening or closing a dialog or toast never waits on a transition before
accepting the next keypress.

### 14. Toasts are status, not interruption

**Rule:** Toasts are polite, non-modal, dismissible, and never move focus or block the surface
beneath them.

**Why:** `aria-live="polite"` announces updates without interrupting the current task, and the
guidance warns against `assertive` unless the interruption is imperative
([MDN, `aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)).
Auto-dismissing content also falls under Pause/Stop/Hide, which requires a way to control
movement that starts automatically
([WCAG 2.2.2 *Pause, Stop, Hide*](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).

**In MarkTab:** `Toast.tsx` already uses `role="status" aria-live="polite"`; keep the polite
channel for confirmations (`toast.dataCleared`) and reserve assertive for irreversible
failures. Toasts sit above content but below dialogs/menus in the `--z-*` scale, expose a
dismiss control, and never auto-focus.

### 15. Loading must not move the layout

**Rule:** Reserve the final geometry of grid tiles, item rows and palette results; arriving
content must not shift what is already painted.

**Why:** Cumulative Layout Shift measures how often content shifts unexpectedly, and
reserving space for late-arriving content is the core mitigation
([web.dev, *Cumulative Layout Shift*](https://web.dev/articles/cls)). Shifts are worst on a
new tab page, where they move the very thing the user is about to click and cause mis-clicks.

**In MarkTab:** `HomeSkeleton` already renders fixed-height placeholders; use `--row-h` /
`--grid-min` so real rows land in the same boxes. The folder grid reserves full tile size
before favicons resolve, and the palette keeps its panel height stable as the result count
changes (scroll the list body, don't resize the panel).

### 16. Targets are big enough, and icon-only controls are named

**Rule:** Every interactive target is at least 24×24 CSS px (aim for the 34–40 px
`--control-h` tokens), and every icon-only button carries an accessible name.

**Why:** WCAG 2.5.8 requires pointer targets to be at least 24×24 CSS px or sufficiently
spaced ([WCAG 2.5.8 *Target Size (Minimum)*](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html));
Apple's accessibility guidance is to support the full range of input including keyboard and
assistive tech ([Apple HIG, *Accessibility*](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
Unlabelled icon buttons are unusable by voice control and screen readers.

**In MarkTab:** `--control-h` (34 px) and `--row-h` (52 px, 42 px compact) already clear the
bar; keep hit areas at that size even when the glyph is 16 px. `Icon` sets `aria-hidden` when
no `title` is given, so every icon-only `Button` in the rail, item rows and toolbar must pass
a localised `label`/`title`.

### 17. Large libraries stay bounded and responsive

**Rule:** Render a bounded window of rows and reveal more incrementally; never block the main
thread on the full library.

**Why:** INP specifically punishes long interactions caused by heavy synchronous main-thread
work ([web.dev, *INP*](https://web.dev/articles/inp)). With thousands of bookmarks, unbounded
DOM rendering — not the network — is the dominant risk.

**In MarkTab:** Use the existing `useIncremental` hook to reveal item rows in pages instead
of rendering a whole folder, and cap palette results with `search.limitHint` ("Showing the
top {count} of {total}") rather than growing without limit. Favicons load lazily; a missing
favicon renders the placeholder, never a layout-affecting image jump.

---

## Keyboard-first checklist

- **Focus order** — DOM order equals visual and reading order; rail → toolbar → content are
  tabbed in that sequence, and reorders are done by moving DOM nodes, not positive `tabindex`
  ([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).
- **Composite focus** — the rail tree, folder grid and result list are each *one* Tab stop
  with roving `tabindex`; Tab enters and leaves, arrows move within
  ([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).
- **Visible focus** — `:focus-visible` ring on every focusable node, never removed, never
  hidden by sticky chrome ([WCAG 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).
- **Escape** — peels one layer: dialog → menu → palette (clear, then close) → folder filter →
  no-op. One press, one effect.
- **Roving tabindex** — active item `tabindex="0"`, siblings `-1`; focus and selection are
  visually distinct ([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).
- **Reserved chords** — do not capture ⌘L, ⌘T, ⌘W, ⌘N, ⌘R, ⌘D, ⌘⇧T, or Tab; the only global
  binding is ⌘K (palette), plus non-conflicting single keys inside composites
  ([Apple HIG, *Keyboards*](https://developer.apple.com/design/human-interface-guidelines/keyboards)).
- **No autofocus on paint** — focus moves into the page only for a single primary function a
  user almost always wants (the palette on explicit ⌘K, not on new-tab load)
  ([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).

## Accessibility checklist

- **Contrast, both themes** — body text ≥ 4.5:1, large text ≥ 3:1, non-text UI (focus ring,
  icons, control borders) ≥ 3:1, checked separately for light and dark
  ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- **Live regions for async results** — palette count/results and toast messages use
  `aria-live="polite"`; a single dedicated announcer avoids duplicate speech
  ([MDN, `aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)).
- **`aria-activedescendant` in the palette** — the input carries it, the active option carries
  `aria-selected="true"`; DOM focus never leaves the field
  ([APG, *Combobox*](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)).
- **Focus restoration after dialogs** — focus returns to the invoking control, or to a logical
  neighbour if it no longer exists — never to `<body>`
  ([APG, *Dialog (Modal)*](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- **Reduced motion** — every transition derives from `--dur-*`; the reduced-motion switch and
  `prefers-reduced-motion` zero them out
  ([WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).
- **Target sizes** — interactive targets ≥ 24×24 CSS px, ideally the 34–40 px control tokens;
  icon-only buttons have accessible names
  ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Apple HIG, *Accessibility*](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- **Hover/focus content** — tooltips and menus revealed on hover or focus are dismissible,
  hoverable and persistent
  ([WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)).

## Anti-patterns

- **Blur everywhere.** Glass is a fixed budget: only the rail and the palette scrim use
  `backdrop-filter` (see `DESIGN_SYSTEM.md` / `tokens.css`). Blurring every card destroys the
  layering that makes those two surfaces legible and pushes the page toward the main-thread
  cost INP penalises ([web.dev, *INP*](https://web.dev/articles/inp)).
- **Gradients on text.** Decorative gradients are limited to the ambient background,
  brand/icon surfaces and the popup primary treatment. A gradient behind a bookmark title makes
  contrast unmeasurable and fails 1.4.3
  ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
- **Nested interactive elements.** A button inside a row that is itself a button (or a link
  inside a link) gives ambiguous focus and double activation; keep one interactive node per row
  and move secondary actions to a context menu
  ([APG, *Developing a Keyboard Interface*](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).
- **Mystery-meat icon buttons.** Unlabelled icons force recall; every icon-only control needs a
  name and, where a key exists, a `Kbd` hint
  ([NN/g, *10 Usability Heuristics*](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- **Layout shift while loading.** Never let a skeleton, favicon, or late result set reflow
  content already on screen — reserve the final box
  ([web.dev, *Cumulative Layout Shift*](https://web.dev/articles/cls)).
- **Animations that delay input.** An opening transition that must finish before the field
  accepts typing, or a result animation that runs before the active row updates, throws away
  the 100 ms budget
  ([Superhuman, *Built for speed*](https://blog.superhuman.com/superhuman-is-built-for-speed/)).
- **Focus-stealing announcements.** Moving focus into a toast, or focusing the first result
  instead of leaving focus in the palette input, breaks typing and disorients screen-reader
  users ([MDN, `aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live), [APG, *Combobox*](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)).

## References

- WAI-ARIA Authoring Practices Guide — [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/), [Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- WCAG 2.2 Understanding — [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html), [2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- MDN — [`aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)
- Apple Human Interface Guidelines — [Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- Superhuman — [Superhuman is built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/)
- Linear — [Invisible details: building contextual menus](https://linear.app/blog/invisible-details), [New command menu](https://linear.app/changelog/2019-12-18-new-command-menu)
- Raycast — [A Technical Deep Dive Into the New Raycast](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- Notion — [Keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts)
- Things (Cultured Code) — [Things Blog](https://culturedcode.com/things/blog/)
- web.dev — [Cumulative Layout Shift (CLS)](https://web.dev/articles/cls), [Interaction to Next Paint (INP)](https://web.dev/articles/inp)
- Nielsen Norman Group — [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)
