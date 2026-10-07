---
title: 'Story 1.5: Play with the keyboard and a screen reader'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: '3570d2630a840f428078f626ea832f82d29616b2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Puzzle can only be played with a mouse, the grid has no grid semantics, and nothing is announced, so keyboard-only and screen-reader players can't solve.

**Approach:** Add one keyboard handler in `src/ui/keyboard`, attached to the Puzzle screen container, that maps keys to existing (and two new) reducer actions. Turn the grid into an ARIA grid with a roving tabindex. Add a polite live region fed by a pure `announce(prev, next, action)` function. Guard the single-handler rule with an architecture test, and adopt jsdom so focus and keys are tested for real.

## Boundaries & Constraints

**Always:** All shortcuts go through `src/ui/keyboard*`; no other file uses `onKeyDown`/`onKeyUp`/`onKeyPress` or `addEventListener('key…')`. Shortcuts work only while focus is inside the Puzzle screen (grid or side column); keys pressed elsewhere do nothing. Enter/Space place the current digit only when focus is in the grid; on buttons they activate the button. The `game/reducer` contract from 1.2–1.4 is unchanged (no-ops still return the same object). Announcements live in `ui.announcement` and never record undo. Cell labels follow UX-DR61. Copy goes in `src/content/copy.ts`; styling uses tokens only.

**Never:** H does anything (reserved for Hints); wrapping at grid edges; animation or transitions on the Puzzle screen; a focusable wordmark (the header gets focusable nav in 1.6); an "unsupported" message.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Arrows | focus in grid, cell 40, ArrowUp / at row 0 ArrowUp | cell 31 selected and focused / stays put | N/A |
| Cell-first digit | selected empty cell, key `7` (Digit / Notes) | digit 7 / Note 7 toggled (same rules as the mouse) | N/A |
| Number-first | key `7`, then Enter or Space in the grid | current digit 7; placed in the selected cell | N/A |
| Clear | Backspace/Delete on player digit / empty cell with Notes / Given | digit cleared / Notes cleared (both undoable) / unchanged + "Given, can't change" | silent otherwise |
| Shortcuts | N, M, Ctrl+Z (Cmd+Z on Mac), H with focus in the side column | toggle Digit/Notes, toggle input mode, Undo, nothing | N/A |
| Out of scope | the same keys with focus on `body` or the header | nothing changes | N/A |
| Esc | Restart confirm open | closes; focus returns to "Restart" | N/A |
| Announce | enter 7 / Note 7 on, off / Given refused / mode switch / solve | "7" / "note 7 added", "note 7 removed" / "Given, can't change" / "Notes", "Digit", "number-first", "cell-first" / "Solved" | N/A |

</frozen-after-approval>

## Code Map

- `src/game/reducer.ts` -- `reducer` = `undoRequested` / `restart*` plus `record(state, step(state, action))`; `applyDigit(state, cell, digit)` does every grid change; `inputModeToggled` exists for M. Add `cellCleared` and `currentDigitPlaced` to `step` (both recorded by `record`) and `entryModeToggled` for N.
- `src/game/types.ts` / `session.ts` -- `UiState`; add `announcement: { text: string; seq: number } | null` (default `null`).
- `src/ui/puzzle-screen.tsx` -- `useReducer(reducer, samplePuzzle, createInitialState)`; renders `SudokuGrid`, `ModeIndicator`, `DigitPad`, `ActionRow`, "Solved.". `src/ui/action-row.tsx` already moves focus on confirm open/close (`focusInRow` ref).
- `src/ui/sudoku-grid.tsx` -- `role="group"` and 81 `<button>`s with `aria-current`; `copy.cellLabel(row, col, value, kind)` already produces the UX-DR61 wording.
- `tests/architecture/` -- the AST checker pattern; `tests/ui/*.test.ts` use `renderToStaticMarkup`. `vite.config.ts` test env is `node` and includes `tests/**/*.test.ts`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the DOM test environment entry is resolved by this story.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add devDependency `jsdom` pinned to `30.1.2`; DOM tests opt in with `// @vitest-environment jsdom` and mount via `react-dom/client` + `act`.
- [x] `src/game/reducer.ts`, `types.ts`, `session.ts` -- `cellCleared` (player digit → '0'; empty cell → notes mask 0; Given or solved → same state), `currentDigitPlaced` (`applyDigit` with the current digit on the selected cell), `entryModeToggled`, and the `announcement` field.
- [x] `src/game/announce.ts` -- pure `announce(prev, next, action): string | null` per the matrix (number-first choosing a digit says "current digit 7"; a cleared cell says "cleared"), and `withAnnouncement(state, action)` = `reducer`, then set `ui.announcement` with an incrementing `seq` when there's a message. Messages come from `copy`.
- [x] `src/ui/keyboard.ts` -- `keyToAction(key event fields, context { inGrid, inputMode, selectedCell, restartConfirming, isMac }): Action | null` (pure) and `useKeyboard(ref, dispatch, context)`, which registers the only `keydown` listener on the Puzzle screen container and calls `preventDefault` for handled keys.
- [x] `src/ui/sudoku-grid.tsx`, `puzzle.css` -- `role="grid"` → 9 `role="row"` → `role="gridcell"` buttons. The selected cell (or cell 0) has `tabIndex 0` and the rest `-1`. Selection moves focus. Focusing a cell selects it. Cell focus outline is suppressed; the grid frame shows the 3px `focus` ring via `:focus-within`, and the selected-cell ring is the cursor.
- [x] `src/ui/live-region.tsx` -- a visually hidden `aria-live="polite"` region rendering `ui.announcement.text` (keyed by `seq`).
- [x] `src/ui/puzzle-screen.tsx` -- `useReducer(withAnnouncement, …)`, a container ref and `useKeyboard`, with the live region inside the screen.
- [x] `src/ui/puzzle.css`, `theme.css` -- every focusable control gets a 3px solid `focus` outline at 3px offset; no `transition`/`animation`; a reduced-motion rule that zeroes both.
- [x] `tests/architecture/keyboard.test.ts` -- fails, naming the file, when any `src/**/*.tsx?` outside `src/ui/keyboard*` uses key props or `addEventListener('key`; passes on the clean tree.
- [x] `tests/game/announce.test.ts`, reducer tests for the new actions, `tests/ui/keyboard.test.ts` (jsdom): every matrix row through real `keydown` events on a mounted `PuzzleScreen`, the roving tabindex (exactly one `tabindex="0"`), and focus moving with the arrows.

