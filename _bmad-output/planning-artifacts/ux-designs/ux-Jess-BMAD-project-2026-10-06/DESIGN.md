---
name: 'Traveller Sudoku'
description: 'Calm desktop Sudoku where every solve sends a Postcard. Vintage Postcard direction, Airmail palette; Daylight (light) by default, Lamplight (dark) as a setting.'
status: final
created: '2026-10-06'
updated: '2026-10-06'
sources:
  - _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/mockups/direction-vintage-postcard.html
  - _bmad-output/planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/mockups/color-themes-1.html
colors:
  # Daylight (default theme). Unsuffixed names.
  desk: '#F5EFDF'
  card: '#FFFAF0'
  ink: '#1F2A44'
  ink-muted: '#4E5670'
  given: '#1A2036'
  player-ink: '#24418A'
  note: '#535A70'
  rule-thin: '#73799A'
  rule-box: '#1F2A44'
  fill-selected: '#F6D3D0'
  fill-highlight: '#E6EAF5'
  fill-same-digit: '#DFE4F4'
  mistake: '#8A4B16'
  airmail-red: '#B3262F'
  postmark: '#3C4A6E'
  focus: '#1F3A7A'
  # Lamplight (dark theme). Same roles, -lamplight suffix.
  desk-lamplight: '#1B1A21'
  card-lamplight: '#25242C'
  ink-lamplight: '#F4ECD8'
  ink-muted-lamplight: '#C8C0AD'
  given-lamplight: '#F6EFDC'
  player-ink-lamplight: '#A9C0F5'
  note-lamplight: '#B8B4C4'
  rule-thin-lamplight: '#8E8CA0'
  rule-box-lamplight: '#D8D2C0'
  fill-selected-lamplight: '#5A2A30'
  fill-highlight-lamplight: '#2E3348'
  fill-same-digit-lamplight: '#343A55'
  mistake-lamplight: '#E8B07A'
  airmail-red-lamplight: '#F08A8F'
  postmark-lamplight: '#A8B6E0'
  focus-lamplight: '#FFD27A'
typography:
  # One family everywhere: system serif stack, nothing downloaded (AD-12).
  brand:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
    note: 'italic'
  city-title:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 30px
    fontWeight: '400'
    lineHeight: '1'
  body:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  hint-text:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.45'
  postcard-line:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.55'
    note: 'italic'
  label:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 15px
    fontWeight: '400'
    letterSpacing: 0.12em
    note: 'small-caps'
  button:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 16px
    fontWeight: '400'
    letterSpacing: 0.08em
    note: 'small-caps'
  meta:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  caption:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 12px
    fontWeight: '400'
    note: 'italic'
  cell-given:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 30px
    fontWeight: '700'
    note: 'upright'
  cell-player:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 30px
    fontWeight: '400'
    note: 'italic'
  cell-note:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
    fontSize: 12px
    fontWeight: '400'
    note: 'upright'
rounded:
  none: 0px
  sm: 2px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 44px
  cell: 58px
  grid-pad: 14px
  app-gutter-x: 44px
  app-gutter-y: 26px
  side-column-max: 440px
  rule-thin-width: 1px
  rule-box-width: 2px
  rule-frame-width: 3px
  min-target: 24px
