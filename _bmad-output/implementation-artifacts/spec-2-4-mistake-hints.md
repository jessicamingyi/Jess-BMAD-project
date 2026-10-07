---
title: "Story 2.4: Hints that find Mistakes, and \"Something doesn't fit yet\""
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '660e18ccbf0396d746f3564263eba392570d78d4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hints reason forward from wrong digits, and a full but wrong grid shows nothing, so the player can get stuck on a grid that will never solve.

**Approach:** When any Mistake exists, `engine/hints` returns a Mistake result for the first one in row-major order. The panel nudges to its row, explains it calmly, and `hintApplied` clears it. A full-but-wrong grid shows the inline line "Something doesn't fit yet — want a hint?" with a default-style "Hint" button.

## Boundaries & Constraints

**Always:** Mistakes come from `mistakeCells` (digits, Givens, solution; never Notes), whatever the Mistake Assist setting. The clear is one Undo entry through `record`, adds 1 to `hintsUsed`, and never changes Notes. A stale `hintApplied` returns `state` itself. The Mistake mark forced by a Hint covers only that cell and only at 'nudge'/'explain'. A full-but-wrong grid stays `inProgress` with input live and the Assist untouched. Copy lives in `content/` with no "!" and no "Wrong". Announcements go through `LiveRegion`, once each. `ui` never imports `engine`.

**Never:** A Technique link or definition for a Mistake result. A modal, overlay or grid shift. Saving anything (Epic 4). Changes to `src/ui/keyboard.ts` (H already maps through `hintAction`). Changes to 2.3's definition behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Report | Mistakes at cells 50 and 12 | `{ kind: 'mistake', cell: 12, digit }`; same result whatever order they were placed in | Givens never reported |
| Step 1 | `hintRequested`, Mistake at row 4, col 6 | label "Nudge", text "One of your digits doesn't fit — look at row 4.", button "Explain it"; ring on that cell only; text announced once | N/A |
| Step 2 | `hintRequested` again | label "Explanation", text per OQ1, button "Show me the move"; ring stays on the cell; no Technique link | N/A |
| Assist Off | Hint at step 1 or 2, other Mistakes exist | only the Hint's cell has the Mistake mark; name "…, your digit, mistake, hint"; at idle or closed no mark | N/A |
| Clear | step 2, H / "Show me the move" / action-row Hint | digit → '0', Notes show again; `hintsUsed`+1; Hint idle; "row 4, column 6 cleared" announced once | N/A |
| Undo | after Clear | Mistake digit back; `hintsUsed` unchanged; Hint idle | N/A |
| Player fixes | player clears or corrects the cell | Hint idle; next Hint reports the next Mistake, else a chain | N/A |
| Stale clear | Hint null, other Session, not 'explain', solved, or cell no longer holds `digit` | same `state` reference; nothing announced | never throws |
| Full, wrong | no '0' in digits, `digits !== solution` | line + "Hint" button in the side column; status `inProgress` | N/A |
| Line Hint | click the line's "Hint" with the panel closed or idle | panel at step 1 of the Mistake Hint for the first Mistake | N/A |
| Line gone | a cell emptied (incl. via Hint clear, Undo, Restart) or solved | line removed | focus → grid if it was in the line |

**Decisions (delegated, 2026-10-07: the user asked Claude to proceed with its recommended choices):**
- **Step-2 Mistake text:** the epic draft, word for word: "The {d} in row {r}, column {c} isn't part of this Puzzle's solution. Clearing it gets you back on track."
- **Where the line goes:** the "Something doesn't fit yet — want a hint?" line sits below the action row, in the solved line's slot, as an italic `puzzle-status` line.
- **The line's "Hint" button:** behaves like every other Hint control, through `hintAction`: open, then explain, then clear.
- **Screen-reader cue:** when the grid fills up wrong, the digit announcement gains the cue once ("7. Something doesn't fit yet — want a hint?").
- **Size:** the spec is kept whole, at about 2,100 tokens.

</frozen-after-approval>


## Code Map