**Acceptance Criteria:**
- Given Tab from the top of the page, then focus goes grid → mode indicator → input-mode segments → pad keys → Undo → Restart, each with the visible focus ring.
- Given a width under 1100px, then the side column stacks under the grid, cells stay 58px, there is no horizontal scroll at 800px, and the focus order is unchanged.
- Given any control, then its target is at least 24×24px, and selected, current and Done states each carry a non-colour mark (ring, border, strike-through).

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | blind, edge | Held keys auto-repeat (`e.repeat`), so a held digit toggles place/clear | medium | patch | `useKeyboard` had no repeat check; `applyDigit` clears on the same digit. |
| 2 | blind, edge | Space on a gridcell may still fire a native click on keyup, which places and then clears | maybe-false | defer (medium if true) | Only keydown is prevented; jsdom can't show native activation. A real-browser check (Firefox especially) would settle it. |
| 3 | blind | The grid steals focus on any `selectedCell` change | false | reject | Undo and Restart never change `selectedCell`, and the effect returns on null; no current action from the side column moves the selection. |
| 4 | blind | `:focus-within` frame ring also shows on mouse focus | low | reject | The spec asks for `:focus-within`, and a calm frame ring on click is harmless. |
| 5 | blind, edge | No cursor in forced-colors mode (outline suppressed; background and box-shadow stripped) | medium | patch | `.sudoku-cell:focus { outline: none }` plus `.sudoku-cell--selected` uses only background and box-shadow. |
| 6 | blind | Focus ring sized with `--rule-frame` | false | reject | This is the existing convention for every control (`puzzle.css` focus rule from earlier stories), and the value is 3px. |
| 7 | blind | `aria-current` plus `aria-selected` double-announce the cell | low | patch | Both are set on the selected gridcell; deleting one is a direct fix. |
| 8 | blind | Keys still change the grid while the Restart confirm is open | false | reject | The same is true for the mouse since 1.4, and the intent scopes shortcuts to the screen, not to the confirm. |
| 9 | blind, edge | Undo, Restart, Notes refused on a filled cell, and number-first digit deselect are silent | low | surfaced to human | The intent's Announce row lists the messages, but whether to add these is the user's call; no code reverted. |
| 10 | blind | Three ACs (stacking, 24px, non-colour marks) have no evidence | false | reject | The styles exist (`--selected` box-shadow ring, `--current` border, Done line-through), and the implementer checked 800px for horizontal scroll. Recording evidence would be a spec edit. |
| 11 | blind, VG | deferred-work entry deleted while cell-click wiring is still untested in the DOM | medium | patch | No jsdom test clicks a gridcell; the entry was replaced with "None open". |
| 12 | blind | Lockfile absent from the reviewed diff | false | reject | It was excluded from the review diff deliberately; `package-lock.json` is modified in the tree. |
| 13 | blind, edge | Guard misses non-literal `addEventListener` names, computed keys and .js files | low | reject | Developer-only and unlikely; the fix adds branches. |
| 14 | blind | The real-tree test matches the exact quote style | low | reject | Brittle only under a quote-style change; it fails loudly. |
| 15 | blind, edge | The listener re-registers on every selection, so a stale closure is possible | false | reject | Native keydown updates run at discrete/sync priority, so React flushes the commit and passive effects before the next event. |
| 16 | edge | Non-Latin layouts: `e.key` isn't z/n/m | low | reject | Unlikely for this personal app; the fix adds `e.code` branches. |
| 17 | edge | Older iPad platform strings | low | reject | Desktop web app; iPadOS reports "MacIntel". |
| 18 | edge | Esc pressed from the grid leaves focus in the grid, not on Restart | low | reject | It needs focus moved out of the confirm first (rare); the 1.4 rule returns focus only when it was in the row, and the fix needs new plumbing. |
| 19 | edge, VG | Mac detection duplicated from `keyCaption` and untested | low | patch | `puzzle-screen.tsx` re-implements `platform.includes('Mac')`; no test covers it. |

## Design Notes

- **Announcements outside the reducer contract:** wrapping keeps 1.2–1.4's "no-op returns the same object" tests valid, while still letting a refused Given produce a message. `seq` makes repeating the same text ("7" twice) re-announce.
- **Header focus:** no header control exists until the 1.6 nav. Scoping is proven by keys on `body`/header doing nothing, not by a fake tab stop.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview` in headless Chrome at 1280px and 800px: Tab through the screen and screenshot the grid focus ring; arrow-key around; type digits, N, M, Ctrl+Z; read the live region text.
