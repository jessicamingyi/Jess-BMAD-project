---
title: 'Accessibility review: Traveller Sudoku UX spines'
reviewed: [DESIGN.md, EXPERIENCE.md]
date: '2026-10-06'
lens: accessibility (WCAG 2.2 AA, calibrated to a desktop-only hobby game)
requirements: PRD FR-20 (text 4.5:1, borders/highlights 3:1, both themes), FR-21 (full keyboard play), PRD §5 (no audio, reduced motion, calm)
verdict: PASS WITH FIXES
---

# Accessibility review: Traveller Sudoku

## Verdict

**Pass with fixes.** The foundations are better than most specs: every highlight pairs a soft fill with a 3:1 mark, Mistakes use umber plus a dotted underline and dot (not colour alone), Settings states are words, there are no modals, no audio, and notices never sit over the grid. Every contrast figure the spec quotes checks out. The gaps are in what the spec leaves out: two token pairs it never measured fail, the single-key shortcuts are not scoped, focus handling is missing for elements that disappear, and the screen-reader feedback when a digit goes in is unspecified. None of these is a blocker for a hobby game. All of them are cheap to fix now and expensive to fix after the build.

Severity scale (hobby stakes): **High** = a keyboard or screen-reader user gets stuck or misled, or a stated FR-20/FR-21 requirement is broken. **Medium** = real friction, or an unstated gap that implementers will fill inconsistently. **Low** = polish or wording.

## 1. Contrast (FR-20)

Recomputed with the WCAG 2.x relative-luminance formula from the frontmatter hex values (script in the session scratchpad).

### 1a. Claimed figures: all verified

| Pair | Claimed D / L | Computed D / L |
|---|---|---|
| ink / desk | 12.4 / 14.7 | 12.42 / 14.66 |
| ink-muted / desk | 6.3 / 9.5 | 6.33 / 9.54 |
| player-ink / fill-selected | 6.9 / 6.4 | 6.89 / 6.38 |
| note / fill-highlight | 5.1 / 6.2 | 5.11 / 6.16 |
| mistake / card | 6.5 / 8.0 | 6.51 / 7.99 |
| airmail-red / card | 6.2 / 6.4 | 6.24 / 6.39 |
| rule-thin / fill-selected | 3.1 / 3.1 | 3.07 / 3.07 (passes, with almost no margin) |
| rule-box / fill-same-digit | 11.2 / 7.4 | 11.23 / 7.38 |
| airmail-red / fill-selected | 4.7 / 4.8 | 4.68 / 4.83 |
| focus / fill-selected | 7.8 / 8.2 | 7.79 / 8.16 |

### 1b. Pairs the spec did not list (sample)

| Pair | Daylight | Lamplight | Needs | Result |
|---|---|---|---|---|
| **note / fill-selected** | **4.43** | 5.73 | 4.5 (12px text) | **FAIL Daylight** |
| note / fill-same-digit | 4.84 | 5.51 | 4.5 | pass |
| note / card | 5.91 | 7.58 | 4.5 | pass |
| **rule-thin / fill-same-digit** | 3.35 | **2.95** | 3.0 | **FAIL Lamplight** (marginal) |
| rule-thin / fill-highlight | 3.54 | 3.29 | 3.0 | pass |
| rule-thin / card | 4.09 | 4.06 | 3.0 | pass |
| mistake / fill-selected | 4.89 | 6.04 | 4.5 | pass |
| mistake / fill-same-digit | 5.34 | 5.80 | 4.5 | pass |
| airmail-red / fill-same-digit | 5.11 | 4.64 | 3.0 (underline) / 4.5 (labels) | pass |
| airmail-red / desk | 5.66 | 7.18 | 4.5 | pass |
| player-ink / fill-same-digit | 7.53 | 6.13 | 4.5 | pass |
| ink-muted / fill-highlight (done pad key on current) | 6.04 | 6.89 | 4.5 | pass |
| postmark / fill-highlight (hint-focus ring) | 7.28 | 6.20 | 3.0 | pass |
| focus / desk (ring offset lands on desk) | 9.41 | 12.13 | 3.0 | pass |
| card / airmail-red (stamp text) | 6.24 | 6.39 | n/a (decorative, aria-hidden) | pass |

**C-1 (Medium): Notes on a selected cell fail in Daylight (4.43:1).** Notes are the smallest text in the game (12px) and show on the selected cell all the time: you select an empty cell, then add Notes to it. Fix: darken `note` Daylight from `#5A6178` to `#535A70`. That gives 4.94 on fill-selected and 6.59 on card, and it still reads as lighter than `ink`. Add the pair to the measured list.