components:
  grid-frame:
    background: '{colors.card}'
    border: '{spacing.rule-frame-width} solid {colors.rule-box}'
    padding: '{spacing.grid-pad}'
    shadow: '0 6px 18px rgba(31,42,68,.18)'
    rotate: '-0.4deg'
  grid-cell:
    size: '{spacing.cell}'
    background: '{colors.card}'
    rule: '{spacing.rule-thin-width} solid {colors.rule-thin}'
    box-rule: '{spacing.rule-box-width} solid {colors.rule-box}'
  grid-cell-given:
    foreground: '{colors.given}'
    typography: '{typography.cell-given}'
  grid-cell-player:
    foreground: '{colors.player-ink}'
    typography: '{typography.cell-player}'
  grid-cell-notes:
    foreground: '{colors.note}'
    typography: '{typography.cell-note}'
    layout: '3x3 mini-grid, digit n at position n'
  grid-cell-selected:
    background: '{colors.fill-selected}'
    mark: 'inset 0 0 0 3px {colors.airmail-red}'
  grid-cell-highlight:
    background: '{colors.fill-highlight}'
    mark: 'edge tick on grid frame for row and column, {colors.airmail-red}, 12x7px triangle'
    box-mark: 'corner ticks inside the four corners of the active box, {colors.airmail-red}, 2px L-shapes 8px long'
  grid-cell-same-digit:
    background: '{colors.fill-same-digit}'
    mark: 'underline 2px {colors.airmail-red}, offset 4px'
  grid-cell-mistake:
    foreground: '{colors.mistake}'
    mark: 'dotted underline 2px {colors.mistake}, offset 4px + 6px corner dot top-right ({rounded.full})'
  grid-cell-hint-focus:
    mark: 'inset 0 0 0 2px dashed {colors.postmark}; drawn 3px inside the selected ring when both apply'
  digit-pad-key:
    background: '{colors.card}'
    border: '2px dashed {colors.rule-thin}'
    digit: '{typography.cell-player.fontSize} {colors.ink}, upright'
    count: '{typography.caption} {colors.ink-muted}'
    gap: '10px'
  digit-pad-key-current:
    border: '2px solid {colors.airmail-red}'
    background: '{colors.fill-highlight}'
  digit-pad-key-done:
    digit: '{colors.ink-muted}, line-through'
    count: 'Done'
  mode-indicator:
    border: '1px solid {colors.ink}'
    active-background: '{colors.ink}'
    active-foreground: '{colors.card}'
    status-line: '{typography.meta} italic {colors.ink-muted}'
    target: '{spacing.min-target} x {spacing.min-target} minimum per segment'
  button:
    background: 'transparent'
    foreground: '{colors.ink}'
    border: '3px double {colors.rule-box}'
    typography: '{typography.button}'
    radius: '{rounded.none}'
    kbd: '{typography.caption} {colors.ink-muted}'
  button-primary:
    background: '{colors.ink}'
    foreground: '{colors.card}'
    border: '3px double {colors.card}'
    outline: '2px solid {colors.ink}'
  link:
    foreground: '{colors.airmail-red}'
    decoration: 'underline, offset 3px'
  header:
    rule: '3px double {colors.ink}'
    brand: '{typography.brand} {colors.ink}'
    tagline: '{typography.label} {colors.airmail-red}'
    city-title: '{typography.city-title} {colors.ink}'
    city-meta: '{typography.body} {colors.ink-muted}'
  nav-link:
    typography: '{typography.label}'
    foreground: '{colors.ink}'
    active: '{colors.airmail-red}, 1px underline {colors.airmail-red}'
    target: '{spacing.min-target} x {spacing.min-target} minimum'
  stamp:
    size: '74x88px (header) · 52x62px (Postcard)'
    perforation: '5px dotted {colors.desk}, outline 2px {colors.card}'
    face: '{colors.airmail-red}'
    face-text: '{colors.card}, 9px caps'
    rotate: '3deg'
  postmark:
    stroke: '{colors.postmark}'
    shape: 'double circle, 2px outer + 1px inner, city name caps + date'
    date-format: 'DD MMM YY, caps (06 OCT 26)'
    opacity: '0.75'
  airmail-stripe:
    width: '8px'
    pattern: 'repeating -45deg: {colors.airmail-red} 12px, {colors.desk} 8px, {colors.rule-box} 12px, {colors.desk} 8px'
  postcard:
    background: '{colors.card}'
    border: '{components.airmail-stripe}'
    layout: 'two halves split by 1px {colors.rule-thin}; message left, address + stamp + postmark right'
    message: '{typography.postcard-line} {colors.ink}'
    address-line: '{typography.body} {colors.ink}, 1px {colors.rule-thin} baseline rule'
    shadow: '0 10px 26px rgba(31,42,68,.30)'
    rotate: '-1deg'
    radius: '{rounded.none}'
  album-slot-collected:
    background: '{colors.card}'
    border: '1px solid {colors.rule-thin}'
    top-edge: '4px {components.airmail-stripe.pattern}'
    city: '{typography.body} {colors.ink}'
    meta: '{typography.caption} {colors.ink-muted}'
    line: '{typography.meta} italic {colors.ink}'
  album-slot-new:
    outline: '2px solid {colors.airmail-red}'
    label: '{typography.caption} {colors.airmail-red}'
  album-slot-reachable:
    background: '{colors.card}'
    border: '1px solid {colors.rule-thin}'
    call-to-action: '{typography.label} {colors.airmail-red}'
  album-slot-locked:
    background: 'transparent'
    border: '1px dashed {colors.rule-thin}'
    text: '{typography.caption} {colors.ink-muted}'
  region-tab:
    typography: '{typography.label}'
    count: '{typography.meta} {colors.ink-muted}'
    active: '3px double {colors.ink} underline'
    target: '{spacing.min-target} x {spacing.min-target} minimum'
  hint-panel:
    background: '{colors.card}'
    border: '1px solid {colors.rule-thin}'
    inner-frame: '1px solid {colors.fill-highlight}, inset 6px'
    shadow: '3px 4px 0 {colors.fill-highlight}'
    label: '{typography.label} {colors.airmail-red}'
    text: '{typography.hint-text} {colors.ink}'
    padding: '16px 18px 14px'
  notice-banner:
    background: '{colors.card}'
    border: '1px solid {colors.rule-thin}'
    accent-edge: '4px solid {colors.postmark}'
    accent-edge-save-failed: '4px solid {colors.airmail-red}'
    text: '{typography.body} {colors.ink}'
  restart-confirm:
    text: '{typography.body} {colors.ink}'
    confirm: '{components.button}'
    cancel: '{components.button-primary}'
  difficulty-picker:
    border: '{components.mode-indicator.border}'
    active-background: '{colors.ink}'
    active-foreground: '{colors.card}'
    disabled: '{colors.ink-muted}'
    target: '{spacing.min-target} x {spacing.min-target} minimum per segment'
  settings-toggle:
    typography: '{typography.body}'
    state-text: '{typography.label}'
    on: '{colors.ink}'
    off: '{colors.ink-muted}'
  focus-ring:
    outline: '3px solid {colors.focus}'
    offset: '3px'
