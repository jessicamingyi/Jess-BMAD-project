---
title: 'Story 3.1: City catalogue and pre-built City Puzzles'
type: 'feature'
created: '2026-10-07'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There are no Cities and no City Puzzles. The journey (3.2–3.5) needs a fixed catalogue and one fair Puzzle per City that never changes. The live site must not ship until the Postcard lines are real.

**Approach:** Add `src/content/cities.json` (the approved 30 from `planning-artifacts/cities.md`) and `src/content/city-puzzles.json`. The second is generated once by `scripts/build-cities`, which only appends. Tests verify every entry and check it against a committed snapshot. The Tier → Difficulty map lives only in `game/journey`. A CI gate stops deploys while any City is a placeholder.

## Boundaries & Constraints

**Always:** Names, countries, Regions, Tiers, slot ids and catalogue order are exactly as in `cities.md`. Lisbon keeps `id: lisbon` and its epic line. **Placeholder reconciliation (TS-24 → TS-40):** names are now real; only the lines are pending. So `placeholder: true` means "Postcard line not written yet". All 29 non-Lisbon Cities carry it with a line starting "PLACEHOLDER". A test enforces *placeholder ⇔ line starts "PLACEHOLDER"*, so the flag can't be dropped while the text stays. `placeholder` is either `true` or absent. Digit strings are 81 chars, row-major, 0 = empty. Generation is deterministic: the same id gives the same Puzzle. Released entries are never rewritten. `scripts/` imports only `engine`, `content` and `game/journey`. `brute` is imported only by `src/engine/generator*`, `scripts/` and `tests/`.

**Never:** Runtime generation of City Puzzles. Album, reachability, `cityChosen`, Stamp/Postmark UI or `award` (Stories 3.2–3.3). A second Tier → Difficulty map anywhere. A gate that fails lint/test/build, pull requests, or `npm run dev`/`build` while placeholders exist.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Fresh build | `city-puzzles.json` = `[]` | 30 entries appended in catalogue order. Each `difficulty` = `TIER_DIFFICULTY[tier]`; seed from the id | A City that can't be generated → exit 1 naming the id; file untouched |
| Partial | 1 id missing | only that entry is generated, appended last; existing entries byte-identical; snapshot extended | N/A |
| Nothing missing | all 30 present | no write; both files byte-for-byte unchanged | N/A |
| Determinism | regenerate `europe-near-1` from nothing | equals the committed entry | N/A |
| Bad entry | edited Givens / 2 solutions / wrong grade / Tier mismatch / unknown or duplicate `cityId` | `npm test` fails, naming the City id | N/A |
| Released change | snapshot entry altered or removed in `city-puzzles.json` | snapshot test fails naming the id | entry missing from snapshot → fails with "run `npm run build:cities`" |
| Gate, placeholders | `main`, `PAGES_ENABLED == 'true'`, 29 placeholders | `deploy` job fails before `deploy-pages`: "Deploy blocked: 29 placeholder Cities: europe-near-1, …" | build job (lint/test/build) stays green |
| Gate, PR / Pages off | pull request, or variable unset | gate step does not run | N/A |

**Decisions (human, 2026-10-07):** Each City gets its own single-colour Unicode Stamp glyph. Lisbon is ⛵, as in the mockup; the builder picks the other 29, one per City, with no repeats. Glyphs are checked in a real browser in Story 3.2 and can change later without changing ids. The spec is kept whole (about 2,400 tokens).

</frozen-after-approval>


## Code Map

- `planning-artifacts/cities.md` -- approved list and order (source of truth for the JSON).
- `src/engine/generator.ts` -- `generate(seed, difficulty, maxAttempts = 40)` → `{ ok, puzzle }`; pure.
- `src/engine/brute.ts` -- `countSolutions(grid, limit)`; `index.ts` deliberately doesn't export it.
- `src/engine/index.ts` -- `parseGrid`, `formatGrid`, `grade`, `UNITS`, `Difficulty`.
- `src/content/sample-puzzle.ts` + `tests/content/sample-puzzle.test.ts` -- verification pattern to follow.
- `tests/architecture/check-architecture.ts` -- already allows `scripts → game/journey` (`isGameJourney`) and lints `scripts/`; brute guard covers `src/` only. No change needed.
- `.github/workflows/ci-deploy.yml` -- `deploy` job: no checkout; job-level `permissions` override workflow `contents: read`.
- `tsconfig.node.json` -- includes `tests` only; `tsconfig.app.json` -- `src`, bundler resolution.

## Tasks & Acceptance