**C-2 (Low): Thin cell rules on same-digit cells fail in Lamplight (2.95:1).** WCAG 1.4.11 could arguably treat cell rules as non-essential, since the box rules and cell contents define the grid. But FR-20 says borders ≥3:1, so take it literally. Fix: lighten `rule-thin-lamplight` from `#838196` to `#8E8CA0` (3.40 on fill-same-digit, 3.54 on card). While doing so, give `rule-thin` / `fill-selected` some headroom too, because 3.07 rounds to a pass that one colour-profile shift could break.

**C-3 (Low): The spec should state the full stacking matrix.** Selected, highlight, same-digit, Mistake and hint-focus states stack. The spec measures some foregrounds against some fills, but not every foreground (given, player-ink, note, mistake) against every fill (card, selected, highlight, same-digit), with each mark colour against each fill. Fix: put the 4×4 foreground matrix and the mark matrix in the DESIGN.md contrast paragraph (or in `color-themes-1.html`), for both themes. All of it passes except C-1 and C-2.

### 1c. Colour-only state

The approach is sound.
- Selected: inset ring. Row/column: frame ticks. Same digit: underline. Mistake: dotted underline plus dot. Hint focus: dashed ring. Settings: words. Done pad key: strikethrough. Current pad key: solid border instead of dashed. Mode and Difficulty: inverted segment plus status line. Locked slots: text.
- Mistake against player digit: the hues differ but luminance barely does (1.41 / **1.06**). In Lamplight, colour adds almost nothing, so the dotted underline and dot carry the whole state. That is acceptable because they exist. Do not let anyone "simplify" them away later; add one line to Do's and Don'ts.
- **C-4 (Low): marks collide when states stack.** On one digit, the same-digit underline (2px solid red, 4px offset) and the Mistake underline (2px dotted umber, 4px offset) occupy the same spot, so one hides the other. In the same way, the selected ring (3px inset) and the hint-focus ring (2px dashed inset) overlap on one cell. Fix: give Mistake priority on the underline slot, since its corner dot still distinguishes it, and inset the hint-focus ring by 3px more so that both rings show.
- Box highlight is fill-only (1.16:1). That is accepted as redundant information (the box is implied by the selected cell and drawn by box rules). Fine.

## 2. Keyboard (FR-21)

### 2a. Map completeness

| Key | Status |
|---|---|
| Arrows | Defined; no wrap. OK. **Gap:** do arrows also operate the segmented controls (Mode, Difficulty), Region tabs, the digit pad grid? Unspecified. |
| 1–9 | Defined. **Gap:** behaviour on a Given (silent no-op?) is unstated; needs feedback (see §4). Numpad digits should behave the same; state it. |
| Backspace / Delete | Defined (clear). **Gap:** in Notes mode, does it clear Notes only, or digit + Notes? Say "clears the digit, or all Notes if no digit". |
| N, M | Defined. |
| Ctrl/Cmd+Z | Defined. Fine (no text inputs exist, so no clash with native undo). |
| H | Defined: opens, then advances. **Risk:** three presses of H place a digit (step 3). It is undoable, so this is Low, but consider making step 3 require Enter on the button rather than H. |
| Esc | Defined for Hint / definition / Restart confirm. On the Postcard, Esc = "Add to Album", which is a commit action on a cancel key. It is harmless here because it is the only path, but say so explicitly or make Esc a no-op. |
| Enter / Space | Defined only for number-first placement. **Gap:** in cell-first mode on the grid, Enter/Space does nothing? State it. On buttons and toggles, native activation applies. |
| Tab / Shift+Tab | Implied by "every control reachable by Tab"; grid is one tab stop. OK. |

**K-1 (Medium): Single-key shortcuts are unscoped (WCAG 2.1.4 Character Key Shortcuts; screen-reader clash).** N, M, H and 1–9 are single characters. If they listen globally, then (a) 2.1.4 requires a way to turn them off or remap them, or that they work only while the relevant component has focus; (b) in NVDA and JAWS browse mode, H means "next heading", N "next non-link text" and M "next frame", so the keys will not reach the game unless it is in focus/application mode. Fix: scope the game keys to keydown while focus is inside the play area (grid, side column) and leave them inert on the header nav, Album and Settings. Give the grid `role="grid"` (or `role="application"` on the play region) so screen readers switch to focus mode there. That satisfies 2.1.4 without a settings toggle. Ctrl/Cmd+Z can stay play-area-scoped as well.

### 2b. Focus order