---

## Brand & Style

Traveller Sudoku is a stack of old correspondence. Warm envelope paper, double-ruled serifs, perforated stamps and faded postmarks: every Puzzle already looks like something you could slip into an envelope. The Postcard is the emotional centre; the grid is the letter you write to earn it.

Givens are printed: bold, upright. The player's digits are handwriting: italic ink blue. Notes are pencil: small, upright, grey-blue. Nothing shouts. There are no badges, confetti, sounds or flashing; a reward is a card arriving in the post.

The Airmail palette carries the "par avion" note: cream envelope, navy ink, airmail-red stamp, red and navy diagonal stripes. **Daylight** (light) is always the default theme. **Lamplight** (dark) is a Settings switch and does not follow the system setting.

Mockups illustrate; this spine wins on conflict.

Visual reference: [mockups/direction-vintage-postcard.html](mockups/direction-vintage-postcard.html) (layout, motifs) and [mockups/color-themes-1.html](mockups/color-themes-1.html) palette 3 "Airmail" (hex values, highlight marks). Where they differ, the direction file's sepia hexes and green stamp are superseded by the Airmail tokens. Key screens: [mockups/key-puzzle.html](mockups/key-puzzle.html), [mockups/key-postcard-reveal.html](mockups/key-postcard-reveal.html), [mockups/key-album.html](mockups/key-album.html), [mockups/key-first-launch.html](mockups/key-first-launch.html). Cities other than Lisbon in the mockups are placeholders; the City list and Postcard lines are the creator's content task.

## Colors

Each role has a Daylight token and a `-lamplight` twin. Component tokens reference the Daylight name; in Lamplight every `{colors.x}` resolves to `{colors.x-lamplight}`. Palette mockup: [mockups/color-themes-1.html](mockups/color-themes-1.html) (Airmail; its `note` and `rule-thin-lamplight` hexes predate the values below).

