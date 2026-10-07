---
title: 'Rubric review: Traveller Sudoku architecture spine'
reviewed: ARCHITECTURE-SPINE.md (status: draft, 2026-10-05)
against: prds/prd-Jess-BMAD-project-2026-10-05/prd.md + addendum.md
calibration: hobby, solo, greenfield, static web game; spine is a build substrate for epics/stories
date: '2026-10-05'
---

# Rubric Review: Traveller Sudoku Architecture Spine

## Verdict

**Pass with minor revisions.** This is a strong, right-sized spine. The paradigm fits the problem well. The single Technique pipeline (AD-2) and structured `Step` (AD-3) deal directly with the PRD's main technical risk (Open Question 2). Every FR is bound and mapped, and the operational envelope is mostly covered. No finding is High at hobby stakes. Three Medium findings concern saved-data integrity and shape, which the spine itself treats as most important ("never discarded"). Each can be fixed with one or two sentences. The rest are Low clarifications that save a story-writer from guessing.

Severity scale (hobby-calibrated): **High** = units will be built incompatibly or the Album can be lost in normal use; **Medium** = a likely divergence or data-loss path that a rule should close; **Low** = a clarification or enforcement nicety.

## Summary Table

| # | Severity | Criterion | Finding |
| --- | --- | --- | --- |
| F1 | Medium | Divergence points / Rule prevents divergence | Stale tab or old app version can overwrite newer saved data; AD-7 has no "newer schema" or multi-tab rule |
| F2 | Medium | Divergence points | Released City Puzzles aren't declared immutable; regenerating breaks saved `city:<id>` sessions |
| F3 | Medium | Divergence points | Saved session shape (Notes encoding, Free Play givens/solution, `sessions['free']` vs `freePlay`) is not fixed |
| F4 | Low | Rule enforceable | Who detects completion: `puzzleSolved` dispatched by UI or derived by reducer is not stated (AD-6) |
| F5 | Low | Operational envelope | CI/build/deploy pipeline is silent (who runs the build-cities test, how it deploys, Vite `base` for GitHub Pages) |
| F6 | Low | Rule enforceable | AD-1 / AD-2 / AD-8 have no named enforcement mechanism; AD-2 wording blocks the generator's brute-force filler |
| F7 | Low | Tech currency | Several versions are not verifiable from this review; flag for the currency reviewer |
| F8 | Low | PRD coverage | Minor gaps: theme setting, input-mode persistence, Technique rank table, Hint fallback |

## Findings

### F1 (Medium): Stale tab or older app version can overwrite newer saved data

**Criterion:** fixes the real divergence points; the Rule prevents its stated divergence.

AD-7 says saved data is "never discarded", and AD-8 says a new version activates "on the next launch". Together they create a window where two app instances can write the same single document:

- **Version skew:** the player has two tabs open. A new version launches in one of them (or in a fresh window while an old tab stays open), migrates the document to `schemaVersion` N+1 and saves. The old tab, still running version N, then saves its in-memory state at version N. That overwrites the migrated document and any Postcard earned in the new tab. AD-7 only handles the case where data "can't be read". It says nothing about `stored schemaVersion > current`.
- **Same version, two tabs:** last write wins on a whole document. A Postcard awarded in tab B is lost when tab A (whose `album` is stale) saves its next keystroke.

For a solo player this is unlikely but plausible (a forgotten tab), and it defeats exactly what AD-7 says it prevents.

**Fix (one rule each):**
- If stored `schemaVersion` is greater than the app's, do not save. Show a calm "a newer version is open; reload" flag.
- Before each save, re-read and merge `album` as a union, or use a `BroadcastChannel`/`storage` signal so other tabs reload or go read-only. Either option is enough at hobby scale. Pick one so persistence and UI stories agree.

### F2 (Medium): Released City Puzzles are not declared immutable

**Criterion:** fixes the real divergence points.

AD-4 prevents "a City's Puzzle changing between versions". But the rule only says `scripts/` generates and commits the puzzles, and a test verifies them. Nothing stops a later re-run of `build-cities` (for example after a generator change) from producing different givens for an existing `cityId`. The saved session for `city:lisbon` stores digits and Notes against the *old* givens. After the update it would overlay the new grid: Givens could clash with player digits, and Mistake checks would run against the wrong solution. This is the content/save divergence the AD intends to stop, and the rule doesn't close it.