**Execution:**
- [ ] `src/content/cities.json` -- 30 objects `{ id, name, country, region, tier, glyph, line, placeholder? }` in `cities.md` order. Placeholder line: "PLACEHOLDER: Postcard line for {name} (TS-40)." Glyphs per OQ1.
- [ ] `src/content/cities.ts` -- types `Region`, `Tier`, `City`; `CITIES` (typed JSON import, `with { type: 'json' }`); `cityById(id)`. No imports outside `content`.
- [ ] `src/content/city-puzzles.json` + `src/content/city-puzzles.ts` -- `CityPuzzle = { cityId, givens, solution, difficulty: 'easy'|'medium'|'hard' }`; `CITY_PUZZLES`; `cityPuzzle(id)` (synchronous lookup for 3.2's `cityChosen`).
- [ ] `src/game/journey.ts` -- `TIER_DIFFICULTY: Readonly<Record<Tier, Difficulty>>` and `difficultyForTier`. Only imports with `.ts` extensions (Node runs it from `scripts/`). 3.2–3.3 add reachability/award here.
- [ ] `scripts/build-cities.ts` -- pure `seedFor(id)` (FNV-1a 32-bit of the id) and `missingEntries(cities, existing)`. Generate with `generate(seedFor(id), d, 200)`. On failure, retry the seeds of `${id}#1`…`#4`; then throw, naming the id. Pure `formatPuzzles(entries)` = `JSON.stringify(entries, null, 2) + '\n'`. CLI: read files, append the missing entries to `city-puzzles.json` **and** `tests/content/city-puzzles.snapshot.json`. Write nothing when nothing is missing. Optional path arguments let tests run on temp copies. Then run it and commit the output.
- [ ] `scripts/check-placeholders.ts` -- pure `placeholderIds(cities)`. CLI exits 1 with "Deploy blocked: N placeholder Cities: id, id, …" or exits 0 with "No placeholder Cities." Node built-ins only (no `npm ci` needed).
- [ ] `package.json` -- `"build:cities": "node scripts/build-cities.ts"`, `"check:placeholders": "node scripts/check-placeholders.ts"`.
- [ ] `tsconfig.node.json` (+ `tsconfig.app.json` if needed) -- include `scripts`; `resolveJsonModule: true` if `tsc -b` requires it.
- [ ] `.github/workflows/ci-deploy.yml` -- in `deploy`, add `contents: read` to `permissions`. Before `deploy-pages`, add steps: `actions/checkout@v4`, `actions/setup-node@v4` (`.nvmrc`), `npm run check:placeholders`. Update the opt-in comment. `build` is unchanged.
- [ ] `README.md` -- one line: deploy is blocked while any City is a placeholder (`npm run check:placeholders`).
- [ ] Tests: `tests/content/cities.test.ts` (30; 10/Region; 4/3/3; allowed codes; kebab-case unique ids; id order = `cities.md`; non-empty fields; Lisbon exact; placeholder ⇔ "PLACEHOLDER" prefix; 29 placeholders). `tests/content/city-puzzles.test.ts` (`it.each` by `cityId`: format, `countSolutions === 1`, Givens ⊂ solution, solution a valid full grid, `grade === difficulty === TIER_DIFFICULTY[tier]`; one entry per City; no unknown ids; snapshot ⇔ file). `tests/scripts/build-cities.test.ts` (matrix rows Partial / Nothing missing / Determinism on temp copies). `tests/scripts/check-placeholders.test.ts` (ids listed, exit codes). `tests/game/journey.test.ts` (map values; scan `src/` and `scripts/` for a `near…easy` map literal and find only `journey.ts`).

**Acceptance Criteria:**
- Given the real tree, when `npm test` runs, then the architecture, brute-guard and build-output tests pass unchanged (no generator code in the main chunk).
- Given placeholders exist, when `npm run lint && npm test && npm run build` runs locally or in the CI `build` job, then it exits 0.
- Given `npm run check:placeholders` with the committed catalogue, then it exits 1 and lists the 29 non-Lisbon ids.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- **Gate placement:** the AC asks for the *deploy* job to fail, so the check runs inside `deploy`. That keeps `build` green on every push. `gh variable list` shows no `PAGES_ENABLED`, so today `deploy` never runs and the gate is dormant. Once Pages is enabled, every `main` run turns red at `deploy` until TS-40 lands. That is the intended block.
- **Snapshot:** a committed full copy (`tests/content/city-puzzles.snapshot.json`), not Vitest `toMatchSnapshot`. Vitest won't write new snapshots in CI, and a full copy keeps diffs reviewable. "New entries extend the snapshot" means `build-cities` appends to both files. A hand-added entry missing from the snapshot fails the test.
- **"Solution equals `solution`":** `countSolutions` doesn't return the grid. Uniqueness, Givens ⊂ solution and a valid full grid together prove that `solution` is the one solution. `brute` stays unchanged.
- **"Opened in under 1 s":** 3.1 ships `cityPuzzle(id)` (a synchronous JSON lookup). 3.2 wires it into `cityChosen`.

## Verification

**Commands:**
- `npm run build:cities` (second run) then `git status --porcelain src/content tests/content` -- expected: no changes.
- `npm run lint && npm test && npm run build` -- expected: exit 0.
- `npm run check:placeholders` -- expected: exit 1 listing 29 ids.