- `src/engine/hints.ts` -- `HintResult` union (2.1 left the seam for `kind: 'mistake'`) and `findHint(grid)`.
- `src/engine/mistakes.ts` -- `mistakeCells(givens, digits, solution)`.
- `src/game/hint.ts` -- `shownChain`, `hintMove` (2.2 seam: digit 0 = clear), `hintAction`, `hintFocusCells`, `hintView`. After 2.3: `hintTechnique` (null for non-chain) and `HintView.technique`.
- `src/game/reducer.ts` -- `requestHint` calls `findHint(parseGrid(digits))`. `applyHint` requires `isDigit` and an empty target. `resetHintOnDigits` already handles "player fixes".
- `src/game/announce.ts` -- the `hintApplied` branch uses `hintMove(prev)`. The `hintRequested` branch already announces `hintView(...).text`.
- `src/game/assists.ts` -- `cellMarks(session, selectedCell, settings)`.
- `src/game/session.ts` -- `createSession`. Not touched by 2.3.
- `src/ui/puzzle-screen.tsx` -- side column, `hintNext`, `.puzzle-status` solved line. `src/ui/sudoku-grid.tsx` already shows the mark on player digits and builds the name from `mistake`/`hint` flags.
- `src/content/copy.ts` -- `cellLabel` (its comment says "only when the Assist is On"), `announceHintPlaced`, `hint`.

## Tasks & Acceptance

