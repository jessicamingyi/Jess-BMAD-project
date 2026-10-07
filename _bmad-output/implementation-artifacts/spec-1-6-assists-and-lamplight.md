---
title: 'Story 1.6: Assists and Lamplight'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '8c157ba68c9d2d80f6b4d7280cbfae584fbcfefd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The grid gives no help beyond the selected-cell ring, there is no way to choose that help, and there is only the light theme, so the player can't tune how much the Puzzle assists them or play in a dark room.

**Approach:** Add header nav "Puzzle · Settings" switching screens by state, a Settings surface with four On/Off toggles held in `AppState.settings` (Mistake Off, same-digit On, row/column/box On, Lamplight Off), the three Assist marks on the grid, an `engine/` Mistake function, Lamplight token twins applied only by the toggle, and a Vitest contrast test over both themes.

## Boundaries & Constraints

**Always:** Settings live in `AppState.settings` and change only through the reducer; toggling never records Undo or touches the Session. Defaults reset on every load (no storage writes). Mistakes come from an `engine/` function over digits, Givens and solution only, never Notes; `ui/` reaches it through `game/` (ui → engine is forbidden). Every soft fill is paired with its mark; precedence per AC. Mistakes are umber `mistake`, dotted underline + corner dot, never `airmail-red`, "✗" or motion. Lamplight is applied only by the toggle; the system colour scheme is ignored. Components use tokens only; copy in `src/content/copy.ts`. Keys stay with the single handler on the Puzzle screen container, so the nav and Settings get no shortcuts. The contrast test uses the DESIGN hexes as given: if a listed pair fails, stop and report rather than retune a hex.

**Never:** A "Tidy notes after a placement" toggle; saving settings (Epic 4); Album or Free Play nav items (1.8 / Epic 3); a routing library or URL hash; `matchMedia('(prefers-color-scheme…')`; transitions on the theme swap; marks that change a cell's size or shift its digit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Defaults | fresh load, open Settings | Mistake Off, Same digit On, Row/column/box On, Lamplight Off | N/A |
| Unit highlight | cell 40 selected, Assist On / Off | row 4, column 4, box 5 get `fill-highlight` + 2 frame triangles + 4 box L-ticks / none | N/A |
| Same digit | selected cell holds 7 (Given or player) / empty / Assist Off | every 7 gets `fill-same-digit` + 2px red underline / no marks / no marks | N/A |
| Mistake | player 5 where solution is 3, Assist On / Off | umber digit, dotted underline, corner dot, label "…, your digit, mistake" / no mark, plain label | Givens never marked; Notes ignored |
| Stacked | selected cell holds 7, is a Mistake, all Assists On | ring outermost, `fill-selected`, dotted underline (no solid), corner dot | N/A |
| Theme | OS prefers dark, load / Lamplight On / Off | Daylight / all colour tokens → `-lamplight`, shadow black 18% / Daylight back | N/A |
| Nav | click or Enter on "Puzzle" / "Settings" | Puzzle screen, focus on grid tab-stop cell / Settings, focus on page heading | N/A |
| Keys off-screen | 1–9, N, M, H, Ctrl/Cmd+Z with focus on a nav link or in Settings | Puzzle unchanged | N/A |
| Round trip | digits + Undo history, go to Settings and back | grid, Notes, selection, Undo history intact | N/A |

**Decisions (human, 2026-10-07):** Same-digit marks follow the selected cell only, in both input modes (choosing a digit on the pad in number-first lights nothing by itself). Settings page: heading "Settings", a small-caps "Assists" group label over the three Assist toggles ("Mistake highlighting", "Same-digit highlighting", "Row, column and box highlighting"), then "Lamplight" below a hairline rule.

</frozen-after-approval>

## Code Map

