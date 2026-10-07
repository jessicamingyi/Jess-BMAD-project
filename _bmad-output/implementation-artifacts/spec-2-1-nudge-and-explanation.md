---
title: 'Story 2.1: Get a nudge and an explanation for the next move'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '6b322f504f0c317c001988e78ae295761348e6f4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A stuck player has no help: H is reserved, there is no Hint button, and the solver's `Step`s never reach the screen.

**Approach:** Add a pure `engine/hints` that runs the AD-2 solver from the current digits up to the first placement and returns that chain. Store it per session in `ui.hint`. Add a side-column Hint panel ("Show a nudge" → "Explain it") whose text comes from per-Technique templates in `content/techniques`, plus hint-focus marks on the grid, a primary "Hint" in the action row, and H/Esc in the one keyboard handler.

## Boundaries & Constraints

**Always:** Hints read only `session.digits`, never Notes, and never change Notes. One H press or click moves exactly one step. Any change to the session's digits (entry, clear, Undo, Restart) sets the Hint back to idle in the same reducer step. Notes, selection and mode changes leave it alone. `ui.hint` is never shown for a different session key and is never recorded in Undo. `Step` stays text-free. Copy lives in `content/`, styles use tokens only, and keys are handled only in `src/ui/keyboard*`. Each announcement is made once, through the existing `LiveRegion`; the panel itself is not `aria-live`.

**Never:** `hintApplied`, placing the move or `hintsUsed` changes (2.2); Technique definitions or the "What's a…" link (2.3); the Mistake branch or the full-grid line (2.4); `engine/brute` in Hints; a modal or overlay; `ui` importing `engine`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Open | panel closed or idle, `hintRequested` | `ui.hint` = { sessionKey, step 'nudge', result chain }; nudge announced; unit cells hint-focused | N/A |
| Advance | step 'nudge', H or "Explain it" | step 'explain'; every chain `focusCells` marked; explanation announced | N/A |
| Step 2 + H | step 'explain' | no change (2.2 wires the move) | N/A |
| Digits change | open, any digit route | step 'idle', no marks; focus moves to the grid only if it was in the panel | N/A |
| Notes/select/mode | open | same step, same reference for `ui.hint` | N/A |
| Esc | panel open (Restart confirm closed) | `ui.hint` = null, panel gone, marks gone | Restart confirm open: Esc closes the confirm first |
| Solved | `status` 'solved' | "Hint" `aria-disabled`; `hintRequested` returns the same state | N/A |
| No placement | solver finds none | `{ kind: 'none' }`; panel opens or stays idle; no announcement | never throws |
| Other session | `ui.hint.sessionKey` A, active B | selector gives closed for B | N/A |
| New Puzzle | `freePlayGenerated` | `ui.hint` = null | N/A |

**Decisions (human, 2026-10-07):** A naked-single nudge names the cell's row ("Look for a naked single in row 4."), marking those 9 cells. Explanations are at most two sentences: the first joins one clause per elimination Step with ", and"; the second is a short placement line (e.g. "That leaves column 6 as the only place for a 3 in row 8."). "Show me the move" is shown but `aria-disabled` (focusable, inert) until Story 2.2; H at the explanation step does nothing. The spec is kept whole (about 2,600 tokens) by choice.

</frozen-after-approval>


## Code Map

- `src/engine/solver.ts` -- `nextStep` (registry order) and `applyStep` are private and exported respectively. Export `nextStep` for hints.
- `src/engine/step.ts`, `grid.ts` -- `Step` {technique, placements, eliminations, focusCells, unit}, `Unit`, `UNITS`, `rowOf/colOf/boxOf`. Only naked and hidden singles have placements, so pair, pointing and claiming only ever lead a chain.
- `src/game/reducer.ts` -- hard-codes `FREE_PLAY_KEY`. `record` wraps the `default` actions. `undo` and `restart` are separate. `freePlayGenerated` replaces the session under the same key.
- `src/ui/keyboard.ts` -- `keyToAction` (H reserved in `default`), and `useKeyboard` is on the `.puzzle-screen` container, so the nav is already excluded.
- `src/ui/puzzle-screen.tsx`, `action-row.tsx`, `sudoku-grid.tsx`, `puzzle.css` -- side column, Undo · Restart (focus-tracking pattern to copy), cell classes and labels, `.button--primary`.
- `src/content/copy.ts` -- `cellLabel(..., mistake)`. Content imports nothing, so restate unions as with `DIFFICULTY_NAMES`.

## Tasks & Acceptance