**Fix:** add to AD-4: "Once released, a City Puzzle entry is never changed. `build-cities` only adds missing `cityId`s (fixed seed per City), and a test compares existing entries with the committed file." Optionally store a short givens hash in each session and drop a session (not the Postcard) if the hash doesn't match.

### F3 (Medium): Saved session shape is not fixed

**Criterion:** fixes the real divergence points (game, persistence, UI, worker).

The conventions fix the grid format (81-char digit strings), but the session record that `game/`, `persistence/` and migrations all depend on is not defined:

- **Notes encoding** has no convention (per-cell 9-bit mask? an array of digit strings?). Saved data must store Notes (FR-17), so the reducer, persistence and the first migration all depend on this choice.
- **Free Play** needs its generated `givens`, `solution` and `difficulty` saved, because they aren't in `content/`. City sessions don't need these.
- **Ambiguity:** the Puzzle key convention includes `free`, which suggests `sessions['free']`, but `AppState` also has a top-level `freePlay`. Two stories could each choose a different one.
- **What's excluded:** AD-5 says Undo history is in session state but isn't saved. Persistence needs to know which field to strip, so name it.
- **Solved and replay state:** FR-16 needs a rule for whether a solved City session is kept, cleared, or replaced when the player replays.

**Fix:** add a short `Session` row to the conventions, for example `{ key, givens?, solution?, digits: string81, notes: number[81] (bitmask), solved: boolean, undo (not saved) }`. State that Free Play lives in `sessions['free']` and that `freePlay` holds only preferences, such as the last Difficulty (or the other way round).

### F4 (Low): Completion detection has no owner

**Criterion:** the Rule is enforceable.

AD-6 makes `puzzleSolved` the only action that can award a Postcard. But the Actions convention lists `puzzleSolved` as a past-tense event that UI code dispatches, so a component could dispatch it without checking the grid, or two places could each decide "solved". **Fix:** state that the reducer derives `solved` itself when a `digitEntered` completes the grid against the solution, and that `puzzleSolved` is internal (or is checked again inside the reducer). Also state that `cityChosen` is rejected for a City that isn't reachable, so AD-6's computed reachability is actually enforced.

### F5 (Low): CI/build/deploy pipeline is silent

**Criterion:** every dimension the altitude owns is decided, deferred or open (operational envelope).

Deployment and environments are decided: local plus one GitHub Pages production site, tagged `[ASSUMPTION]`, with no backend or telemetry. That's good. Missing:

- **CI/build:** the deployment diagram shows "vite build + build-cities test", but the spine doesn't say what runs it or when. Is it a GitHub Actions workflow on push to `main` that runs `vitest` (including the City Puzzle verification) and then deploys Pages? Or a manual `npm run deploy`? Choose one, or explicitly defer it ("manual deploy until it hurts").
- **GitHub Pages specifics:** a project page is served from `/<repo>/`, so Vite `base`, the manifest `start_url`/`scope` and the service-worker scope must all agree. This is a small cross-unit agreement worth one line.
- **Operations:** "no telemetry" is a decision. It would help to add one line on how errors surface to the developer (for example, only the state flags plus the browser console), so nobody adds an error reporter later.

### F6 (Low): Enforcement mechanisms are not named; AD-2 wording is too strict

**Criterion:** every AD's Rule is enforceable.

- **AD-1** (import direction, no `window`/`Date`/`Math.random` in the core) relies on code review alone. Name a mechanism: ESLint `no-restricted-imports` / `import/no-restricted-paths` per directory, plus `no-restricted-globals` for `Math.random`, `Date` and `window` in `src/engine` and `src/game`.
- **AD-2** "No other code may implement solving logic" literally forbids what the generator needs: a randomized backtracking filler to build a full solution grid, and possibly a solution counter. State that the engine owns one brute-force `fillGrid`/`countSolutions` for generation only, and that it never takes part in grading or Hints. (Logical solvability with sound Techniques already implies uniqueness, so the build test can rely on the pipeline.)
- **AD-8** "activated on the next launch" maps to a specific config. Name it: `registerType: 'prompt'` with no auto `skipWaiting`/`clientsClaim`, and no reload on update. Otherwise the plugin's `autoUpdate` default behaviour (reload) breaks the rule.