| Role | Daylight | Lamplight | Used for | Never for |
|---|---|---|---|---|
| `desk` | `#F5EFDF` | `#1B1A21` | App background, gaps in stamp perforation and airmail stripe | Text |
| `card` | `#FFFAF0` | `#25242C` | Grid, Postcard, panels, Album slots, digit pad | Page background |
| `ink` | `#1F2A44` | `#F4ECD8` | Body text, headings, button borders, primary-button fill | Player digits |
| `ink-muted` | `#4E5670` | `#C8C0AD` | Meta, captions, counts, locked slots | Anything that must read as active |
| `given` | `#1A2036` | `#F6EFDC` | Given digits only | — |
| `player-ink` | `#24418A` | `#A9C0F5` | Player digits only | Buttons, links |
| `note` | `#535A70` | `#B8B4C4` | Notes digits | Player digits |
| `rule-thin` | `#73799A` | `#8E8CA0` | Cell rules, card hairlines, dashed outlines | Box borders |
| `rule-box` | `#1F2A44` | `#D8D2C0` | 3×3 box borders, grid frame, navy stripe in airmail stripe | — |
| `fill-selected` | `#F6D3D0` | `#5A2A30` | Selected cell fill | Alone as a state cue |
| `fill-highlight` | `#E6EAF5` | `#2E3348` | Row/column/box fill, current pad key, hint-panel frame | Alone as a state cue |
| `fill-same-digit` | `#DFE4F4` | `#343A55` | Same-digit fill | Alone as a state cue |
| `mistake` | `#8A4B16` | `#E8B07A` | Mistake digit + its dotted underline + corner dot (umber, not red) | Errors outside the grid |
| `airmail-red` | `#B3262F` | `#F08A8F` | Stamp face, selection ring, row/column ticks, box corner ticks, same-digit underline, labels, links, current pad key, "just arrived" | Mistakes, large fills |
| `postmark` | `#3C4A6E` | `#A8B6E0` | Postmark stroke, hint-focus cells, info notice edge | Body text |
| `focus` | `#1F3A7A` | `#FFD27A` | Keyboard focus ring | Anything else |

**Highlight approach (FR-20).** Soft fills are deliberately quiet (below 3:1 against `card`). Every highlighted state also carries a non-fill mark at ≥3:1: selected = inset ring, row/column = edge ticks, box = `airmail-red` corner ticks inside the active box, same digit = underline, Mistake = dotted underline + corner dot, hint focus = dashed ring. The fill is decoration; the mark is the state.

**Measured contrast (both themes pass).** Text ≥4.5:1: `ink` on `desk` 12.4 / 14.7; `ink-muted` on `desk` 6.3 / 9.5; `player-ink` on `fill-selected` 6.9 / 6.4; `note` on `fill-highlight` 5.7 / 6.2; `note` on `fill-selected` 4.9 / 5.7; `mistake` on `card` 6.5 / 8.0; `airmail-red` on `card` 6.2 / 6.4. Non-text ≥3:1: `rule-thin` on `fill-selected` 3.1 / 3.5; `rule-thin` on `fill-same-digit` 3.4 / 3.4; `airmail-red` (box corner ticks) on `fill-highlight` 5.4 / 5.2; `rule-box` on `fill-same-digit` 11.2 / 7.4; `airmail-red` on `fill-selected` 4.7 / 4.8; `focus` on `fill-selected` 7.8 / 8.2. Full table in `mockups/color-themes-1.html` (measured before the `note` / `rule-thin-lamplight` change; the figures here supersede it).

Paper grain: a faint diagonal hatch of `ink` at about 3% opacity and a soft light glow top-left over `desk`. Texture never sits behind grid cells.

## Typography

One family: the system serif stack (Georgia first). Nothing is downloaded, so no third-party font request (AD-12).

| Token | Use |
|---|---|
| `{typography.brand}` | "Traveller Sudoku" wordmark, italic |
| `{typography.city-title}` | Destination in the Puzzle header ("Lisbon · Mid · Medium") |
| `{typography.label}` | Small-caps labels: nav, panel titles, "Travel here", Region tabs |
| `{typography.button}` | Small-caps button text |
| `{typography.body}` / `{typography.meta}` / `{typography.caption}` | Running text, status lines, counts and keyboard hints |
| `{typography.hint-text}` | Hint explanation sentences |
| `{typography.postcard-line}` | The Postcard's one line, italic |
| `{typography.cell-given}` / `{typography.cell-player}` / `{typography.cell-note}` | Givens bold upright · player digits italic · Notes small upright |

Rules: no all-caps body text (stamp and postmark text excepted); no exclamation-mark display type; italic means "written by hand" (player digits, Postcard line, status lines), never emphasis in UI copy.

## Layout & Spacing

Scale `{spacing.1}`–`{spacing.7}` (4 → 44px). Named tokens fix the play surface: cells are `{spacing.cell}` square, grid frame padding `{spacing.grid-pad}`.