**Execution:**
- [x] `src/engine/hints.ts`, `solver.ts`, `index.ts` -- `findHint(grid: Grid): HintResult = { kind: 'chain'; chain: readonly Step[] } | { kind: 'none' }`. Use `computeCandidates`, then loop `nextStep`/`applyStep` until a Step has placements. Export `nextStep` and `findHint`. 2.4 adds `kind: 'mistake'`.
- [x] `tests/engine/hints.test.ts` -- identical result with the same digits and different (wrong) Notes; the Notes array is unchanged; elimination-only Steps come first, and only the last Step places; `none` without throwing (Inkala). For naked and hidden single, the last Step names the Technique. For naked pair, pointing and claiming, the first Step names it and the chain ends in a placement.
- [x] `src/content/techniques.ts` -- `TECHNIQUE_TEXT: Record<TechniqueKey, { nudge(unit): string; explain(facts): string; lead?(facts): string; conclude?(facts): string }>` for the five ids. Drafts are in Design Notes. No "!".
- [x] `src/game/types.ts`, `session.ts` -- `HintStep = 'idle' | 'nudge' | 'explain'`; `UiState.hint: { sessionKey; step; result: HintResult | null } | null` (null = panel closed), default null. Actions `hintRequested` and `hintClosed`.
- [x] `src/game/hint.ts` -- `activeHint(state, key)` (null unless the key matches), `hintFocusCells(hint): ReadonlySet<number>` (nudge: unit cells, with OQ1 for cells; explain: union of chain `focusCells`) and `hintView(hint): { label, text, button }` from `content`.
- [x] `src/game/reducer.ts` -- `hintRequested`: refused when no session or solved. Closed/idle → `findHint(parseGrid(digits))`, giving 'nudge', or idle on `none`. 'nudge' → 'explain'. 'explain' → same state. `hintClosed` → null. A post-step rule after every action: if the session's `digits` changed, set the open hint to `{step:'idle', result:null}`. `freePlayGenerated` sets it to null. Neither action touches `undo`.
- [x] `src/game/announce.ts` -- for `hintRequested`, when the step changes to 'nudge' or 'explain', return `hintView(...).text`.
- [x] `tests/game/hint.test.ts` -- every matrix row at reducer level. Two-session fixture (A, B) for `activeHint`. Notes, selection and mode keep the same `ui.hint` reference. Undo and Restart reset it. One announcement per step.
- [x] `tests/content/techniques.test.ts` -- every `TECHNIQUES` id has `nudge` and `explain`. Elimination ids have `lead`, and single ids have `conclude`. Rendering on fixtures gives non-empty text without "!". Also pin the hidden-single row string exactly.
- [x] `src/ui/keyboard.ts` -- `KeyContext.hintOpen`. h/H → `hintRequested`. Esc: Restart confirm first, then `hintClosed` if `hintOpen`, else null.
- [x] `src/ui/hint-panel.tsx`, `puzzle-screen.tsx`, `action-row.tsx`, `sudoku-grid.tsx`, `puzzle.css`, `copy.ts` -- the panel is first in the side column, labelled `region` "Hint", with the step label, text, one stable `<button>` and the caption "Esc to set aside". Track focus as `ActionRow` does: on reset or close with focus inside, focus the grid's tab-stop cell. Action row: Undo · Hint (`button--primary`, caption "H", `aria-disabled` when solved) · Restart. Grid: `hintCells` prop → `sudoku-cell--hint-focus` (2px dashed `postmark`, 3px inside the selected ring), and `cellLabel` gets a trailing ", hint". Use the panel styles from DESIGN and existing tokens only.
- [x] `tests/ui/hint-panel.test.ts`, `tests/ui/keyboard.test.ts`, `tests/ui/action-row.test.ts` -- panel order and focus order, idle/nudge/explain labels, marks and ", hint" names, Esc and focus return, H from the nav does nothing, a disabled Hint does nothing when solved, and the grid card's position is unchanged when the panel opens.

**Acceptance Criteria:**
- Given the real tree, then the architecture tests pass: `engine/hints` is pure, has no `brute`, and `ui` does not import `engine`.
- Given any Hint chain, then every Step has exactly the five keys and no display text.
- Given a Hint at step 1, when H is pressed twice, then the first press shows step 2 and the second changes nothing.

## Implementation Notes

