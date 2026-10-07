---
title: 'Story 1.3: Notes and number-first entry'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: '85b7b1e6f53b311c1bcf9e408befe29972d87e11'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Players can only place digits cell-first, can't pencil in Notes, and can't see how many of each digit remain.

**Approach:** Add Digit/Notes entry and cell-first/number-first input to the reducer. Show both modes in an always-visible mode indicator with a status line. Draw Notes as a 3×3 mini-grid in each cell. Give the digit pad "N left"/"Done" counts and a current-digit mark.

## Boundaries & Constraints

**Always:** `notes` stays 81 numbers, each a 0–511 mask (bit d−1 = Note d). Notes change only in empty cells (not Givens, not cells holding a player digit). Placing a digit hides Notes without deleting them. Nothing changes after a solve. Mode state lives in `ui` and resets on reload. All copy goes in `src/content/copy.ts`; styling uses tokens only. A no-op returns the same state object.

**Never:** Undo (1.4), keyboard shortcuts N/M/1–9/Enter (1.5), highlights or Assists (1.6), saving. The count never shows a negative number; Done keys stay clickable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Note toggle | Notes mode, empty cell selected, `digitEntered(7)` twice | bit 6 set, then cleared | N/A |
| Note refused | Notes mode, Given or player-digit cell selected | same state | silent |
| Hide/restore | cell with Notes 3, 7; place 5, then clear 5 | Notes mask unchanged throughout; shown again after clearing | N/A |
| Number-first choose | number-first, `digitEntered(7)` | `ui.currentDigit = 7`; no cell changes | N/A |
| Number-first place | current 7, `cellClicked` on empty cells | 7 placed in each; 7 stays current | N/A |
| Number-first clear / Given | current 7, `cellClicked` on player 7 / on a Given | cleared / unchanged (selected only) | silent |
| No current digit | number-first, none chosen, `cellClicked` | selected only | N/A |
| Number-first Notes | Notes on, current 4, `cellClicked` on empty cell | Note 4 toggles | N/A |
| Counts | grid digits | remaining = max(0, 9 − count of d in `digits`), Mistakes included; 0 → "Done" | N/A |

</frozen-after-approval>

## Code Map

- `src/game/types.ts` -- add `EntryMode = 'digit' | 'notes'` and `InputMode = 'cellFirst' | 'numberFirst'`. `UiState` gains `entryMode`, `inputMode`, `currentDigit: number | null` (defaults: `digit`, `cellFirst`, `null`, set in `session.ts` `createInitialState`).
- `src/game/reducer.ts` -- existing `cellSelected` / `digitEntered` with guards (`isCell`, `isDigit`, solved, Given). Keep `cellSelected` as selection only: Story 1.5's arrow keys move without placing.
- `src/content/copy.ts` -- `copy` object plus `cellLabel(row, col, value, kind)`. Extend the labels: a Notes cell reads "Row r, column c, notes 3, 7".
- `src/ui/puzzle-screen.tsx` -- `useReducer`; side column = pad then "Solved." line. `src/ui/sudoku-grid.tsx` -- cell buttons with `onSelect`. `src/ui/digit-pad.tsx` -- 9 keys with `onDigit`. `src/ui/puzzle.css` -- current pad style (1px solid border) differs from UX-DR11 and gets restyled here.
- `tests/ui/sudoku-grid.test.ts` -- `renderToStaticMarkup` pattern with a `cells()` parser; reuse it for the pad and the mode indicator.

## Tasks & Acceptance

