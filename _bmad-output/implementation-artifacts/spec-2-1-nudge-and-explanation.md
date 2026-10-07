---
title: 'Story 2.1: Get a nudge and an explanation for the next move'
type: 'feature'
created: '2026-10-07'
status: 'draft'
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
- [ ] `src/engine/hints.ts`, `solver.ts`, `index.ts` -- `findHint(grid: Grid): HintResult = { kind: 'chain'; chain: readonly Step[] } | { kind: 'none' }`. Use `computeCandidates`, then loop `nextStep`/`applyStep` until a Step has placements. Export `nextStep` and `findHint`. 2.4 adds `kind: 'mistake'`.
- [ ] `tests/engine/hints.test.ts` -- identical result with the same digits and different (wrong) Notes; the Notes array is unchanged; elimination-only Steps come first, and only the last Step places; `none` without throwing (Inkala). For naked and hidden single, the last Step names the Technique. For naked pair, pointing and claiming, the first Step names it and the chain ends in a placement.
- [ ] `src/content/techniques.ts` -- `TECHNIQUE_TEXT: Record<TechniqueKey, { nudge(unit): string; explain(facts): string; lead?(facts): string; conclude?(facts): string }>` for the five ids. Drafts are in Design Notes. No "!".
- [ ] `src/game/types.ts`, `session.ts` -- `HintStep = 'idle' | 'nudge' | 'explain'`; `UiState.hint: { sessionKey; step; result: HintResult | null } | null` (null = panel closed), default null. Actions `hintRequested` and `hintClosed`.
- [ ] `src/game/hint.ts` -- `activeHint(state, key)` (null unless the key matches), `hintFocusCells(hint): ReadonlySet<number>` (nudge: unit cells, with OQ1 for cells; explain: union of chain `focusCells`) and `hintView(hint): { label, text, button }` from `content`.
- [ ] `src/game/reducer.ts` -- `hintRequested`: refused when no session or solved. Closed/idle → `findHint(parseGrid(digits))`, giving 'nudge', or idle on `none`. 'nudge' → 'explain'. 'explain' → same state. `hintClosed` → null. A post-step rule after every action: if the session's `digits` changed, set the open hint to `{step:'idle', result:null}`. `freePlayGenerated` sets it to null. Neither action touches `undo`.
- [ ] `src/game/announce.ts` -- for `hintRequested`, when the step changes to 'nudge' or 'explain', return `hintView(...).text`.
- [ ] `tests/game/hint.test.ts` -- every matrix row at reducer level. Two-session fixture (A, B) for `activeHint`. Notes, selection and mode keep the same `ui.hint` reference. Undo and Restart reset it. One announcement per step.
- [ ] `tests/content/techniques.test.ts` -- every `TECHNIQUES` id has `nudge` and `explain`. Elimination ids have `lead`, and single ids have `conclude`. Rendering on fixtures gives non-empty text without "!". Also pin the hidden-single row string exactly.
- [ ] `src/ui/keyboard.ts` -- `KeyContext.hintOpen`. h/H → `hintRequested`. Esc: Restart confirm first, then `hintClosed` if `hintOpen`, else null.
- [ ] `src/ui/hint-panel.tsx`, `puzzle-screen.tsx`, `action-row.tsx`, `sudoku-grid.tsx`, `puzzle.css`, `copy.ts` -- the panel is first in the side column, labelled `region` "Hint", with the step label, text, one stable `<button>` and the caption "Esc to set aside". Track focus as `ActionRow` does: on reset or close with focus inside, focus the grid's tab-stop cell. Action row: Undo · Hint (`button--primary`, caption "H", `aria-disabled` when solved) · Restart. Grid: `hintCells` prop → `sudoku-cell--hint-focus` (2px dashed `postmark`, 3px inside the selected ring), and `cellLabel` gets a trailing ", hint". Use the panel styles from DESIGN and existing tokens only.
- [ ] `tests/ui/hint-panel.test.ts`, `tests/ui/keyboard.test.ts`, `tests/ui/action-row.test.ts` -- panel order and focus order, idle/nudge/explain labels, marks and ", hint" names, Esc and focus return, H from the nav does nothing, a disabled Hint does nothing when solved, and the grid card's position is unchanged when the panel opens.

**Acceptance Criteria:**
- Given the real tree, then the architecture tests pass: `engine/hints` is pure, has no `brute`, and `ui` does not import `engine`.
- Given any Hint chain, then every Step has exactly the five keys and no display text.
- Given a Hint at step 1, when H is pressed twice, then the first press shows step 2 and the second changes nothing.

## Implementation Notes

## Spec Change Log

## Review Triage Log

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
