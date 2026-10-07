---
title: 'Story 1.7: Fair puzzles: Technique solver and grader'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '6ad0b3e5db77f0ee9490b267e8818a2c5f67e5cd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `src/engine/` is empty, so nothing can say whether a Puzzle is fair or how hard it is. The sample Puzzle's Difficulty is only declared, and the Puzzle header has no title.

**Approach:** Build the pure engine core: candidates from digits, the five-Technique registry returning structured `Step`s, a solver that always takes the first Technique that applies, a grader built on that solver, and a separate `brute.ts` solution counter. An architecture rule keeps `brute.ts` away from solver, grader and Hint code. Prove the sample Puzzle is unique and graded as declared, and show "Free Play · {Difficulty}" in the header.

## Boundaries & Constraints

**Always:** `engine/` imports only `engine/` and stays deterministic: no `Math.random`, `Date`, DOM or storage, and the existing checker must pass. Techniques scan in a fixed order (cells 0–80; units rows 0–8, then columns, then boxes; digits 1–9) and return the first `Step` found. A `Step` that only eliminates must remove at least one live candidate. Game outcomes never throw: an unsolvable-by-MVP grid returns `solved: false`, and the grade is `'notGradeable'`. Candidates come from digits only, never from Notes. Header copy lives in `src/content/copy.ts`, and styling uses tokens only.

**Never:** a generator, seeded random generator or Web Worker (Story 1.8); Hints or Technique texts (Epic 2); a Mistake function (Story 1.6); Techniques beyond the five; `brute.ts` imported by anything in `src/` except `src/engine/generator*`; a Stamp in Free Play; changes to reducer behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Candidates | sample givens | 81 masks; filled cells 0; cell 2 (r1c3) = bits for {1,2,4} | N/A |
| Technique applies / not | one fixture each per Technique | exact `Step` (placements, eliminations, focusCells, unit) / `null` | N/A |
| Grade easy / medium / hard | singles-only / pair-needing / pointing- or claiming-needing fixture | `'easy'` / `'medium'` / `'hard'` | N/A |
| Beyond MVP | a known hard Puzzle (e.g. Inkala 2012) | `solve` → `{ solved: false }` with its partial steps; `grade` → `'notGradeable'` | no throw |
| Brute | conflicting givens / unique / multi-solution (deadly rectangle opened) | `countSolutions(g, 2)` = 0 / 1 / 2 | no throw |
| Determinism | any fixture run twice | deep-equal results | N/A |

</frozen-after-approval>

## Code Map

- `src/engine/.gitkeep` -- the empty engine layer; delete it once real files exist.
- `src/game/types.ts` -- owns `Difficulty` today; `engine` can't import `game`, so move the type into the engine and re-export it here.
- `src/content/sample-puzzle.ts` -- givens, solution, `difficulty: 'easy'`. It is singles-solvable (checked during planning).
- `src/ui/app.tsx` -- the header (wordmark and tagline). The Puzzle title goes here per DESIGN › Header. `theme.css` has `--type-city-title-*` tokens.
- `tests/architecture/check-architecture.ts`, `architecture.test.ts` -- the pure AST checker pattern (`checkArchitecture`, `checkKeyHandlers`) to extend.

## Tasks & Acceptance

