---
title: 'TS-62: lower the Difficulty levels (minimum Givens per Difficulty)'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'f6a8296ae7e16857e42a592c506928fe2fd38091'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Easy is too hard. Difficulty is set only by the hardest Technique a Puzzle needs. The generator then removes every Given it can, so all three levels start with about the same number of Givens (City Puzzles: Easy 24–27, Medium 23–27, Hard 23–26).

**Approach:** Keep the Technique-to-Difficulty mapping, and add a minimum number of Givens per Difficulty: **Easy ≥ 61, Medium ≥ 40, Hard ≥ 32** (decided 13 Oct). Target: a calm player solves an Easy Puzzle in about one minute (about 20 empty cells). This is a design target, not an in-game timer ("No rush" stands). A Puzzle must still have exactly one solution and grade exactly to its Difficulty. Regenerate all 30 City Puzzles with the new rule. Free Play uses the same minimums.

## Boundaries & Constraints

**Always:**
- Generation stays pure and deterministic per `(seed, difficulty)` (AD-1); it never throws.
- Every generated Puzzle: unique solution, `grade(givens) === difficulty`, Givens count ≥ that Difficulty's minimum.
- Saved Sessions keep their own `givens`/`solution` (AD-10). An in-progress City keeps its old grid; new starts and replays get the new Puzzle. No save migration.
- The released-entry snapshot test stays in force after this one-off regeneration.

**Never:**
- No change to Techniques, ranks, the grader, Tier→Difficulty, the Hint system or the UI.
- `build:cities` stays append-only; regeneration is a one-off for TS-62, done because the game isn't live yet (TS-38 not done).
- No new Difficulty level.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Easy Free Play | `generate(seed, 'easy')` | ≥ 61 Givens, grades `easy`, unique | N/A |
| Medium / Hard | `generate(seed, 'medium' \| 'hard')` | ≥ 40 / ≥ 32 Givens, grade exact, unique | N/A |
| Saved Lisbon in progress | Session with old givens, content now new | Resumes on its own old grid; Mistakes/Hints use the session's solution | N/A |
| Replay a solved City | Old solved session | Fresh session from the new content Puzzle | N/A |
| Minimum not reachable | Adding Givens can't keep the grade exact | Attempt counts as failed; next attempt; `{ ok: false }` after `maxAttempts` | Existing Free Play failure path |

</frozen-after-approval>

## Code Map

- `src/engine/generator.ts` -- `attempt()` removes Givens to the minimum; `generate()` accepts on exact grade. Add `MIN_GIVENS: Record<Difficulty, number>` (exported) and a top-up step after an accepted attempt, using the same rng stream.
- `src/engine/index.ts` -- re-export `MIN_GIVENS`.
- `scripts/build-cities.ts` -- seeds = FNV-1a of the id; append-only; unchanged.
- `src/content/city-puzzles.json` + `tests/content/city-puzzles.snapshot.json` -- regenerate both (empty `[]`, run `npm run build:cities`, which appends to both).
- `src/content/city-puzzles.ts` -- "never rewritten" comment: note the TS-62 regeneration.
- `tests/engine/generator.test.ts` -- PINNED seeds must still succeed on attempt 1 (top-up runs after acceptance, so the pins should hold).
- `tests/content/city-puzzles.test.ts` -- per-City fairness test; add a Givens-count assertion.
- `tests/scripts/build-cities.test.ts:69` -- compares `buildEntry` to the committed file; passes once regenerated.
- `scripts/smoke/journey.ts:37` -- reads Givens/solution from content; no change.
- Docs: PRD §3 Difficulty (`planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md:37`) and FR-1 consequence (`:58`); `epics.md:23` (FR1) and `:76` (AD-4 regeneration note); `ARCHITECTURE-SPINE.md` AD-4 (one-off regeneration note); `sprint-6-manual-test-checklist.md` (add the one-minute Easy timing check), `backlog.md`, `board.html`, `sprint-6-summary.md` (TS-62 in Sprint 6, before TS-47; TS-47 depends on TS-62).

## Tasks & Acceptance

**Execution:**
- [x] `src/engine/generator.ts` -- add `MIN_GIVENS = { easy: 61, medium: 40, hard: 32 }`; after an attempt grades exactly, visit empty cells in shuffled order and restore the solution digit while the count < minimum, keeping each one only if `grade` still equals the target; accept only if the minimum is reached -- grade stays exact at higher Givens counts
- [x] `src/engine/index.ts` -- export `MIN_GIVENS`
- [x] `tests/engine/generator.test.ts` -- assert the Givens count equals `MIN_GIVENS[d]` (≥ minimum) for every pinned case; re-pin seeds only if one now fails on attempt 1
- [x] `src/content/city-puzzles.json`, `tests/content/city-puzzles.snapshot.json` -- regenerate all 30 via `npm run build:cities`
- [x] `tests/content/city-puzzles.test.ts` -- assert Givens count ≥ `MIN_GIVENS[p.difficulty]`
- [x] `src/content/city-puzzles.ts` -- comment: regenerated once for TS-62, before release
- [x] Docs listed in the Code Map -- state the minimums alongside the Technique rule; add TS-62 to the backlog, board and Sprint 6 summary

