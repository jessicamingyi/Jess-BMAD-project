---
title: 'Story 1.2: Solve a puzzle with the mouse'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: '6b7d6aba2306bf37d366434d5d66a5f841d5daa4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The shell shows only a header. Players can't yet see or play a Puzzle, and later stories have no `AppState`, reducer, Session or grid to build on.

**Approach:** Load a built-in sample Puzzle from `src/content/` into `sessions['free']`. Render the Puzzle screen (grid card left, side column with a 3×3 digit pad right). Route every click through a pure `game/reducer` that places, replaces and clears player digits, refuses changes to Givens, and detects the solve in the same step.

## Boundaries & Constraints

**Always:** `AppState = { album, sessions, settings, meta, ui }`. Session = `{ key: 'free', givens, solution, digits, notes, status, difficulty, hintsUsed }` (81-char digit strings, cells 0–80 row-major, `notes` = 81 zeros). Actions are past-tense (`cellSelected`, `digitEntered`); the reducer never mutates its input and returns the *same* state object when nothing changes. The solve is detected only inside the reducer (`digits === solution` → `status: 'solved'`). Mistakes look exactly like other player digits. Styling uses theme tokens only. The AD-1 architecture test and the shell tests stay green.

**Never:** a `puzzleSolved` action; lives, counters, timers, "Wrong!", red Mistakes, modals, overlays on the grid, animation or sound. Out of scope: Notes, number-first input, digit-pad counts/"Done" (1.3), Undo/Restart (1.4), keyboard, `role="grid"` and the live region (1.5), highlights, Mistake Assist, nav, Settings (1.6), the Puzzle header title (1.7), the "Full, not solved" line (2.4), saving (Epic 4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Startup | app loads | `sessions.free` built from the fixture: `digits` = `givens`, notes all 0, `inProgress`, `hintsUsed: 0` | N/A |
| Select | `cellSelected(c)` | `ui.selectedCell = c` (Givens are selectable too) | N/A |
| Place / replace | empty cell selected, `digitEntered(5)` then `(8)` | the cell holds 5, then 8 | N/A |
| Same digit clears | the cell holds player 5, `digitEntered(5)` | the cell becomes 0 | N/A |
| Given | a Given is selected, `digitEntered(d)` | same state object returned | silent, no message |
| No selection | `digitEntered(d)` | same state object returned | N/A |
| Mistake | a wrong digit is entered | stored and shown like any player digit; still `inProgress` | N/A |
| Full, wrong | the last empty cell is filled, `digits ≠ solution` | `inProgress`; input stays live | N/A |
| Solve | the last correct digit is entered | the same step sets `status: 'solved'`; later `digitEntered` returns the same state | N/A |
| Immutability | any changing action | new state; the input state (deep-frozen in the test) is untouched | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/app.tsx` -- shell from 1.1 (header + empty `<main className="app-main">`); render the Puzzle screen inside `<main>` and keep the header.
- `src/ui/theme.css` -- token names: `--color-*`, `--size-cell`, `--size-grid-pad`, `--rule-thin|box|frame`, `--space-1..7`, `--size-side-column-max`, `--size-app-gutter-x|y`, `--type-cell-given-*`, `--type-cell-player-*`, `--type-meta-size`. Add new tokens here (e.g. the grid frame shadow); no hex values anywhere in `src/ui` except this file.
- `src/main.tsx` -- entry point; leave it alone.
- `tests/architecture/check-architecture.ts` -- enforces: `game` → `engine`, `content` only, with no packages, `Date` or `Math.random`; `ui` → `game`, `content`, `persistence`, `workers`. Directory imports (`'../engine'`) resolve to their layer.
- `tests/shell.test.ts` -- recursively scans `src/ui` for raw hex; `vite.config.ts` runs `tests/**/*.test.ts` in the `node` environment (there's no DOM test setup, and none is needed).

## Tasks & Acceptance

**Execution:**
- [x] `src/content/sample-puzzle.ts` -- export `samplePuzzle = { givens, solution, difficulty: 'easy' }`. Givens `530070000600195000098000060800060003400803001700020006060000280000419005000080079`, solution `534678912672195348198342567859761423426853791713924856961537284287419635345286179`. -- Fixture (AC 1).
- [x] `src/game/types.ts` -- `Difficulty`, `SessionStatus`, `Session`, `AppState`, `Action` (a discriminated union on `type`). `album` and `settings` are empty objects for now; `meta = { lastPlayedKey: string | null }`; `ui = { selectedCell: number | null }`. -- AD-5, AD-10.
- [x] `src/game/session.ts` -- `createSession(key, puzzle)` and `createInitialState(puzzle)`. -- Startup.
- [x] `src/game/reducer.ts` -- `reducer(state, action)` implementing the matrix. A change to digits also sets `meta.lastPlayedKey = 'free'`. -- AD-5, AD-6.
- [x] `tests/game/reducer.test.ts` -- one test per matrix row, plus a check that the fixture's `solution` is a valid Sudoku that agrees with every Given. -- Matrix coverage.
- [x] `src/ui/puzzle-screen.tsx`, `src/ui/sudoku-grid.tsx`, `src/ui/digit-pad.tsx` (and `src/ui/puzzle.css` if wanted) -- `useReducer(reducer, samplePuzzle, createInitialState)` lives in the Puzzle screen. Cells and pad keys are `<button type="button">` (at least 24px) that dispatch `cellSelected` / `digitEntered`. The side column shows the pad and, once solved, an italic `meta` line "Solved.". -- UX-DR7, 8, 9 (selected only), 37, 54.
- [x] `src/ui/app.tsx` -- render `<PuzzleScreen />` in `<main>`. -- Wiring.

**Acceptance Criteria:**
- Given 1280px wide, when the Puzzle screen renders, then the grid card (`card` background, 3px `rule-box` frame, 14px padding, 58px cells, 1px `rule-thin` cell rules, 2px `rule-box` box rules, shadow `0 6px 18px` of `ink` at 18% via a token, rotated −0.4°) sits left and the side column (max 440px) right, 44px apart, inside 44px × 26px gutters.
- Given a width under 1100px, when it renders, then the side column stacks under the grid and cells stay 58px.
- Given a selected cell, then it shows `fill-selected` and a 3px inset `airmail-red` ring; Givens use `cell-given`/`given`, player digits `cell-player`/`player-ink`, empty cells `card` only.
- Given the Puzzle is solved, then the grid stays visible, pad clicks change nothing, and the side column shows the italic line "Solved." with no other effect.

## Implementation Notes

- Review pass 1 patches applied: `tests/ui/sudoku-grid.test.ts` (renderToStaticMarkup), `copy.cellLabel` (given / your digit / empty), grid `role="group"` + `aria-current`, no-op guard tests, `--type-cell-player-weight`; `tsconfig.node.json` gains `jsx: react-jsx` so tests can import .tsx. 64/64 tests pass.

## Spec Change Log

## Review Triage Log

Pass 1 (blind = B, edge-case = E, verification-gap = V).

| Finding | Verdict | Evidence | Route |
|---|---|---|---|
| V1/B6 grid kind/selected/box-rule classes have no automated check | medium | Pre-verified: no test imports `src/ui/*.tsx`; `renderToStaticMarkup` works in the node env with no new dependency. | patch |
| B3 screen readers can't tell Givens from player digits | medium | Label is "Row r, column c, 5" for both; EXPERIENCE labels are "…, given" / "…, your digit" / "…, empty". | patch |
| B2 cell label hard-coded outside `copy.ts` | low | Template literal in `sudoku-grid.tsx`; epic convention centralises strings. Direct move. | patch |
| E10/B1 grid `aria-label` on a role-less div is ignored | low | Plain `<div>` with `aria-label`; `role="group"` is a one-attribute fix (`role="grid"` is 1.5). | patch |
| B4/E10 `aria-pressed` announces 81 toggles | low | Selection is single-choice, not toggles; swap to `aria-current`. | patch |
| B5 no-op guard branches (bad cell, reselect, bad digit, unknown action) untested | low | Tests cover only the Given and no-selection no-ops; Undo (1.4) depends on no-op identity. | patch |
| B7 `font-weight: normal` on player cells, not a token | low | Given weight uses a token; direct one-token fix. | patch |
| E4/B9 selection still moves after solve; pad looks live | low | AC requires only that pad clicks change nothing (true); moving the ring has no effect on the Puzzle. | reject |
| E5 no action to clear the selection | low | No AC or UX rule asks for a deselect; fix adds an action. | reject |
| E7/B8 grid overflows below ~640px | low | Platform is desktop browsers only (epic context); fix adds layout rules. | reject |
| B10 reducer hard-wired to `sessions.free` | low | Only one session exists until Epic 3; adding an active key now is new surface. | reject |
| E1 no validation of puzzle strings | low | Only the verified fixture feeds sessions; a generator check comes with 1.7/1.8. | reject |
| E2 givens = solution stays `inProgress` | false | No such Puzzle exists; the fixture has 51 empty cells and the generator (1.8) must leave cells empty. | reject |
| E3 `givens[cell]` undefined | false | `isCell` restricts `selectedCell` to 0–80 and fixture strings are 81 chars. | reject |
| E6 missing `sessions.free` crashes the screen | false | `createInitialState` always seeds it in this story; 1.8 replaces startup. | reject |
| E8 `color-mix()` unsupported | false | Supported in all current desktop Chrome, Edge, Firefox and Safari. | reject |
| E9 pad has no disabled state or feedback | false | The forgiving rules require silent refusal; UX keeps keys clickable. | reject |

## Design Notes

- **No-op returns `state` itself.** That gives AC "reducer returns the same `digits`" a precise test (`toBe(state)`), and later Undo (1.4) relies on it to record nothing for no-ops.
- **Digit change:** `digits.slice(0, c) + d + digits.slice(c + 1)`. Only `sessions.free` is touched, and `status` is recomputed in the same return.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0
- `grep -c "/Jess-BMAD-project/assets/" dist/index.html` -- expected: ≥ 1

**Manual checks (if no CLI):**
- `npm run preview`, open it in headless Chrome at 1280px and at 1000px, and take screenshots: the grid is left of the pad at 1280 and the pad is below it at 1000. Click a cell then a key, and the digit appears italic.
