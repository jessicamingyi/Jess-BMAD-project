---
title: 'Story 2.2: Show me the move'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '0e55d89f35ed303b323ce2c1cfb191ce707083f6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** At step 2 the Hint explains the move, but "Show me the move" is inert and H does nothing, so a stuck player still can't get past it.

**Approach:** Add a `hintApplied` action that places the chain's final placement through the same Undo path as `digitEntered`, increments `hintsUsed`, sends the panel back to idle and announces the placement. Wire it to the step-2 button and to H at step 2.

## Boundaries & Constraints

**Always:** `hintApplied` acts only on the active Session's own Hint at step 'explain' with a `chain` result; otherwise it returns `state` itself. The placement is a single Undo entry (`record`), and the solve check runs in the same reducer step. `hintsUsed` only goes up, and Undo never restores it. The move places a digit whatever `entryMode` is. One press moves exactly one step. Copy lives in `content/`, keys are handled only in `src/ui/keyboard*`, and announcements go through `LiveRegion` once.

**Never:** Technique definitions or the "What's a…" link (2.3); the Mistake branch, clearing a digit, or the full-grid line (2.4); saving `hintsUsed` (Epic 4); `ui` importing `engine`; changes to `engine/hints`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Apply | step 'explain', chain ends {cell 30, digit 7} | `digits[30]`='7'; `hintsUsed`+1; one Undo entry; `ui.hint` = {sessionKey, 'idle', null}; announce "7 placed, row 4, column 4" | N/A |
| Notes in target | cell 30 has Notes mask | digit shown and Notes hidden; mask kept (as `applyDigit`) | N/A |
| Notes entry mode | `entryMode` 'notes' | still places the digit; Notes untouched | N/A |
| Undo after | after Apply | digits and Notes restored; `hintsUsed` unchanged; Hint stays idle | N/A |
| Solves | last empty cell | `status` 'solved' in the same step; Hint idle and disabled | N/A |
| H twice | step 'nudge' | 1st → 'explain'; 2nd → `hintApplied` | held-key repeats ignored (existing) |
| Stale | `ui.hint` null, another key, step 'idle'/'nudge', `result` not chain, no Session, solved, or target not empty | same `state` reference; `hintsUsed` unchanged; no announcement | never throws |

**Decisions (human, 2026-10-07):** At the explanation step, the action-row "Hint" button applies the move, the same as H and the panel's "Show me the move". When the move solves the Puzzle, the live region says one message: "{d} placed, row {r}, column {c}. Solved".

</frozen-after-approval>


## Code Map

- `src/game/reducer.ts` -- `requestHint` returns `state` at 'explain' (the 2.1 seam). `record` adds an Undo entry and closes the Restart confirm. `resetHintOnDigits` already sets the Hint idle when the digits change. `applyDigit` toggles (and respects Notes mode), so don't reuse it for the move.
- `src/game/hint.ts` -- `activeHint`, `shownChain`, `hintView`. This is where the move helper goes.
- `src/game/announce.ts` -- returns `copy.announceSolved` before the action switch. Add a case for `hintApplied`.
- `src/game/types.ts` -- `Action` union and `HintState`. `Session.hintsUsed` already exists (0 in `session.ts`).
- `src/ui/keyboard.ts` -- h/H → `hintRequested`. `KeyContext.hintOpen`.
- `src/ui/hint-panel.tsx`, `puzzle-screen.tsx` -- `disabled` includes `step === 'explain'`. `onAdvance` always sends `hintRequested`. The panel's focus effect already sends focus to the grid on nudge/explain → idle.
- `src/content/copy.ts` -- `announceDigit` is only the digit. `hintShowMove` exists.
- Tests: `tests/game/hint.test.ts`, `announce.test.ts`, `tests/ui/keyboard.test.ts`, `hint-panel.test.ts`, `action-row.test.ts`. Some 2.1 assertions expect step 2 to be inert, so update them.

## Tasks & Acceptance