**Execution:**
- [x] `src/game/types.ts`, `src/game/session.ts` -- new ui fields and actions `cellClicked {cell}`, `entryModeChosen {mode}`, `inputModeToggled`.
- [x] `src/game/reducer.ts` -- a shared `applyDigit(state, cell, digit)` (Digit: place/replace/clear; Notes: toggle a bit in empty cells; refused when solved or on a Given). `digitEntered`: cell-first → `applyDigit` on the selected cell; number-first → set `currentDigit`. `cellClicked`: select, then `applyDigit` with `currentDigit` if number-first and a digit is chosen. A Notes change also sets `meta.lastPlayedKey`.
- [x] `src/game/digit-counts.ts` -- `remainingByDigit(digits): number[]` (index 1–9).
- [x] `tests/game/reducer.test.ts` -- one test per matrix row; the mask stays an integer 0–511 across toggles; mode toggles are ui-only.
- [x] `src/ui/mode-indicator.tsx` -- segmented "Digit | Notes (N)" (`entryModeChosen`), a second segmented "Cell first | Number first" (`inputModeToggled`), and the italic `meta` `ink-muted` status line, e.g. "cell-first · Notes · row 4, column 6", "number-first · Digit · 7", or "… · choose a cell" / "… · choose a digit". Segments ≥ 24×24px with `aria-pressed`.
- [x] `src/ui/sudoku-grid.tsx` -- cells dispatch `cellClicked`. An empty cell with Notes renders a 3×3 mini-grid (`cell-note` / `note`, digit n in slot n, blank slots kept).
- [x] `src/ui/digit-pad.tsx`, `src/ui/puzzle.css` -- UX-DR11: `card` keys, 2px dashed `rule-thin` border, 10px gap; digit upright `ink`; `caption` `ink-muted` count "N left" / "Done". A Done key is `ink-muted` and struck through, with `aria-label="7, all placed"`. The current digit (number-first) gets a 2px solid `airmail-red` border, `fill-highlight` and `aria-pressed="true"`.
- [x] `src/ui/puzzle-screen.tsx` -- side column order: mode indicator, pad, "Solved." line.
- [x] `tests/ui/` -- static-render tests: a Notes mini-grid places 7 in slot 7; pad captions, Done label and current-digit mark; status-line text in both modes.

**Acceptance Criteria:**
- Given the Puzzle screen, when it renders, then the mode indicator ("Digit | Notes (N)", 1px `ink` border, active segment `ink` fill with `card` text) and the status line are always visible above the pad.
- Given number-first with 7 chosen, then key 7 shows the `airmail-red` border and `fill-highlight`, and the status line names 7.

## Implementation Notes

- Review pass 1 patches applied: `tests/ui/puzzle-screen.test.ts` (indicator above pad, live counts, status), `inputModeChosen {mode}` for clicks (`inputModeToggled` kept for M in 1.5), three number-first reducer tests, `--type-meta-status-style` and `--type-pad-digit-style` tokens; `tsconfig.node.json` types gain `vite/client` for CSS imports in tests.

## Spec Change Log

## Review Triage Log

Pass 1 (blind = B, edge-case = E, verification-gap = V).

| Finding | Verdict | Evidence | Route |
|---|---|---|---|
| V1/B8 `PuzzleScreen` wiring (indicator above pad, live counts, status) untested | medium | Pre-verified: no test renders `PuzzleScreen`; counts from `givens` or the order swapped would pass. | patch |
| V2/B1 input-mode control dispatches a non-idempotent toggle | low | Only the `Segmented` active-click guard stops a flip; add `inputModeChosen {mode}` for clicks, keep `inputModeToggled` for M (1.5). | patch |
| V3 `cellSelected` selection-only in number-first not pinned | low | Pre-verified: merging the cases passes all tests; 1.5 arrows depend on it. | patch |
| B6 number-first replace (player 5, current 7) untested | low | No test covers the replace path through `cellClicked`. | patch |
| B7 number-first Notes on a player-digit cell untested | low | Only the cell-first refusal is tested. | patch |
| E1/B4 literal `font-style` in `.mode-status` / `.digit-pad-digit` | low | Breaks "tokens only"; add tokens. | patch |
| E2 current digit can't be cleared | false | UX: "7 stays locked until another digit is chosen". | reject |
| E3/B9 short or NaN `remaining` shows "Done" or "NaN" | low | `remainingByDigit` always returns 10 finite entries; unreachable. | reject |
| B2 "(N)" shown before the key works | low | The AC requires the label "Digit \| Notes (N)"; N is wired in 1.5. | reject |
| B3 no `aria-keyshortcuts` | low | Keyboard semantics belong to 1.5. | reject |
| B5 status line not a live region | low | Live-region announcements of mode names are 1.5 scope. | reject |
| B10 Done key name "7, all placed" vs visible "Done" | low | The AC prescribes that exact accessible name. | reject |
| B11 selection moves in number-first but isn't in the status line | low | No harm named; the status line shows the current digit by design. | reject |
| B12 spec missing from the diff | false | Excluded on purpose; the spec goes to the edge-case layer only. | reject |

## Design Notes

- **Input-mode control:** UX names only the M key, so a mouse control is needed. A second segmented control, styled like the mode indicator, keeps it visible and consistent (the same pattern as the 1.8 Difficulty picker).
- **`cellClicked` vs `cellSelected`:** mouse clicks apply the current digit; future arrow keys only move. Enter (1.5) will apply the current digit to the selected cell through the same `applyDigit`.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview` in headless Chrome at 1280px: toggle Notes, add Notes 3 and 7, place and clear a digit (the Notes return), switch to number-first, choose 7 and click three empty cells. Take a screenshot.