**Execution:**
- [x] `src/engine/grid.ts` -- `Grid = readonly number[]` (81, 0 = empty), `parseGrid(s)`, `formatGrid(g)`, `UNITS` (27 units: rows, columns, boxes), `PEERS`, and `Unit = { kind: 'row' | 'column' | 'box' | 'cell'; index: number }`.
- [x] `src/engine/candidates.ts` -- `computeCandidates(grid): number[]` (bit d−1 = d; 0 for filled cells).
- [x] `src/engine/step.ts` -- `TechniqueId = 'nakedSingle' | 'hiddenSingle' | 'nakedPair' | 'pointing' | 'claiming'`; `Step = { technique, placements: {cell, digit}[], eliminations: {cell, digit}[], focusCells: number[], unit: Unit }`; `Technique = (grid, candidates) => Step | null`.
- [x] `src/engine/techniques/{naked-single,hidden-single,naked-pair,pointing,claiming}.ts` and `techniques/index.ts` -- one module per Technique; `TECHNIQUES` is an ordered `readonly { id, rank, find }[]` (ranks 1–5).
- [x] `src/engine/solver.ts` -- `applyStep(grid, candidates, step)` and `solve(grid): { solved, grid, steps }`. Loop: the first registry hit → apply → repeat until full or no hit.
- [x] `src/engine/grader.ts` -- `Difficulty`, `Grade = Difficulty | 'notGradeable'`, `grade(grid): Grade` from the highest rank in `solve(grid).steps`.
- [x] `src/engine/brute.ts` -- `countSolutions(grid, limit = 2): number`, deterministic backtracking (fewest-candidates cell first). It returns 0 for conflicting givens.
- [x] `src/engine/index.ts` -- re-exports the public API above except `brute`.
- [x] `src/game/types.ts` -- `export type { Difficulty } from '../engine/grader.ts'`.
- [x] `tests/architecture/check-architecture.ts`, `architecture.test.ts` -- `checkBruteImports(files)`: any `src/**` file other than `src/engine/brute*` and `src/engine/generator*` importing `engine/brute` is a violation naming the file. Test the violation, the allowed generator case and the clean real tree.
- [x] `src/content/copy.ts`, `src/ui/puzzle-title.tsx`, `src/ui/app.tsx`, `puzzle.css` -- `copy.freePlayTitle(d)` → "Free Play · Easy". `PuzzleTitle` renders it as `<h1>` in `city-title` type inside `app-header`, with no Stamp. If AppState still lives in `PuzzleScreen`, lift `useReducer` into `App` and pass `state`/`dispatch` down.
- [x] `tests/engine/fixtures.ts` -- the known-puzzle set: a position where each Technique applies and one where it doesn't, plus easy/medium/hard/beyond-MVP/unsolvable/multi-solution Puzzles. Each fixture must be verified by the tests, not trusted.
- [x] `tests/engine/{candidates,techniques,solver,grader,brute}.test.ts`, `tests/content/sample-puzzle.test.ts`, `tests/ui/puzzle-title.test.ts` -- every matrix row, plus the registry order and length.

**Acceptance Criteria:**
- Given `TECHNIQUES`, when read, then the ids are exactly `nakedSingle, hiddenSingle, nakedPair, pointing, claiming` in that order, and each `find` is typed `Technique`.
- Given any `Step` from `solve` over every fixture, when its keys are inspected, then they are exactly the five fields, and no value is display text.
- Given the sample Puzzle, then `countSolutions(givens, 2) === 1`, `solve(givens).grid === solution`, and `grade(givens) === samplePuzzle.difficulty`.
- Given the app renders, then the header shows "Free Play · Easy" in `city-title`, with no Stamp.
- Given the real tree, then `checkArchitecture` and `checkBruteImports` report nothing.

## Implementation Notes