**Execution:**
- [x] `src/game/types.ts` -- add `{ type: 'hintApplied' }` to `Action`, with a doc comment.
- [x] `src/game/hint.ts` -- `hintMove(hint): { cell; digit } | null`: the last chain Step's `placements[0]` when the step is 'explain', else null. Also `hintAction(hint): Action`: `hintApplied` at 'explain' with a chain, else `hintRequested`. 2.4 extends `hintMove` for the Mistake case (digit 0 = clear).
- [x] `src/game/reducer.ts` -- `applyHint(state)`: guard as in the matrix Stale row, then set `digits[cell]`, `hintsUsed + 1`, `status` from `digits === solution`, and `lastPlayedKey`. Route it through `record` in `reduce`. `resetHintOnDigits` then leaves the Hint idle. Update the `requestHint` doc comment ('explain' is still a no-op for `hintRequested`).
- [x] `src/content/copy.ts` -- `announceHintPlaced(digit, row, col)` → "7 placed, row 4, column 4" (1-based).
- [x] `src/game/announce.ts` -- for `hintApplied`, when the digits changed, return the placement text from the previous Hint's `hintMove`. When it also solves, follow OQ2. A no-op returns null.
- [x] `src/ui/keyboard.ts` -- `KeyContext.hintAtMove: boolean`. When it's true, h/H → `hintApplied`. Thread it through `useKeyboard` deps.
- [x] `src/ui/puzzle-screen.tsx`, `hint-panel.tsx` -- the panel button dispatches `hintAction(hint)`. Drop `step === 'explain'` from `disabled`, so "Show me the move" works. Pass `hintAtMove`. The action-row Hint follows OQ1. Update the comments on the `disabled` prop.
- [x] `tests/game/hint.test.ts` -- every matrix row at reducer level: `hintsUsed` across apply and Undo, the Notes mask preserved, Notes entry mode, solve on the last cell (fixture: the solution with one empty cell), and every stale variant keeping the same reference. Replace the 2.1 assertion "explain + hintRequested = no change" if it now conflicts.
- [x] `tests/game/announce.test.ts` -- placement once with the exact string. A stale call is silent. The solve message follows OQ2.
- [x] `tests/ui/keyboard.test.ts`, `hint-panel.test.ts`, `action-row.test.ts` -- H at step 2 places the digit. Clicking "Show me the move" places it, the panel shows "Hint" · "Show a nudge", the marks are gone, and focus moves to the grid's tab-stop cell. The placed cell shows a player digit. The action-row case follows OQ1.

**Acceptance Criteria:**
- Given a Hint at step 1, when H is pressed twice, then the first press shows step 2 and the second places the move. A third press opens a new nudge.
- Given the real tree, then the architecture tests pass (`ui` doesn't import `engine`, there is one keyboard handler).
- Given the move was placed with focus elsewhere (e.g. the digit pad), then focus stays put.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | smoke | After a solve, the disabled panel button looks the same as an enabled one | low | patch | The browser screenshot `chrome-5-solved.png` shows the button unstyled. |
| 2 | blind | No UI test for both Hint buttons going disabled after a Hint solves the Puzzle | low | patch | Only the reducer refusal is tested. |
| 3 | blind | ". Solved" is hardcoded next to `copy.announceSolved` | low | patch | Duplicated copy can drift. |
| 4 | blind | Inline row/column math in `announce.ts` | low | patch | `rowOf`/`colOf` exist in engine/grid. |
| 5 | blind | Non-null assertion in `hintMove` | low | patch | Guard order can be made explicit. |
| 6 | edge | An empty chain would crash `hintMove` | false | reject | `findHint` returns a chain only once a Step places a digit (VG confirmed). |
| 7 | blind | No stale test for a Given target | false | reject | `digits` already contains the Givens, so the guard is redundant, not untested (VG). |
| 8 | blind | The action-row Hint gives no warning that it now fills a cell | low | reject | The human chose this behaviour; the panel shows "Show me the move" and the live region reports the placement. |
| 9 | blind | `hintAtMove` could be stale | false | reject | Mounted H×3 tests fail if it is dropped from the deps (VG). |
| 10 | blind, edge | The action-row test lives in `hint-panel.test.ts` | — | reject | The static action-row suite can't click; the case is covered in the mounted suite. |
| 11 | blind | Spec logs empty; status snapshot | — | reject | The workflow manages these; the fourth `solved` parameter on `announceHintPlaced` is recorded here. |

Real-browser smoke test (Chrome 155, Edge 154): all 6 steps pass with no console, CSP or network errors. An Easy Puzzle solved with H only took 54–55 moves, exactly 3 presses each; the final announcement was "6 placed, row 9, column 9. Solved". Notes mode places a digit and Ctrl+Z restores the Notes; the action-row Hint at step 2 places the move.

## Design Notes

- **"Clears `ui.hint`" means it goes back to idle, not null:** the AC also requires the panel to return to idle ("Hint" · "Show a nudge"), and `null` closes the panel. Set `{ step: 'idle', result: null }`, which matches the 2.1 reset rule.
- **Why not `applyDigit`:** it toggles a matching digit and writes Notes in Notes mode. A Hint move always places. The target is always empty, because any digit change resets the Hint.
- **Separate `hintApplied` instead of overloading `hintRequested`:** this follows the Conventions. It also gives a clean stale check and 2.4's clear branch.
- **Wrong digits:** until 2.4, a chain found from Mistakes can place a digit that differs from the solution. The status then stays `inProgress`, which is acceptable here.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview`: put Notes in a cell, then press H, H, H until the move lands there. You should see an italic player digit with the Notes hidden, and focus on the grid. Ctrl+Z brings the empty cell and its Notes back.