### F7 (Low): Tech versions to verify (flag only)

**Criterion:** named tech is verified-current. A separate reviewer checks this in depth.

The overall choices (Vite + React + TS static PWA, `vite-plugin-pwa` generateSW, `idb-keyval`, Vitest, Node 24 LTS) are sensible and mainstream. I couldn't confirm these specific pins from this review. Please verify them:

- `vite-plugin-pwa` **2.0**: check that it exists and that its peer range supports Vite 8.
- `idb-keyval` **6.3**: the long-standing line is 6.2.x.
- Vitest **5.0**: check it is released and compatible with Vite 8.
- `create-vite` **9.2**, React **19.3**, `@vitejs/plugin-react` **6.1**, Vite **8.3**, TypeScript **6.0**: plausible for Oct 2026, but unconfirmed.
- Node **24 LTS** is correct. Note that Node 26 is due to enter LTS around late Oct 2026; 24 stays supported, so no action is needed.

### F8 (Low): Minor PRD coverage gaps

**Criterion:** covers the PRD's capabilities.

All FR-1 to FR-24 are bound and mapped, and the PRD's Open Question 2 (Hint feasibility) is answered by AD-2/AD-3. Small gaps that touch the persisted schema or the shared engine:

- **Theme (FR-20, §7 light and dark):** does it follow the system preference or use an in-app toggle stored in `settings`? This changes the schema, so decide it or defer it explicitly.
- **Input mode (FR-2/FR-3):** is cell-first/number-first, digit/Notes mode and the selected digit in `AppState.settings` (persisted) or local UI state? Two UI stories could split on this.
- **Technique rank table (AD-2):** grading uses "highest rank", but the ranks aren't stated. Add: singles = Easy, naked pair = Medium, pointing/claiming = Hard. Keep it in one place in the engine.
- **Hint fallback (AD-9):** say what a Hint returns if the pipeline finds no `Step` on a Mistake-free grid. This should be impossible for valid puzzles, but the engine should return a defined result, not throw (Errors convention).

## Criterion-by-Criterion Notes

- **Real divergence points fixed:** mostly yes. Paradigm/layers, the solving pipeline, the Step/text split, puzzle provenance, the state-mutation path, Album ownership, the persistence format, the SW/storage boundary and the Mistake definition are all fixed. Missed: session shape (F3), content immutability (F2), concurrent writers (F1), completion ownership (F4). Worker message protocol is minor: there is one worker with one request type, so it's fine to leave it to the story.
- **Rules enforceable and preventive:** AD-3, AD-5, AD-6 and AD-9 are clear and testable. AD-1, AD-2 and AD-8 need a named mechanism or wording fix (F6). AD-4 and AD-7 don't fully prevent their stated divergence (F2, F1).
- **Deferred items are safe:** yes. Styling, routing, E2E tests, generator tuning and out-of-scope features cannot make two units diverge. (Theme and input-mode persistence are *missing*, not deferred; see F8.)
- **Tech currency:** flagged (F7).
- **PRD coverage:** complete binding and a good capability map; small gaps in F8.
- **Dimensions owned:** paradigm, structure, data, state, persistence, offline/update, conventions, stack, deployment and environments are covered. CI/build is silent, and operations are covered only implicitly (F5). There is no Open Questions section; `[ASSUMPTION]` tags carry the uncertainty, which is acceptable at this scale.

## What's Good (keep it)

- AD-2 + AD-3 + AD-9 together make Hints, grading and generation consistent by construction. That's the right answer to the PRD's main risk.
- Computing reachability instead of storing it (AD-6) avoids a whole class of sync bugs.
- Pre-built City Puzzles with a build-time verification test (AD-4) make FR-1 and FR-18 checkable.
- The spine is the right size for a hobby project: nine ADs, no speculative infrastructure, and clear Deferred reasons.