The Puzzle screen has two columns on the `desk`: the grid card on the left, the side column on the right (max `{spacing.side-column-max}`), `{spacing.7}` apart. Side column order top to bottom: notice banner when one is showing [ASSUMPTION: top of the side column], Hint panel, mode indicator, digit pad, action buttons (Undo · Hint · Restart). The "Full, not solved" line also appears in the side column. During the Postcard reveal the side column keeps its states and is inert. Page gutters `{spacing.app-gutter-x}` / `{spacing.app-gutter-y}`. Header across the top, closed by a 3px double rule.

Below 1100px viewport width the side column stacks under the grid (one breakpoint); the grid keeps its fixed size. See EXPERIENCE.md › Responsive & Platform.

Album: one Region per page, 10 slots in a 5-column grid, `{spacing.3}` gap, ordered Near → Mid → Far [ASSUMPTION: slot order by Tier]. The Album header shows the wordmark and nav only (no destination title, no Stamp); the "Where to next?" heading uses `{typography.city-title}`.

Notice banners: on the Album and other non-Puzzle screens they sit in a band directly under the header and push content down. On the Puzzle screen they render in the side column, so the grid never moves. They never overlay the grid.

Clickable controls are at least `{spacing.min-target}` × `{spacing.min-target}` (nav links, Region tabs, Mode and Difficulty segments, toggles, banner buttons).

Desktop only; minimum and narrow-window behaviour are in EXPERIENCE.md › Responsive & Platform.

## Elevation & Depth

Paper on a desk, nothing more. Cards (grid frame, Postcard) are lifted with a soft `ink`-tinted shadow and a slight tilt (grid −0.4°, Postcard −1°, stamp +3°). The Hint panel is flatter: a hard 3px/4px offset shadow in `fill-highlight` and an inner hairline frame, like a slip of paper tucked in. Notices, Album slots and buttons have no shadow. No blur, glass or gradient fills. In Lamplight, shadows use black at the same alpha.

## Shapes

Square corners everywhere (`{rounded.none}`): cards, buttons, cells, slots, banners. `{rounded.sm}` only on the outer theme panel. `{rounded.full}` only for the Mistake corner dot and postmark circles. Character comes from rules (double, dashed, dotted perforation), not radii.

## Components

**Grid.** `card` background inside a 3px `rule-box` frame; 1px `rule-thin` cell rules; 2px `rule-box` box rules. A decorative postmark sits outside the top-right corner of the frame, `aria-hidden`, never over cells. Mockup: [mockups/key-puzzle.html](mockups/key-puzzle.html). Cell states (they stack):

| State | Visual |
|---|---|
| Empty | `card`, no content |
| Given | `{typography.cell-given}` in `given` |
| Player digit | `{typography.cell-player}` in `player-ink` |
| Notes | 3×3 mini-grid, `{typography.cell-note}` in `note`; digit n always in position n |
| Selected | `fill-selected` + 3px inset `airmail-red` ring |
| Row / column / box highlight | `fill-highlight`; row and column marked by `airmail-red` triangle ticks on the grid frame edge; the active box marked by small `airmail-red` L-shaped corner ticks inside its four corners |
| Same digit | `fill-same-digit` + 2px `airmail-red` underline on the digit (Givens and player digits alike) |
| Mistake | digit in `mistake` + 2px dotted underline + 6px corner dot top-right; shown only when the Assist is on, or when a Hint points to it |
| Hint focus | 2px dashed `postmark` inset ring on the cells a Hint names |

Stacked marks, precedence: the selected ring is outermost; a hint-focus ring sits 3px inside it; the Mistake corner dot sits top-right; the underline sits below the digit, and when same digit and Mistake both apply, the Mistake dotted underline takes that slot (the corner dot still distinguishes it). Fills: selected over same digit over highlight.

**Digit pad.** 3×3 keys, `card` with 2px dashed `rule-thin`. Digit upright `ink`; below it a caption count ("3 left"). Current digit (number-first): 2px solid `airmail-red` border + `fill-highlight`. Digit with all nine placed: `ink-muted`, struck through, count reads "Done" (accessible name "7, all placed").