- `src/engine/.gitkeep` was already gone (Story 1.6 added `engine/mistakes.ts`); `engine/index.ts` also re-exports `mistakeCells`.
- `solve`/`grade`/`countSolutions` take a `Grid` (number array); callers use `parseGrid`/`formatGrid` for the 81-char strings.
- Pointing and claiming require at least two cells holding the digit (one cell is a hidden single). Two or more cells share at most one line, so pointing checks a single row or column per box and digit.
- `solved` is true only for a full grid with every unit valid, so conflicting givens never report solved.
- `PuzzleTitle` renders only on the Puzzle screen (Settings keeps its own `h1`). It sits on its own line beneath the wordmark via `flex-basis: 100%`. Added the `--type-city-title-weight: 400` token (DESIGN city-title fontWeight).
- AppState was already lifted into `App` (Story 1.6), so nothing moved.
- Fixtures came from a scratch generator (relabel/shuffle of the sample solution, then cell removal while `countSolutions === 1`). Inkala 2012: unique, the solver finds 0 Steps, so it grades `notGradeable`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | VG, blind | One pointing direction has no exact-Step test | medium | patch | The VG reviewer deleted the row branch and all 77 engine tests still passed. |
| 2 | VG | `isSolvedGrid` unit check is unpinned | medium | patch | Replaced with `return true`, all tests still passed; no fixture is full but invalid. |
| 3 | VG, edge | The "partial Steps" test replays 0 Steps | medium | patch | Inkala yields 0 Steps; dropping partial steps keeps tests green. |
| 4 | blind | Pointing's "row before column" loop is unreachable | low | patch | With 2 or more spots, the cells can't share both a row and a column. |
| 5 | blind, edge | Fixture claims unchecked; the elimination-only null test asserts nothing; `solution` doc wrong for beyondMvp | low | patch | `hardPointing` "no claiming", `easy` "needs hidden singles" and NO_HIDDEN_SINGLE are not asserted; the `if (next)` body asserts nothing when null. |
| 6 | blind | The `copy` doc comment is displaced by `DIFFICULTY_NAMES` | low | patch | The comment now documents the wrong symbol. |
| 7 | VG | The header title's Difficulty source is untested | medium | defer | Only the Easy sample reaches `App` today; 1.8 adds Medium and Hard. |
| 8 | blind, edge | Grader rank thresholds and the `?? 1` fallback | low | reject | `technique` is a typed `TechniqueId`, so the fallback is unreachable; no new Techniques are planned. |
| 9 | edge | A full grid grades `easy` | low | reject | The generator never grades a full grid. |
| 10 | blind, edge | Brute guard allows the `brute*`/`generator*` prefix and re-exports | low | reject | Developer-only; the guard covers the planned files. |
| 11 | blind | The solver doesn't report contradictions | false | reject | It returns `solved: false`; the spec asks for nothing more. |
| 12 | blind | Hidden single and naked pair are tested only on rows | low | reject | Scan order is shared code; the pointing gap (the real one) is patched in #1. |
| 13 | blind, edge | No range or length checks on `Grid`, `limit <= 0`, or a non-integer limit | low | reject | Grids come from `parseGrid` or the generator; the bad input is unreachable. |
| 14 | blind | `.puzzle-title` CSS lives in `puzzle.css` | low | reject | `App` imports `PuzzleScreen` statically, so the CSS is always loaded. |
| 15 | blind | The title `h1` never receives focus | false | reject | Per 1.6, focus moves to the grid on return to the Puzzle. |
| 16 | edge | `sessions[FREE_PLAY_KEY]` undefined crashes the header | false | reject | The session always exists until 1.8, which reworks startup. |
| 17 | edge | `freePlayTitle` with an unknown Difficulty; test cwd | low | reject | The value is typed and nothing is persisted; vitest runs from the root. |
| 18 | blind | Spec frontmatter and API list are stale | — | reject | The workflow manages status; the fix would edit the spec. |

## Design Notes

- **Candidates through the solve:** `computeCandidates` runs once. `applyStep` then sets placed digits, removes them from peers' masks and clears eliminations, so pair, pointing and claiming eliminations persist between Steps.
- **Units per Technique:** a naked single's `unit` is `{kind:'cell'}`. A hidden single's and naked pair's `unit` is the unit searched. Pointing's `unit` is the box (`focusCells` = the box cells holding the digit), and its eliminations fall on the line outside the box. Claiming's `unit` is the row or column, and its eliminations fall in the box outside the line.
- **Public engine API for 1.8:** `parseGrid`, `formatGrid`, `computeCandidates`, `TECHNIQUES`, `solve`, `grade`, `Difficulty`, `Step`, plus `countSolutions` imported directly from `engine/brute.ts` by `engine/generator.ts`. 1.8 adds `generate(seed: number, difficulty: Difficulty): { givens, solution, difficulty }` that accepts only `countSolutions === 1 && grade === difficulty`.
- **Building fixtures:** a throwaway script in the scratchpad may use `countSolutions` and `grade` to find or confirm fixtures. Only the literal strings get committed.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview`: the header reads "Free Play · Easy" in the 30px serif title beneath the wordmark, with no Stamp.