Specified: header nav → notice banner → grid → Hint panel → mode indicator → digit pad → Undo · Hint · Restart. This matches the visual top-to-bottom order of the side column (Hint panel is on top), which is correct. It differs from the brief's suggested "grid → pad → hint panel", and the spec's order is the better one because DOM order follows visual order. The pad is a 3×3 of keys: decide whether it is 9 tab stops or one roving tab stop with arrows. Recommend one tab stop plus arrows, consistent with the grid.

**K-2 (Medium): Focus is lost when the focused element disappears.** The spec handles Postcard → "Add to Album" → Album heading, which is good. It does not handle these cases:
- The Hint panel resets to idle when digits change. If focus was on "Explain it", that button is gone.
- The Restart confirm replaces the action row. Where does focus go on open (recommend "Keep going", the safe default), and on cancel or confirm (back to "Restart")?
- The notice banner's own button ("Got it") removes the banner, so focus needs a target (recommend the next landmark heading or the grid).
- Route changes (Album slot → Puzzle screen, Free Play start, nav links) need a target. Recommend the grid on the Puzzle screen and the page heading elsewhere.
- "What's a [Technique]?" opens inside the panel, so focus should move to the definition, and Esc should return it to the link.

Fix: add a "Focus after change" row per case to the Accessibility Floor. Without it, focus falls back to `<body>` and the keyboard player must Tab through the header again.

### 2c. Focus visibility

The 3px `focus` ring with 3px offset is 9.4–12.1:1 against desk/card in both themes, which is good. The grid frame gets the ring while the grid has focus, and the red selected-cell ring is the cursor. That is clear.
- **K-3 (Low):** `button-primary` already has `outline: 2px solid ink`. Make sure the focus ring is not implemented by overriding `outline`, which would swap one outline for another and is barely visible. Use `outline` for focus and `box-shadow` for the decorative outline (or the reverse).
- The selected-cell ring is visible even when the grid is not focused. That is fine, because the frame ring disambiguates.
- **K-4 (Medium, WCAG 2.2 2.4.11 Focus Not Obscured):** the Postcard slides **onto** the grid. While it is up, grid cells must be `inert` so that Shift+Tab cannot land focus on a cell hidden underneath.

## 3. Screen-reader semantics

**S-1 (Medium): Grid semantics and the feedback when a digit goes in are under-specified.** The cell label pattern ("Row 4, column 6, 1, your digit", "notes 6, 7", "given", "empty", "+ mistake", "+ hint") is good. Recommended additions:
- Name the pattern: `role="grid"` with 9 `row`s of `gridcell`s and roving `tabindex` (more reliable than `aria-activedescendant` for announcing name changes in place). Alternatively, a single focusable element with a live region; choose one and write it down.
- Add the box to the label only when it helps. Optional: "box 5" at the end. The Hint text often says "box", so it does help.
- **Placement feedback:** when a digit is typed into the focused cell, the cell's name changes, but screen readers do not reliably re-announce a name change on the already-focused element. Add a short polite echo: "7", "note 7 added", "note 7 removed", "cleared", "Given, can't change". Keep it to one or two words.
- Notes order: always ascending ("notes 2, 6, 7"). Good; state it.
- Pad keys: label "7, 3 left" and "7, all placed". Current digit: `aria-pressed="true"`.
- Mode indicator and Difficulty picker: radio group (`role="radiogroup"`) or two `aria-pressed` buttons. Settings toggles: `role="switch"` + `aria-checked` (the visible On/Off word is still fine).
- The disabled "Puzzle" nav item: links cannot be disabled. Render it as text with `aria-disabled="true"` and keep it out of the tab order, or keep it focusable with `aria-disabled`. Pick one.
- Locked Album slots are "focusable for its label". That is fine, but give them a role that does not suggest activation (not `button`), or a `button` with `aria-disabled="true"`.
- The Postcard needs a labelled region ("Postcard from Lisbon") and the line as its description, so that when focus jumps to "Add to Album" the line is also read (`aria-describedby` on the button, or announce the region). Otherwise the emotional climax is just "Add to Album, button".

### Live regions (not too chatty)

The specified polite announcements (mode switch, Hint text, save failed, solved) are the right set. Calibration:
- **S-2 (Low):** "Save failed" retries until a save succeeds. Announce the banner once when it appears. Do not re-announce on each failed retry, and do not announce when it clears. Read-only (other tab) is the one banner worth `role="alert"`, because input silently stops working.
- Do not announce highlight changes, same-digit counts or row/column ticks. Correct by omission, but state it so nobody adds it.
- Add: "Finding a fair Puzzle…" (polite), and the replay/Free Play "Solved" lines.
- Arrow movement: the cell name on focus is enough. Do not also push it to the live region (double speech).

## 4. Motion, audio, calm (PRD §5)