**Acceptance Criteria:**
- Given the regenerated content, when the City Puzzle tests run, then all 30 are unique, grade to their Tier and meet their minimum.
- Given a Free Play request at any Difficulty, when it generates in the worker, then it finishes well inside the existing Free Play timeout.
- Given `npm run smoke` in Chrome, when the 10 journeys run, then all pass.
- Given Jessica plays two or three Easy Cities during TS-47, when she times herself, then each takes about one minute (a manual check; recorded in the TS-47 checklist).

## Design Notes

Stopping removal at the minimum would make Medium and Hard Puzzles often grade easier (a 40-Given Puzzle rarely needs a naked pair). Topping up after an exact grade keeps the hard step needed. A prototype on seeds 1–30 reached 61 / 40 / 32 Givens on 30/30 seeds for every Difficulty, in about 10, 36 and 57 ms on average.

## Verification

**Commands:**
- `npm test` -- expected: all pass
- `npm run lint` -- expected: clean
- `npm run build` -- expected: success
- `npm run smoke` -- expected: 10/10 in Chrome

## Implementation Notes

- `topUp()` in `generator.ts` runs after an attempt grades exactly and is unique; it draws one extra `shuffle` from the same rng stream. All nine PINNED seeds still succeed on attempt 1 (no re-pin needed).
- City Puzzles regenerated with `npm run build:cities` from empty files: 12 Easy at 61, 9 Medium at 40, 9 Hard at 32 Givens; puzzles file and snapshot are byte-identical.
- Free Play timing (100 seeds each, Node): Easy avg 8 ms / max 32 ms; Medium avg 47 / max 273 ms; Hard avg 99 / max 362 ms; 0 failures. Note: there is no Free Play timeout in code yet (TS-51, after MVP), so the AC is judged against that headroom.
- Verified: `npm test` 1290/1290, `npm run lint` clean, `npm run build` ok, `npm run smoke` 10/10 in Chrome 155.
- The one-minute Easy check is added to `sprint-6-manual-test-checklist.md` under TS-47 (manual; not done).

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | edge-case, blind | Old-save test reuses `near.solution`, so session vs content solution is indistinguishable; title claims Mistakes | low | `oldPuzzle = { ...near, givens }`; 1 of 30 regenerated Cities did get a new solution, so the case is real | patch (group A) |
| 2 | edge-case | Synthetic `oldGivens` not checked for uniqueness | low | Clears first 20 Givens blindly | patch (group A) |
| 3 | blind | Synthetic fixture; real pre-TS-62 givens available | low | Same root as 1 | patch (group A) |
| 4 | blind | No Hint test on a changed-content save | low | Same root as 1 (fixture can't tell solutions apart) | patch (group A) |
| 5 | edge-case, verif-gap other, blind | "Exactly at minimum" test passes vacuously under `if (result.ok)` | low | generator.test.ts new `it` | patch (group B) |
| 6 | verification-gap | `generate` discarding a failed top-up is untested | medium | Medium seed 111: attempt 1 top-up fails, attempt 2 succeeds (scratch search) | patch (group C) |
| 7 | blind | `topUp` failure test silently depends on fixture < 40 Givens | low | fixture has 24 | patch (group C) |
| 8 | blind | `epic-1-context.md:22` still states the Technique-only rule | low | read the line | patch |
| 9 | blind | PRD `[ASSUMPTION]` tag now trails the decided minimums | low | prd.md:37 | patch |
| 10 | blind | Easy timing checklist item has no pass/fail threshold | low | checklist text | patch |
| 11 | edge-case | `topUp` with `solution[cell] === 0` miscounts | false | Only caller passes a full solution from `fillSolution` | reject |
| 12 | edge-case | `topUp` returns true when already above minimum | false | Intended; minimum is a floor | reject |
| 13 | edge-case, blind | AC "existing Free Play timeout" unfalsifiable; Tasks wording mixes = and ≥ | low | Fix is a spec edit | reject |
| 14 | blind | Timing measured only in Node; no browser timeout | low | Timeout already ticketed (TS-51); Hard max 362 ms | reject |
| 15 | blind | Easy does redundant remove-then-restore work | low | 8 ms avg; fix adds a branch | reject |
| 16 | blind | Medium/Hard have no time target; steep step | false | Jessica chose 40/32 on 13 Oct | reject |
| 17 | blind | Sprint 6 plan table mixes live status | false | Plan line 35 says "added 13 Oct"; live status is in Progress (line 54) | reject |
| 18 | blind | "Exported for tests only" unenforced | low | Cosmetic, no caller misuses it | reject |
| 19 | blind | Docs don't say all 30 solutions are unchanged | false | 29/30 unchanged, not 30; saves are safe because Sessions carry their own solution (AD-10) | reject |
