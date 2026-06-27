# MarkTab New Tab UI Layout Design

## Goal

Refine the MarkTab new tab page for wide Windows displays while preserving its quiet, light-green HALUNHAKU visual language and all existing bookmark, search, keyboard, recent-item, folder, and theme behavior.

The primary success condition is that five pinned bookmarks form one row on common 1920px, 2560px, and 3840px desktop layouts, including practical Windows scaling configurations. A sixth pinned bookmark starts a second row.

## Scope

This change is limited to the home view in `newtab.html`, `newtab.js`, and `styles.css`.

Allowed changes:

- Home-view layout, spacing, responsive breakpoints, surface treatment, and typography.
- Presentation-only markup used to group recent bookmarks into two visual cards.
- Home-view favicon shell sizing and visual treatment.
- A subtle background glow that preserves text contrast.

Out of scope:

- Bookmark data structures, sorting, pinning, navigation, visit tracking, and folder visibility logic.
- Search behavior, keyboard shortcuts, web-search data flow, or search-engine integration.
- Folder-view and popup behavior.
- Permissions, manifest changes, dependencies, or remote resources.
- Complex animation or a new visual system.

## Chosen Direction

Use the approved **Balanced Modules** direction:

- A centered, wider page container.
- A deterministic five-column pinned grid on desktop.
- Two independent Recent cards, each containing two rows.
- One independent Folders panel containing the existing folder chips.
- Restrained translucent white surfaces without runtime `backdrop-filter` glassmorphism.

## Layout

### Page and hero

- The home container uses `width: min(88vw, 1680px)` and remains centered.
- The top time, date, search field, and shortcut hints remain centered.
- The search field uses `width: clamp(520px, 44vw, 760px)`, bounded by the available mobile width.
- Top padding, hero margin, section spacing, and bottom padding are reduced so Recent and Folders appear earlier without making the page dense.
- The page retains `overflow-x: hidden`, while grid children and text containers retain `min-width: 0` to prevent content-driven overflow.

### Pinned

- Desktop layouts use five equal columns with a maximum of five cards per row.
- A sixth item begins the second row.
- Responsive breakpoints reduce the grid to three, two, and one column as the CSS viewport narrows.
- Desktop cards are approximately 140px tall, with a permitted range of 132-150px.
- Card titles and domains remain single-line ellipsized text so long content cannot change grid geometry.
- Existing empty pinned placeholders remain behaviorally unchanged and follow the same responsive grid.

The fixed five-column desktop rule is preferred over unrestricted `auto-fit`: it guarantees both the requested five-card first row and the requested second row for item six.

### Recent

- The home view continues to show at most four recent bookmarks.
- Presentation markup groups the four results into two containers of two rows each.
- Each container has one quiet surface, rounded border, and subtle shadow.
- The divider appears between the two rows inside each container.
- At narrow widths the two containers stack into one column.
- Empty-state behavior and the conditional View all action remain unchanged.

### Folders

- Folders remains after Recent but receives the same section rhythm instead of being pushed toward the viewport bottom.
- Folder chips sit inside one full-width, softly tinted, large-radius panel.
- Chip gaps, padding, and count badges are normalized.
- Existing folder-click and hidden-folder recovery behavior remain unchanged.

## Visual Treatment

### Surfaces and background

- Continue using the current light-green background and existing theme tokens.
- Add only a low-opacity radial green glow to create depth without becoming decorative wallpaper.
- Pinned cards, Recent cards, and the Folders panel use white or token-based translucent surfaces, a 1px green-gray border, and green-tinted shadows.
- Do not add decorative gradients, saturated colors, heavy shadows, or runtime backdrop blur.

### Favicon shells

- Home Pinned and Recent favicon shells use a shared `42px × 42px` footprint.
- Shell radius is 14px with a low-opacity green background.
- Favicon images use `24px × 24px` and `object-fit: contain`.
- Initial-letter fallbacks retain the existing load/error behavior and use the same shell dimensions.

### Motion and accessibility

- Preserve only restrained hover feedback: border-color change, light shadow change, and at most a 1-2px vertical shift.
- Remove favicon scaling from the home-card hover treatment.
- Preserve current focus-visible styling, semantic section labels, accessible button labels, and reduced-motion behavior.

## Implementation Boundaries

- `newtab.html`: add or adjust presentation-only wrappers/classes if required by the approved module structure.
- `newtab.js`: change only Recent presentation markup grouping; preserve the source list, four-item limit, event binding, View all action, and tracking behavior.
- `styles.css`: implement width, grid, spacing, card, favicon, Recent, Folders, background, theme, and responsive changes.
- No new package or runtime dependency is permitted.

## Responsive Rules

- Wide desktop: five Pinned columns; two Recent columns.
- Medium desktop or scaled viewport: prefer five Pinned columns while cards remain usable; then reduce to three columns before content can clip.
- Tablet: three or two Pinned columns depending on usable CSS width; one Recent column.
- Mobile: two columns, then one Pinned column at the existing narrow breakpoint; one Recent column.
- At every viewport, `document.documentElement.scrollWidth` must not exceed the client width.

Breakpoints will be selected from rendered evidence rather than device names alone, because Windows display scaling changes the effective CSS viewport.

## Verification

### Automated release checks

- Run `npm run validate`.
- Run `npm run package`.

### Rendered checks

- Load the extension home view with representative bookmarks and exactly five pinned items.
- Check CSS viewport widths representing 1920px, 2560px, and 3840px displays plus practical scaled-width equivalents.
- Confirm five pinned cards share the first row and item six starts row two.
- Confirm Recent renders as two cards with two rows each and stacks at the narrow breakpoint.
- Confirm Folders appears directly after Recent with consistent spacing.
- Confirm no horizontal scrollbar, clipping, overlap, or broken long-title behavior.
- Confirm light and dark themes remain readable.
- Exercise search opening, keyboard close, a pinned link, View all, and a folder chip to ensure presentation changes did not alter behavior.

## Acceptance Criteria

- Five pinned bookmarks appear in one row on supported desktop and scaled-wide viewports.
- Six pinned bookmarks appear as five plus one, not four plus two or an over-compressed six-column row.
- Recent is visually organized into two complete modules on desktop.
- Folders has a distinct panel and is not stranded near the page bottom.
- Home-view favicon shells have consistent dimensions and visual weight.
- The page remains calm, low-contrast, dependency-free, theme-safe, and free of horizontal overflow.
- Existing extension logic and permissions are unchanged.
- Release validation and packaging complete successfully.
