---
title: "Story 2.3: What's a [Technique]?"
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '3ff2f96ce1a47b9aaafc8d69dea541c596269c15'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Hint names a Technique but never says what it is, so the player can't learn to spot it alone (FR10).

**Approach:** Add a short definition per Technique to `content/techniques`. At steps 1 and 2 the panel shows a "What's a {technique}?" link that opens the definition inline inside the panel. Open/closed state lives on `ui.hint`, so the existing reset rule closes it.

## Boundaries & Constraints

**Always:** Definitions and link text live in `content/techniques` with no "!". A test fails if any registry Technique lacks either. The link shows only at 'nudge'/'explain' with a `chain` result. Opening or closing the definition never changes the step, text, hint-focus marks, digits, Notes or Undo, and is never announced through the LiveRegion (focus moving there is enough). Esc is handled only in `src/ui/keyboard.ts`, in this order: Restart confirm, then definition, then panel. Nothing overlays or moves the grid. `ui` never imports `engine`.

**Never:** A modal, popover or anything over the grid. The Mistake branch (2.4; its result just shows no link). Saving the definition state. Changes to `engine/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Link | step 'nudge' or 'explain', chain [pointing, hiddenSingle] | link "What's pointing?" (OQ1); the Technique of the chain's first Step (the one the nudge names) | N/A |
| Open | click/Enter on link | `ui.hint.definitionOpen` true; definition below the link; focus → definition; step, text and marks unchanged | N/A |
| Close | Esc, close control, or link clicked again | `definitionOpen` false; panel at the same step; focus → link if it was in the panel, else stays put | N/A |
| Esc order | Restart confirming + definition open | 1st Esc cancels Restart, 2nd closes definition, 3rd closes panel | N/A |
| Step advance | definition open at 'nudge', H/step button | 'explain'; definition stays open (same chain, same Technique) | N/A |
| Digits change | digit, clear, Undo, Restart, Hint move | panel idle, definition gone; focus to grid if it was in the panel | N/A |
| Stale | no Hint, other Session, 'idle', result not chain | open/close return the same `state` reference | never throws |

**Decisions (human, 2026-10-07, delegated: user asked Claude to proceed with its recommended choices):** the link names the Technique of the chain's first Step, the same Technique the nudge names. That is never a single in a multi-step chain, since singles end a chain. *(Amended 2026-10-07 under the same delegation; it replaces the earlier "hardest Technique in the chain", which the browser check showed pairing "Look for a naked pair in box 6." with "What's pointing?". See Spec Change Log.)*

**Decisions (delegated, 2026-10-07: the user asked Claude to proceed with its recommended choices):** Link text is per Technique: "What's a naked single?", "What's a hidden single?", "What's a naked pair?", "What's pointing?", "What's claiming?". The definition opens directly below the Hint text (small-caps `airmail-red` title, the definition, a "Close" control), and the link stays visible and toggles it (`aria-expanded`). Definition copy is the five drafts in Design Notes. The spec is kept whole (about 2,200 tokens).

</frozen-after-approval>


## Code Map

- `src/content/techniques.ts` -- `TechniqueText` per `TechniqueKey`. Add `name`, `link` and `definition`. Content can't import the engine, and ids are restated.
- `src/engine/techniques/index.ts` -- `TECHNIQUES` with `rank` (1–5). `game` may import it.
- `src/game/hint.ts` -- `shownChain`, `hintView` (`HintView` has label, text, button). Extend these.
- `src/game/types.ts` -- `HintState`, `Action` union.
- `src/game/reducer.ts` -- `resetHintOnDigits` rebuilds the Hint without extra fields (closes the definition for free). `requestHint` spreads `...hint` at nudge→explain (keeps it open). `hintClosed` nulls the Hint.
- `src/ui/keyboard.ts` -- the Esc branch and `KeyContext`. `useKeyboard` deps.
- `src/ui/hint-panel.tsx` -- the focus effect (`focusInPanel`, `lastStep`). The render.
- `src/ui/puzzle-screen.tsx` -- wires the panel and the keyboard context.
- `src/ui/puzzle.css` -- `.hint-panel*`, `.link-button` (`ink` colour, `--size-underline-offset`).
- Tests: `tests/content/techniques.test.ts`, `tests/game/hint.test.ts`, `tests/game/announce.test.ts`, `tests/ui/keyboard.test.ts`, `tests/ui/hint-panel.test.ts`. Its focus-order test will gain the link.

## Tasks & Acceptance

**Execution:**
- [x] `src/content/techniques.ts` -- add `name` ("hidden single"), `link` (OQ1) and `definition` (1–2 plain sentences, OQ3) to `TechniqueText` and all five entries.
- [x] `src/game/types.ts` -- `HintState.definitionOpen?: boolean` (absent = closed). Actions `techniqueDefinitionOpened` and `techniqueDefinitionClosed`, with doc comments.
- [x] `src/game/hint.ts` -- `hintTechnique(hint): TechniqueKey | null`: the highest-`rank` Technique in `shownChain`, else null (2.4's Mistake result → null). Extend `HintView` with `technique: { link; title; definition } | null`, filled at nudge/explain.
- [x] `src/game/reducer.ts` -- open/close set `definitionOpen` only when `hintTechnique(activeHint)` is non-null and the value changes. Otherwise return `state`. Not recorded in Undo.
- [x] `src/ui/keyboard.ts` -- `KeyContext.definitionOpen`. Esc → `techniqueDefinitionClosed` after the Restart check, before `hintClosed`. Add it to the deps.
- [x] `src/ui/hint-panel.tsx` -- render the link `<button class="link-button hint-panel-link" aria-expanded aria-controls>` after the text, and the definition region (`tabIndex=-1`, labelled by its title) with a "Close" control (OQ2). Props `definitionOpen`, `onDefinition(open)`. Focus effect: on open → definition. On close with the step unchanged and focus in the panel → link. A reset to idle keeps the existing grid rule.
- [x] `src/ui/puzzle-screen.tsx` -- pass `definitionOpen` to the panel and the keyboard. Dispatch the open/close actions.
- [x] `src/ui/puzzle.css` -- `.hint-panel-link` in `airmail-red`, underline offset 3px. Definition block styles (OQ2). Forced-colors safe.
- [x] `src/content/copy.ts` -- `hintDefinitionClose: 'Close'`.
- [x] `tests/content/techniques.test.ts` -- every registry id has a non-empty `name`/`link`/`definition` without "!". Pin the link strings.
- [x] `tests/game/hint.test.ts` -- `hintTechnique` picks the highest rank on a pointing fixture chain. Every matrix row at reducer level, including stale refs and the reset closing it.
- [x] `tests/game/announce.test.ts` -- open/close announce nothing.
- [x] `tests/ui/keyboard.test.ts`, `tests/ui/hint-panel.test.ts` -- the Esc order, link visible at steps 1 and 2 and not at idle, open/close focus targets, grid position unchanged, the updated focus order.

**Acceptance Criteria:**
- Given an open definition, when the player places a digit with focus in the grid, then the panel is idle, the definition is gone and focus stays in the grid.
- Given the real tree, then the architecture tests pass (one keyboard handler, `ui` doesn't import `engine`).

## Implementation Notes

## Spec Change Log

- **2026-10-07, review loop 1 (delegated decision amended):** the trigger was the real-browser smoke test on Hard Puzzles. It found nudge "Look for a naked pair in box 6." next to link "What's pointing?" (chain: naked pair x3, pointing, single), and VG review noted that no test pins a mixed chain. The link Technique changes from the highest-rank Step to `chain[0]`, which keeps the nudge and link consistent and still never names a single for multi-step chains. Known-bad state avoided: a mismatched nudge and link. KEEP: the per-Technique link wording, the definition below the text with the toggling link, the definition copy, the focus rules, the Esc order, and step advance keeping the definition open.

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | smoke, VG, blind | Nudge and link name different Techniques; the max-rank scan is unpinned | medium | spec amended (delegated decision), then patch | Browser: "Look for a naked pair in box 6." beside "What's pointing?". Fixed by naming `chain[0]`; see the Spec Change Log. |
| 2 | blind, edge | Keyboard `definitionOpen` isn't gated on a Technique, so Esc could be swallowed | low | patch | The panel and reducer gate it; the keyboard context doesn't. Story 2.4's Mistake kind makes this reachable. |
| 3 | blind | `aria-controls` dangles while the definition is closed | low | patch | The id is rendered only while open. |
| 4 | blind | `name` and `link` can drift | low | patch | No test links them. |
| 5 | blind | Untested focus on step advance and a fresh Hint after Esc | low | patch | Only idle resets are covered. |
| 6 | blind | Unknown Technique silently ranked 0 | — | reject | Moot: the rank scan is removed by #1. |
| 7 | blind | `role="region"` is heavy for the definition | low | reject | It gives a labelled, focusable target, which the spec requires. |
| 8 | blind | Weak sentence-count test; `typeof` checks | low | reject | The definitions are fixed copy and pinned by review. |
| 9 | blind | CSS gaps: Close control styling and forced colors; `position: relative` | low | reject | Close uses the shared `.link-button` styles; forced colors falls back to system colours. |
| 10 | blind | A second underline-offset token | low | reject | It matches the UX's 3px for this link; documented in `theme.css`. |
| 11 | smoke | No focus ring visible on the definition after opening | false | reject | The script opened it by mouse; `:focus-visible` correctly shows no ring for pointer-initiated focus. |

Real-browser smoke test (Chrome 155): all 5 steps pass with no errors. Definitions seen: "Naked single", "Hidden single", "Naked pair", "Pointing", "Claiming". The grid box was unchanged with the definition open, and the Esc order was correct.

## Design Notes

- **Why on `ui.hint`, not React state:** Esc must reach `keyboard.ts`, and `resetHintOnDigits`/`hintClosed` already drop the field, so "closes with the Hint" needs no new code.
- **Hardest = max `rank`:** chains are elimination Steps ending in a single, so the final Step is always a single. Ties don't matter (same Technique).
- **Definition drafts (OQ3):**
  - Naked single: "A cell where only one digit is left, because the other eight are already in its row, column or box."
  - Hidden single: "A digit that fits in only one cell of a row, column or box, even if that cell could hold other digits."
  - Naked pair: "Two cells in a row, column or box that can only hold the same two digits. Those digits can't go anywhere else in that row, column or box."
  - Pointing: "When a digit's only places in a box all sit in one row or column, it can't go anywhere else in that row or column."
  - Claiming: "When a digit's only places in a row or column all sit in one box, it can't go anywhere else in that box."

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview`: press H on a Medium Puzzle until a pointing chain appears. "What's pointing?" opens the definition below the text with focus on it. Esc returns focus to the link, and a second Esc closes the panel. The grid never shifts.