**Mode indicator.** Two-part segmented control "Digit | Notes (N)" [ASSUMPTION: direction's "Pen | Pencil" renamed to the glossary term]; active segment inverted (`ink` fill, `card` text). Italic status line beside it: input mode · selected digit or cell.

**Button.** Default: transparent, 3px double `rule-box` border, small-caps, optional `kbd` caption. Primary (Hint, "Add to Album", "Travel here" when a button): inverted `ink` fill. Links: `airmail-red` underlined.

**Restart confirm.** Replaces the Undo · Hint · Restart row in place: one `{typography.body}` question line, then "Restart" (default button) and "Keep going" (primary). No overlay.

**Difficulty picker.** Segmented control like the Mode indicator: "Easy | Medium | Hard", active segment inverted; disabled state in `ink-muted` with the status line "Finding a fair Puzzle…".

**Header.** Wordmark + small-caps tagline "correspondence by puzzle" in `airmail-red`; destination title + meta ("Portugal — Europe, Postcard 5 of 10"); Stamp; nav (Puzzle · Album · Free Play · Settings) [ASSUMPTION: direction's "Assists" nav item becomes "Settings", holding Assists and the Lamplight switch], active item `airmail-red` underlined.

**Stamp.** `airmail-red` face, `card` text: country top, a glyph centre, Tier bottom. Perforated edge: dotted border in `desk` plus `card` outline. Tilted +3°. Free Play shows no Stamp.

**Postmark.** Double circle in `postmark` at 75% opacity, City name in caps and date as DD MMM YY ("06 OCT 26"). Decorative only; not the deferred clean-solve postmark reward.

**Postcard.** `card` with the 8px `{components.airmail-stripe}` border, tilted −1°. Left half: the line in `{typography.postcard-line}`. Right half: Postmark overlapping the Stamp, three ruled address lines ("To: the Traveller" · "Album · Europe" · "Lisbon, Portugal"). "Add to Album" primary button below. Mockup: [mockups/key-postcard-reveal.html](mockups/key-postcard-reveal.html). The collected Postcard viewer on the Album reuses this component with "Play again" in place of "Add to Album".

**Album slot.** Mockup: [mockups/key-album.html](mockups/key-album.html).

| State | Visual |
|---|---|
| Collected | Postcard face in miniature: `card`, 4px airmail stripe along the top edge [ASSUMPTION], City, country · Tier, the line in italic |
| Collected, just arrived | Collected + 2px `airmail-red` outline + caption "just arrived" |
| Reachable | Blank `card`, hairline border, City + country · Tier, "Travel here" in small-caps `airmail-red` |
| Reachable, in progress | Reachable layout with "Carry on" instead of "Travel here" [ASSUMPTION] |
| Collected, replay in progress | Collected layout plus "Carry on" in small-caps `airmail-red` |
| Locked | Faded: no fill, dashed `rule-thin` border, `ink-muted` text "Opens after 3 Near Postcards" (or "3 Mid Postcards"); no City name, only the unlock line. Fading is by fill and border only; text keeps ≥4.5:1 |

**Region tabs.** Small-caps Region names with counts ("Europe 4 / 10"); active tab underlined with the 3px double rule.

**Hint panel.** In the side column, right of the grid, never over it. `card`, hairline border, inner frame, offset shadow. Small-caps `airmail-red` step label, explanation in `{typography.hint-text}`, step buttons and a "What's a [Technique]?" link.

**Notice banner.** Inline: full content width under the header, except on the Puzzle screen, where it sits in the side column at side-column width. `card`, hairline border, 4px left edge in `postmark` (info) or `airmail-red` (save failed). Body text plus one text button, which dismisses the banner. No icons, no close "×" glyph without a text label.

**Settings toggle.** Label left, state word right ("On" / "Off") in small caps; On in `ink`, Off in `ink-muted`. State is in the word, not colour.

**Focus ring.** `{components.focus-ring}` on every focusable control. Inside the grid the selected-cell ring is the cursor; the grid frame itself gets the focus ring while the grid has focus.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Pair every soft fill with a ≥3:1 mark | Let any state rely on colour alone (Mistakes especially) |
| Keep Mistakes umber with dotted underline + dot | Use red, "✗" or shaking for Mistakes |
| Let the Postcard be the only celebratory moment | Confetti, sparkles, badges, sound, flashing |
| Keep notices inline, under the header | Overlay, modal or toast anything over an in-progress grid |
| Meet WCAG AA in both Daylight and Lamplight | Add a colour without a measured Lamplight twin |
| Make motion optional: honour reduced motion (Postcard appears without sliding; "just arrived" mark static) | Animate while the player is solving |
| Use the system serif stack | Load web fonts or any third-party asset |
| Use square corners and printed rules | Pills, rounded cards, glassy surfaces |
| Use `airmail-red` sparingly: marks, stamp, labels | Large red fills or red body text |

No audio anywhere.