- `src/ui/puzzle-screen.tsx` -- owns `useReducer(withAnnouncement, samplePuzzle, createInitialState)` and `useKeyboard(screenRef, …)`; the reducer must lift to `App` so settings and the Session outlive a screen switch.
- `src/ui/app.tsx` -- header (wordmark, tagline) + `<main>`; gets nav, screen switch, theme attribute.
- `src/game/types.ts` / `session.ts` -- `Settings = Record<string, never>`, `UiState`, `Action`; `createInitialState` sets `settings: {}`.
- `src/game/reducer.ts` -- `reducer` → `record(prev, step(...))`; `record` adds Undo only when digits/notes change, so settings/screen actions in `step` record nothing.
- `src/ui/sudoku-grid.tsx`, `puzzle.css` -- `grid-card` → `role="grid"` → cells with `sudoku-cell--{kind}`, `--selected` (fill + inset ring); `copy.cellLabel` builds UX-DR61 labels.
- `src/ui/theme.css` -- 16 Daylight `--color-*` tokens, `--shadow-grid-frame` (ink 18%), `--desk-hatch`; `tests/shell.test.ts` asserts those hexes and no raw hex elsewhere.
- `tests/architecture/check-architecture.ts` -- layer rules (`ui` may not import `engine`); `src/engine/` holds only `.gitkeep`.
- DESIGN.md › Colors (Lamplight hexes lines 31–47, measured pairs line 333), components `nav-link`, `settings-toggle`, grid marks (lines 160–170, 385–394).

## Tasks & Acceptance

**Execution:**
- [x] `src/engine/mistakes.ts` -- `mistakeCells(givens, digits, solution): readonly boolean[]` (81; true only for a non-Given, non-empty digit ≠ solution)
- [x] `src/game/types.ts`, `session.ts`, `reducer.ts` -- `Settings = { mistakeHighlighting, sameDigitHighlighting, unitHighlighting, lamplight }: boolean` with defaults false/true/true/false; `UiState.screen: 'puzzle' | 'settings'` (default `'puzzle'`); actions `settingToggled { setting }` and `screenChosen { screen }`, handled in `step`, no Undo, no announcement.
- [x] `src/game/assists.ts` -- pure `cellMarks(session, selectedCell, settings)` → per-cell `{ highlight, sameDigit, mistake }` plus `{ row, col, box } | null` for the ticks, applying the Assist switches; calls `engine/mistakes`.
- [x] `src/content/copy.ts` -- nav labels, Settings heading/group/toggle labels, "On"/"Off", nav `aria-label`; `cellLabel` gains an optional `mistake` flag appending ", mistake".
- [x] `src/ui/app.tsx`, `src/ui/app-nav.tsx`, `src/ui/puzzle-screen.tsx` -- `App` owns the reducer and passes state/dispatch down; `<nav>` of two `<button>` nav links (`aria-current="page"` on the current one); renders Puzzle or Settings by `ui.screen`; after a nav choice focus goes to the grid's tab-stop cell or the Settings heading (`tabIndex={-1}`); an effect sets `document.documentElement.dataset.theme` to `lamplight` or removes it.
- [x] `src/ui/settings-screen.tsx` -- heading + toggles as `<button role="switch" aria-checked>`, label left (`body`), state word right (small-caps `label`, On `ink`, Off `ink-muted`), ≥24×24px, focus ring.
- [x] `src/ui/sudoku-grid.tsx`, `puzzle.css` -- classes `--highlight`, `--same-digit`, `--mistake` with AC precedence; same-digit 2px solid `airmail-red` underline offset 4px; Mistake `mistake` colour, 2px dotted underline offset 4px, 6px `rounded-full` dot top-right; aria-hidden frame triangles (12×7px, in the grid pad, pointing in) and 2px×8px L-ticks inside the box corners, no layout shift.
- [x] `src/ui/theme.css` -- 16 `--color-*-lamplight` tokens with DESIGN hexes; `:root[data-theme='lamplight']` maps each role to its twin and sets shadows to black at the same alpha; nav-link styles (`label`, `ink`, current `airmail-red` + 1px underline, ≥24px target, focus ring); update the header comment.
- [x] `tests/ui/contrast.test.ts` -- WCAG relative-luminance ratio parsed from `theme.css` for every DESIGN measured pair in both themes (text ≥4.5, non-text ≥3), every Daylight role has a twin, and a synthetic below-threshold pair is reported as failing.
- [x] `tests/engine/mistakes.test.ts`, `tests/game/assists.test.ts`, reducer tests (defaults, toggles, no Undo entry, `screenChosen`), `tests/ui/settings.test.ts` + `tests/ui/nav.test.ts` (jsdom) -- every matrix row, including keys on the nav doing nothing and a `matchMedia` dark stub leaving Daylight.