- `hintView` takes the Session's digits as a second argument (`hintView(hint, digits)`). A naked pair's two digits are not in its `Step`, so `game/hint` replays the chain from those digits (`computeCandidates` + `applyStep`) to fill template facts. Any digit change resets the Hint, so these are always the digits it was found from.
- Hint fixtures live in `tests/engine/fixtures.ts` as `HINT_POSITIONS`. Pointing-led: a generated Hard (seed 5) mid-solve, giving pointing > pointing > naked single. Claiming-led: `NO_HIDDEN_SINGLE`. Naked-pair-led: a Medium mid-solve. Soundness is checked with `countSolutions` in tests only.
- Hint-focus ring is an `outline` with a negative offset, not a pseudo-element, because `::before` and `::after` already carry the box ticks and the Mistake dot.
- Idle text is empty. When the result is `none`, the panel shows only "Hint" / "Show a nudge", and pressing again changes nothing.
- Templates write "an 8" instead of "a 8".

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | VG | A "no Hint" result is never shown to reset on digit change | medium | patch | Simplifying the reset guard to `step === 'idle'` keeps all tests green. |
| 2 | VG | Column-direction pointing text is untested | medium | patch | Swapping `colOf`/`rowOf` in `factsOf` passes every test. |
| 3 | blind, edge | The step button looks active when there is no Hint | low | patch | `disabled` omits `result.kind === 'none'`. |
| 4 | blind | Nudge cells are tested only for a row | low | patch | `UNIT_OFFSET` assumes `UNITS` order; column and box nudges are unchecked. |
| 5 | blind | Inconsistent articles in pair and naked-single templates | low | patch | "can only be 2 or 4" then "can be a 2 or 4"; "That leaves 3…". |
| 6 | blind | The aria-disabled style is global, still reacts to hover, and sets no text colour | low | patch | `.button[aria-disabled]` rules lack hover/active neutralising and a text colour. |
| 7 | edge | Forced colors: the hint outline hides the selected cursor | low | patch | Both use `outline` on the same cell. |
| 8 | blind, edge | No announcement when there is no Hint or when a Hint resets | — | reject | The matrix says "no announcement" for the no-placement case; reset is silent by design. |
| 9 | blind, edge | Hints computed from wrong digits | — | reject | Story 2.4 adds the Mistake branch (intent excludes it here). |
| 10 | blind | `findHint` loop has no hard cap | low | reject | Every elimination removes a live candidate (pinned in 1.7 tests), so the loop is bounded. |
| 11 | blind | `hintView` recomputes on every render | low | reject | Cost is negligible; the digits invariant is enforced by the reducer reset. |
| 12 | blind | Test sessions pair positions with the sample solution | low | reject | Hints never read `solution`; no test asserts Mistakes or solved state on them. |
| 13 | blind | `hintRequested` carries no `sessionKey` | low | reject | Only one session exists until Epic 3, which adds session switching. |
| 14 | blind | Naked-pair facts read `focusCells[0]` | false | reject | The 1.7 naked-pair Technique always lists the pair cells first (exact-Step tests). |
| 15 | blind | The fallback could produce "..". | low | reject | Unreachable: every elimination Technique has a `lead`. |
| 16 | blind | Panel spacing reuses rule tokens | low | reject | The values match DESIGN; cosmetic coupling only. |
| 17 | blind, edge | Blur to nowhere is counted as still in the panel | low | reject | The same pattern as ActionRow; worst case, focus returns to the grid. |
| 18 | blind | H works while the Restart confirm is open | low | reject | Consistent with other keys (1.5 triage #8); Esc order is correct (browser-verified). |
| 19 | edge | The panel grows above the action row and moves it | low | reject | The layout follows the UX (panel first in side column); it shifts about one line between nudge and explanation. |
| 20 | edge | Pointing with a single spot names the wrong line | false | reject | Pointing requires 2 or more spots (1.7). |
| 21 | edge | Hint ring "3px inside" spacing; grid position is only DOM-tested | low | reject | Browser screenshots show distinct rings and no grid shift. |
| 22 | blind | Spec bookkeeping | — | reject | The workflow manages status; `hintView(hint, digits)` is recorded in the Implementation Notes. |

Real-browser smoke test (Chrome 155, Edge 154, both themes): all 6 steps pass with no console or CSP errors. Strings seen include "Look for a hidden single in row 3." and "In row 3, a 6 fits only in column 9. Every other empty cell in the row already has a 6 in its column or box."

## Design Notes

- **AC wording vs engine:** pair, pointing and claiming never place. So "the last `Step` names that Technique" applies to the singles, and for the other three the chain contains the Technique (it leads the chain). Fixtures must be verified, not trusted.
- **Why game, not ui, renders text:** `ui` can't import `engine`, and `announce` needs the same string. `hintView` keeps one source.
- **Numbering:** rows, columns and boxes are 1-based in text, and boxes are counted row-major.
- **Draft templates** (calm, reword freely):
  - Hidden single: "In row {r}, a {d} fits only in column {c}. Every other empty cell in the row already has a {d} in its column." Column and box variants are analogous.
  - Naked single: "Row {r}, column {c} can only be a {d}. Every other digit is already in its row, column or box."
  - Pointing lead: "in box {b}, every {d} sits in row {r}, so the rest of row {r} can't be a {d}". Claiming is the mirror.
  - Naked pair lead: "two cells in {unit} can only hold {a} and {b}, so no other cell there can".
  - Conclude: "That leaves column {c} as the only place for a {d} in row {r}."
- **Seams:** 2.2 replaces the 'explain' no-op with `hintApplied`. 2.3 renders inside `hint-panel.tsx`. 2.4 adds `HintResult.kind 'mistake'` and passes `solution` to `findHint`.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview`: start an Easy Puzzle and press H. Row cells get dashed rings, and the panel shows above the mode indicator without the grid moving. Press H again for the explanation, then place any digit: the panel goes idle. Esc closes it.