**Execution:**
- [x] `src/engine/hints.ts` -- add `{ kind: 'mistake'; cell; digit }` to `HintResult`. Add `hintFor(givens, digits, solution): HintResult`: the first `mistakeCells` index, else `findHint(parseGrid(digits))`. Pure. Keep `findHint` as is.
- [x] `src/engine/index.ts` -- export `hintFor`.
- [x] `src/game/hint.ts` -- `hintMistakeCell(hint): number | null` (the Mistake cell at 'nudge'/'explain'). `hintMove` → `{ cell, digit: 0 }` for a Mistake at 'explain'. `hintFocusCells` → `{cell}` at both steps. `hintView` → the Mistake label/text/button with `technique: null`.
- [x] `src/game/reducer.ts` -- `requestHint` uses `hintFor`. `applyHint` digit-0 branch: require a non-Given cell still holding `result.digit`; set '0' (Notes mask kept), `hintsUsed + 1`, status `inProgress`, `lastPlayedKey`.
- [x] `src/game/assists.ts` -- `cellMarks(..., hintMistake: number | null = null)`: that cell gets `mistake: true` even with the Assist Off.
- [x] `src/game/session.ts` -- `isFullNotSolved(session)`: no '0' and `digits !== solution`.
- [x] `src/game/announce.ts` -- `hintApplied` with digit 0 → `copy.announceHintCleared(r, c)`. OQ4 cue on not-full → full-but-wrong. Update the doc comment.
- [x] `src/content/copy.ts` -- `hintMistakeNudge(row)`, `hintMistakeExplain(digit, row, col)` (OQ1), `announceHintCleared(row, col)`, `fullNotSolved`. Fix the `cellLabel` comment.
- [x] `src/ui/full-grid-line.tsx` (new) -- the line plus a `button` (not primary) "Hint". On unmount with focus inside, call `focusGrid` (copy `HintPanel`'s focus tracking).
- [x] `src/ui/puzzle-screen.tsx` -- pass `hintMistakeCell(hint)` to `cellMarks`. Render `FullGridLine` per OQ2 when `isFullNotSolved`, `onHint` per OQ3.
- [x] Tests: `tests/engine/hints.test.ts` (several Mistakes in different orders; a crafted Given-index mismatch is never reported; no Mistakes → same as `findHint`). `tests/game/hint.test.ts`, `announce.test.ts`, `assists.test.ts` (every matrix row, stale refs, Undo, `hintsUsed`). `tests/ui/hint-panel.test.ts`/`puzzle-screen.test.ts` (H×3 clears; no "What's a" link; Assist-Off mark and name; the line appears, opens step 1, and disappears with focus to the grid; grid position unchanged; side-column focus order).

**Acceptance Criteria:**
- Given no Mistakes, then Hints behave exactly as in 2.1–2.3 (existing tests pass unchanged, except fixtures that contained Mistakes).
- Given the real tree, then the architecture tests pass (`ui` doesn't import `engine`, there is one keyboard handler, `engine` is pure).
- Given any Mistake copy, then it contains no "!" and no "Wrong".

## Implementation Notes

- `applyHint` keeps the 2.2 placement path and adds the digit-0 branch; it refuses a Mistake clear unless `ui.hint.result` is a Mistake and the cell still holds `result.digit` (and isn't a Given).
- The OQ4 cue is `copy.announceDigitFullNotSolved(d)`, said only on a digit entry that takes the grid from not-full to full-but-wrong. Undo/Restart are not announced (unchanged), so filling via Undo gets no cue.
- `FullGridLine` renders only when `!solved && isFullNotSolved(session)`; its focus-to-grid runs in an unmount cleanup with HintPanel-style focus tracking.
- UI tests for 2.4 live in `tests/ui/hint-panel.test.ts` (full App in jsdom); `puzzle-screen.test.ts` is static markup only and was not changed.
- One 2.3 test fixture (`Esc order…`) entered a Mistake to dirty the grid; it now enters the correct digit.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | blind | Two side-column buttons are both named "Hint" | low | patch | The line button's name is just `copy.hint`; the focus-order test shows "HintH" next to "Hint". |
| 2 | blind | The line's focus hand-off on Undo and Restart is unasserted | low | patch | Only the Hint-clear path checks focus. |
| 3 | blind | The cue is untested for number-first entry and for clear-then-refill | low | patch | Only cell-first entry is tested. |
| 4 | blind | A no-op "never mutates" test; the no-Mistakes case is thin | low | patch | String arguments can't mutate; only one player digit is checked. |
| 5 | blind | Doc comments run past the wrap width | low | patch | Cosmetic, a direct fix. |
| 6 | blind | Step 1 reveals the exact cell | false | reject | The epic ACs require the Mistake cell's ring and Mistake mark at step 1 ("the Mistake cell gets the hint-focus ring"; "a Mistake Hint is open (step 1 or 2) → that Mistake cell shows the Mistake mark"). |
| 7 | blind | A crafted `{digit: 0}` clear counts a no-op | low | reject | `hintFor` never produces digit 0; the guard would cover a state that can't be reached. |
| 8 | blind | Undo filling the grid wrong gives no spoken cue | low | reject | Undo is silent by design (1.5); the line still appears and is reachable by Tab. Recorded in Implementation Notes. |
| 9 | blind, edge | Blur to nowhere leaves focus tracking stuck | low | reject | The same pattern as HintPanel and ActionRow (2.1 #17); worst case, focus returns to the grid. |
| 10 | blind | The no-Mistakes test uses the sample solution with other positions | low | reject | Givens equal digits there, so no player digit exists to misjudge; #4 adds the real case. |
| 11 | blind | Spec status and the task line for `puzzle-screen.test.ts` | — | reject | The workflow manages status; the Implementation Notes record that the UI tests live in `hint-panel.test.ts`. |
| 12 | VG | (no gaps) | — | — | — |

Real-browser smoke test (Chrome 155, Daylight and Lamplight): all steps pass with no errors. Strings seen: "One of your digits doesn't fit — look at row 1.", "The 7 in row 1, column 1 isn't part of this Puzzle's solution. Clearing it gets you back on track.", "row 1, column 1 cleared", "8. Something doesn't fit yet — want a hint?" and "7 placed, row 9, column 5. Solved". The grid didn't move; focus went to the grid when the line disappeared.

## Design Notes

- **Baseline after 2.3:** `hint.ts`, `types.ts`, `reducer.ts`, `hint-panel.tsx`, `puzzle-screen.tsx`, `copy.ts` and tests overlap with 2.3. Start from 2.3's commit, then extend `hintView`'s `technique` field (null for a Mistake) and leave `definitionOpen` alone. 2.3's open/close actions already refuse when `hintTechnique` is null.
- **Step labels:** the AC wording "step label reads 'Show a nudge'" mirrors 2.1's AC, which shipped as the labels "Nudge"/"Explanation". Mistake Hints reuse `copy.hintLabelNudge`/`hintLabelExplain` so both kinds read the same.
- **`digit` stored on the result:** it is the step-2 text's `{d}` and the stale guard for the clear (the cell must still hold it).
- **`hintsUsed` counts clears:** the AC requires it. reconcile-inputs #4 suggested not counting them, but the epic AC supersedes it.
- **Full grid ⇒ Mistake:** the Givens match the solution, so a full grid that isn't the solution always has a non-Given Mistake, and `hintFor` never returns `none`/chain there.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview`, Assist Off: enter a wrong digit, press H. Row nudge, ring and Mistake mark on that cell only. H again shows the explanation without a link. H a third time clears it with the Notes back. Ctrl+Z restores it. Fill the grid with one swapped pair: the line appears, the grid doesn't shift, and its Hint opens step 1.