- No audio anywhere. Good.
- Reduced motion: the Postcard appears in place. Good. **M-1 (Low):** the spec says "Only the Postcard slide-in and the 'just arrived' mark move" and then "Reduced motion: … no other changes needed". That contradicts itself, because the "just arrived" mark also moves. Fix: under `prefers-reduced-motion: reduce`, the "just arrived" mark is static (outline + caption only).
- Static tilts (−0.4°, −1°, +3°) are not motion. Fine. Make sure the tilt does not blur 12px Note text on the grid: rotating the grid frame −0.4° rasterises the whole grid, including 12px notes, at an angle. **M-2 (Low):** consider tilting only the frame's shadow or backing card and keeping the cells upright, or verify the legibility of the 12px Notes on Windows ClearType at 100% scale.
- Theme swap is instant, with no transition. Good.

## 5. Width, zoom and reflow (WCAG 1.4.10 / 1.4.4)

**Z-1 (Medium, calibrated): the 1100px minimum guarantees 2D scrolling at 200% zoom on common laptops.** On a 1280–1536px-wide laptop window, 200% zoom gives a 640–768 CSS px viewport. That is below 1100, so the page scrolls horizontally **and** vertically, and the side column (pad, Hint, Undo) sits off-screen to the right of the grid. 1.4.10 asks for reflow at 320 CSS px. A 9×9 Sudoku grid qualifies for the "two-dimensional layout essential to use" exception, but the side column and header do not.

Calibrated position: full 320px reflow is not worth it for a desktop-only hobby game, so record the deviation. The cheap 80% fix is a **single breakpoint**: below 1100px, stack the side column under the grid. That means vertical scroll only, and focus order is unchanged because the DOM order is already grid → side column. The grid stays its fixed size (about 562px including padding), which fits a 640px viewport. Add a short note that 400% / 320px reflow is out of scope and why.

- 1.4.4 (text resize 200%): fine with browser zoom. Avoid pixel-locked heights on the Hint panel and banner so that text can grow.
- 1.4.12 (text spacing): the small-caps letter-spacing tokens are fine. Make sure Album slot lines and pad captions do not clip when the user overrides spacing (no fixed heights with `overflow: hidden`).

## 6. Target size (mouse; WCAG 2.5.8 at 24×24)

- Cells 58px: fine. Pad keys are sized by the side column (roughly 120px): fine.
- **T-1 (Low):** sizes are not given for the nav links, Mode/Difficulty segments, Region tabs, Settings toggles and the notice banner button. At 15px small-caps text these could end up around 20px tall. Fix: add a `min-target` token of 32px height (24px is the floor) for every control. The inline "What's a hidden single?" link is exempt as inline text.

## 7. Smaller notes

- Caption 12px italic (pad counts, "just arrived", locked text) and 12px Notes: they pass contrast, but italic serif at 12px is at the edge of legibility. Consider 13px for captions. Notes are constrained by the 3×3 mini-grid, and 58/3 ≈ 19px per slot allows 13px.
- "No close '×' glyph without a text label": good.
- Hint text when a Mistake exists names row and column in words, which suits screen readers. Do the same for every Hint ("row 4", never only a visual pointer).
- Banner priority means a lower-priority banner can be hidden. When it surfaces later, announce it then, not at the time it was queued.

## Summary of fixes

| ID | Severity | Fix |
|---|---|---|
| C-1 | Medium | `note` Daylight `#5A6178` → `#535A70` (note on fill-selected 4.43 → 4.94) |
| K-1 | Medium | Scope N/M/H/1–9/Ctrl+Z to the play area; `role="grid"` so screen readers enter focus mode (2.1.4) |
| K-2 | Medium | Specify focus targets for Hint reset, Restart confirm open/close, banner dismiss, route changes, Technique definition |
| S-1 | Medium | Name the grid ARIA pattern (roving tabindex); add a 1–2 word polite echo on placement / note toggle / Given refusal; Postcard region + describedby |
| Z-1 | Medium (calibrated) | One breakpoint below 1100px: stack side column under grid; document 320px reflow as out of scope |
| K-4 | Medium | Grid `inert` while the Postcard covers it |
| C-2 | Low | `rule-thin-lamplight` `#838196` → `#8E8CA0` (2.95 → 3.40 on same-digit) |
| C-3, C-4 | Low | Publish the full stacking contrast matrix; resolve underline/ring collisions |
| K-3 | Low | Do not implement the focus ring by overriding the primary button's `outline` |
| M-1, M-2 | Low | Static "just arrived" under reduced motion; check legibility of tilted 12px Notes |
| S-2 | Low | Announce save-failed once; read-only as `alert` |
| T-1 | Low | `min-target` 32px height for nav, segments, tabs, toggles, banner button |