**Acceptance Criteria:**
- Given the header, when it renders, then "Puzzle · Settings" shows as small-caps links, each ≥24×24px, the current one `airmail-red` with a 1px underline, and Tab order is nav links → grid → side column.
- Given a toggle has focus, when it is clicked or Space is pressed, then its word flips and the Puzzle reflects it on return, with no Undo entry.
- Given the contrast test, when any listed pair falls below its threshold or a twin is missing, then `npm test` fails naming the pair and theme.
- Given the architecture test, then `src/engine/mistakes.ts` passes the purity rules and no `src/ui` file imports `engine/`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | VG | Frame-tick position is tested only at cell 40 | medium | patch | Both indices are 4 there, so a row/column swap or a wrong box-rule formula would still pass. |
| 2 | edge | `screenChosen` leaves the Restart confirm open | low | patch | `restartConfirming` survives the round trip, and focus goes to the grid, not to the confirm. |
| 3 | edge | Mistake dot overlaps the box top-right L-tick | low | patch | Both are drawn in the same corner of the cell. |
| 4 | blind | Mistake dot vanishes in forced-colors mode | low | patch | The dot is a `background-color`; the dotted underline remains. |
| 5 | blind | Lamplight sets no `color-scheme` | low | patch | Scrollbars and native chrome stay light in the dark theme. |
| 6 | blind | LiveRegion remounts with a stale announcement | low | patch | It still lives in `PuzzleScreen`, which unmounts on Settings. |
| 7 | blind | Two `assists.test.ts` tests can't fail | low | patch | The fixture has no wrong player digit and no Given that disagrees. |
| 8 | blind | Clicking the current nav link moves focus | low | patch | `choose()` bumps `focusRequest` even when the screen doesn't change. |
| 9 | edge | `mistakeCells` with short or empty strings | false | reject | Sessions always carry 81-char strings (`createSession`). |
| 10 | edge | Returning to the Puzzle with no selection selects cell 0 | low | reject | This matches 1.5's "focusing a cell selects it"; the matrix round-trip case has a selection, which stays intact. |
| 11 | blind | Contrast test misses pairs DESIGN doesn't list | low | reject | All of them pass today (reviewer computed 4.64–6.04); the spec scopes the test to DESIGN's pairs. |
| 12 | blind | `ROLES` list is hard-coded | low | reject | Developer-only; the fix adds CSS-parsing complexity. |
| 13 | blind | Enter/Space on nav and toggles are not exercised | false | reject | They are native `<button>`s, which jsdom can't activate by key; clicks are tested. |
| 14 | blind | Matrix box numbering mixes 0- and 1-based | — | reject | The fix would edit the spec. |
| 15 | blind | Spec status and notes are unfinished | false | reject | The workflow manages status; the decisions are recorded here. |
| 16 | blind | The grid re-filters marks by cell kind | low | reject | The filter is redundant but harmless; no named divergence. |
| 17 | blind | Duplicated test helpers; an unmerged react import | low | reject | Cosmetic. |
| 18 | blind | No CSS tests for "no theme transition", nav 24px, or the current-link underline | low | reject | The styles exist; the tests would add little. |

## Design Notes

- **State lifted to `App`:** the Puzzle and Settings are screens of one `AppState`; keeping the reducer in `PuzzleScreen` would reset the Session on every visit to Settings. `useKeyboard` stays attached to the Puzzle screen container, which already keeps the nav and Settings out of shortcut scope.
- **`role="switch"` buttons:** native Space activation (no key code) and `aria-checked` mirrors the visible state word. Theme attribute sits on `<html>` because `html`/`body` paint the desk.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview` in headless Chrome at 1280px: screenshot the grid with a selected 7 (ticks, fills, underlines), a Mistake with the Assist On, Settings in Daylight and Lamplight, and the nav focus ring.
