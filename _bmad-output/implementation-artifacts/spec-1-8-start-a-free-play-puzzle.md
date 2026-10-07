---
title: 'Story 1.8: Start a Free Play Puzzle'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '4e4abc9d146f0388e9bd0a79dbe56fefbd927650'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app always loads the same built-in sample Puzzle, so the player can't choose a Difficulty or get a fresh Puzzle once it is solved.

**Approach:** Add a seeded `engine/generator` that accepts only unique Puzzles graded to the target, run it in a Web Worker in `src/workers/`, and add a Free Play entry screen (Difficulty picker, start / "Carry on" / "Start a new one" with inline confirm, "Finding a fair Puzzle…", calm error line) reached from nav "Puzzle · Free Play · Settings". The app now starts on that entry with `sessions` empty, and the sample Puzzle stays only as a test fixture.

## Boundaries & Constraints

**Always:** `generate` is pure and deterministic per `(seed, difficulty)`. It uses an engine-local seeded PRNG and never `Math.random` or `Date`. It accepts a Puzzle only if `countSolutions(givens, 2) === 1` and `grade(givens) === difficulty`, and returns a result (never throws). The seed and request id come from the UI shell. The reducer applies only the reply whose id matches `ui.freePlay.requestId`. Generation never runs on the main thread. Starting a Puzzle never records Undo, and it empties the history. Free Play solve leaves `album` untouched. Copy goes in `copy.ts`, styles use tokens only, and every key goes through `src/ui/keyboard*`.

**Never:** City Puzzles, `scripts/build-cities`, Album (Epic 3); saving or launch resume (Epic 4); a modal, alert, toast or spinner animation; generating in tests over more than three seeds per Difficulty; `brute` imported outside `src/engine/generator*`; `ui` importing `engine` directly.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First load | no session | Free Play entry, picker on Easy, one start button; `sessions` = `{}` | N/A |
| Start | picker Medium, start | `ui.freePlay` = generating with the new id; "Finding a fair Puzzle…"; picker disabled; nav usable | N/A |
| Reply latest | `freePlayGenerated` with the current id | fresh `sessions.free`, `undo` [], `settings.freePlayDifficulty` 'medium', Puzzle screen, focus on grid | N/A |
| Reply stale | id ≠ latest, or not generating | state returned unchanged (same reference) | ignored |
| Failure | `freePlayFailed` with the latest id, or worker `error` | inline line on entry, picker enabled, `sessions.free` unchanged | no alert |
| In progress | `sessions.free` inProgress, open entry | "Carry on" (primary) + "Start a new one"; Carry on → Puzzle exactly as left | N/A |
| Replace | "Start a new one" | inline "This replaces your current Free Play Puzzle." + "Start a new one" / "Keep going"; focus on "Keep going" | Keep going or Esc: closes, focus back on "Start a new one", session untouched |
| Solved | last correct digit | side column "Solved. Another one?" with a link to the entry; `album` same reference | N/A |

**Decisions (human, 2026-10-07):** Before any Puzzle exists, the "Puzzle" nav item is shown but disabled (`aria-disabled`, `ink-muted`, still focusable), so the nav keeps its shape. The entry has heading "Free Play" and start button "Start a Puzzle". A failed generation shows "Couldn't find a fair Puzzle this time. Try again when you like." If the new Puzzle arrives while the entry is still showing, it opens with focus on the grid; if the player has moved to another screen, they stay put and the new Puzzle waits under "Puzzle" (no unexpected context change).

</frozen-after-approval>

## Code Map

- `src/game/session.ts` -- `createInitialState(puzzle)` seeds `sessions.free`. Make the puzzle optional, so it's absent in the app and present in tests.
- `src/game/reducer.ts` -- `reducer` sends unknown actions through `record`, which would snapshot the old session into Undo. Handle the new actions before `default`.
- `src/game/types.ts` -- after 1.6: `Settings` holds four booleans and `UiState.screen` is `'puzzle' | 'settings'`. After 1.7: `Difficulty` is re-exported from engine.
- `src/ui/app.tsx`, `app-nav.tsx`, `puzzle-title.tsx` (1.6/1.7) -- `App` owns the reducer. The nav has two buttons. The title is always "Free Play · Easy".
- `src/ui/puzzle-screen.tsx` -- assumes a session exists; shows `copy.solvedSample`.
- `src/ui/mode-indicator.tsx` -- the `Segmented` control to reuse for the picker. Export it.
- `src/ui/keyboard.ts` -- `keyToAction`/`useKeyboard`, the only place allowed to handle keys (`checkKeyHandlers`).
- `tests/architecture/check-architecture.ts` -- `workers` → `engine` only. Purity rules cover `engine`/`game` only, so the worker may use `self`.
- `src/engine/index.ts`, `brute.ts` (as built in 1.7) -- `solve`, `grade` and `countSolutions` take a `Grid` (number array), not a string: wrap with `parseGrid` and convert back with `formatGrid`. `src/ui/puzzle-title.tsx` already reads `session.difficulty`.
- `vite.config.ts`, `tests/build-output.test.ts` -- no worker config. CSP `default-src 'self'` allows a same-origin module worker file.

## Tasks & Acceptance

**Execution:**
- [x] `src/engine/random.ts` -- `createRng(seed: number): () => number` (mulberry32, uint32 seed) and `shuffle(rng, array)`.
- [x] `src/engine/generator.ts` -- `generate(seed, difficulty, maxAttempts = 40): GenerateResult` = `{ ok: true; puzzle: { givens, solution, difficulty } } | { ok: false }`. Export from `engine/index.ts` (not `brute`).
- [x] `tests/engine/random.test.ts`, `tests/engine/generator.test.ts` -- PRNG repeatability. For three pinned seeds per Difficulty: unique, graded to target, Givens ⊂ solution, solution valid, and the same Puzzle on a second run. Each test gets a 20s timeout and the suite runs in under ~10s. Pin seeds that succeed in few attempts. Also test that `maxAttempts: 0` returns `{ ok: false }`.
- [x] `src/workers/generator-protocol.ts` -- `GenerateRequest { requestId, seed, difficulty }`, `GenerateReply = { requestId, ok: true, puzzle } | { requestId, ok: false }`, and pure `handleGenerateRequest(req): GenerateReply` (wraps `generate`, catches throws into `ok: false`).
- [x] `src/workers/generator-worker.ts` -- `self.addEventListener('message', …)` → `postMessage(handleGenerateRequest(data))`. It does nothing else.
- [x] `src/game/types.ts`, `session.ts`, `reducer.ts`:
  - Types: `Settings.freePlayDifficulty: Difficulty | null` (default null), `UiState.screen` gains `'freePlay'`, and `UiState.freePlay = { picked: Difficulty; requestId: number; status: 'idle' | 'generating' | 'failed'; confirmingReplace: boolean }`.
  - Actions: `freePlayDifficultyPicked`, `freePlayRequested { requestId, difficulty }`, `freePlayReplaceRequested` / `freePlayReplaceCancelled`, `freePlayGenerated { requestId, puzzle }`, `freePlayFailed { requestId }`. All are handled outside `record`.
  - `createInitialState()` without a Puzzle: `sessions` {}, screen `'freePlay'`.
  - On generated: create the session, clear `undo`/`restartConfirming`/`selectedCell`/`currentDigit`, set `lastPlayedKey` 'free', remember the Difficulty, and switch to the Puzzle screen only from the entry (OQ4).
- [x] `tests/game/free-play.test.ts` -- every matrix row at reducer level. Cover stale id, reply while idle, two requests in a row (older reply ignored, latest applied), frozen state, and no Undo entry.
- [x] `src/ui/keyboard.ts` -- `useEscape(ref, onEscape)` for the entry's confirm. Keep digits, N and M off the entry.
- [x] `src/ui/use-generator.ts` -- the hook creates `new Worker(new URL('../workers/generator-worker.ts', import.meta.url), { type: 'module' })` lazily, takes a worker factory for tests, and returns `start(difficulty)`. `start` takes the next id from a ref counter and a seed from `crypto.getRandomValues(new Uint32Array(1))`, dispatches `freePlayRequested`, then posts. The hook maps `message` to generated/failed and `error` to `freePlayFailed` with the latest id, and terminates the worker on unmount.
- [x] `src/ui/free-play-screen.tsx` -- `<h1 tabIndex={-1}>` heading, the picker (exported `Segmented`, each segment ≥24×24px, disabled and `ink-muted` while generating), the states from the matrix, the status line `ink-muted` italic, and the error line.
- [x] `src/ui/app.tsx`, `app-nav.tsx`, `puzzle-title.tsx`, `puzzle-screen.tsx`, `puzzle.css` -- nav "Puzzle · Free Play · Settings" (OQ1). Render the entry when `screen === 'freePlay'` (focus its heading) and the Puzzle only when a session exists. The title uses `session.difficulty`, and the Puzzle screen only. The solved line becomes `copy.solvedFreePlay` plus a link-styled button to the entry.
- [x] `src/content/copy.ts` -- nav label, heading, start, "Carry on", "Start a new one", the replace line, "Keep going" (reuse), "Finding a fair Puzzle…", "Solved. Another one?", error line, Difficulty labels, picker `aria-label`. Remove `solvedSample`.
- [x] `src/content/sample-puzzle.ts`, existing tests -- update the doc comment ("test fixture only"). Tests keep `createInitialState(samplePuzzle)`, and the sample stays unimported by `src/ui`.
- [x] `tests/ui/free-play.test.ts`, `tests/ui/nav.test.ts` (jsdom, fake worker) -- start posts `{ requestId, seed, difficulty }`, generating view, Esc cancels the confirm, focus moves, "Carry on" keeps digits/Notes/Undo, solved line and link. Also check that no `src/ui` file imports `sample-puzzle`, and that the header title follows the session's Difficulty for a Medium and a Hard Puzzle (deferred from 1.7's review).
- [x] `tests/build-output.test.ts` -- assert that the build emits a separate worker chunk under `assets/` and nothing inlined.

**Acceptance Criteria:**
- Given the app starts, then no `src/ui` import reaches `content/sample-puzzle`, `sessions` is `{}`, and the entry shows the picker on Easy and one start button.
- Given `settings.freePlayDifficulty` is 'hard', when the entry opens, then Hard is the pressed segment.
- Given `generate(s, d)` for each pinned seed, then `countSolutions === 1`, `grade === d`, and a second call deep-equals the first.
- Given the architecture tests, then the generator, protocol and worker pass, and only `src/engine/generator*` imports `brute`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | blind, edge | A crashed worker is reused, so the entry is stuck on "Finding a fair Puzzle…"; there is no `messageerror` listener | medium | patch | The `error` handler dispatches a failure but keeps `workerRef`. |
| 2 | VG, blind | The real worker entry is never run by a test | medium | patch | Only `handleGenerateRequest` and a fake worker are tested; a wrong reply shape would still pass. |
| 3 | blind, edge | The failure line survives re-entry and a new pick | low | patch | `chooseScreen` resets `picked`, not `status`. |
| 4 | VG | The picker keeping its Difficulty during generation is untested | low | patch | Removing the `status !== 'generating'` guard passes every test. |
| 5 | blind | The worker-chunk build test matches `postMessage`, which React also uses | low | patch | It doesn't prove the generator is off the main bundle. |
| 6 | blind | "Pinned seeds succeed first attempt" is unenforced | low | patch | Asserting `maxAttempts: 1` is cheap. |
| 7 | VG, edge | A replacement arriving while the player is back on the old Puzzle swaps it mid-play | low | reject | The player confirmed the replace; a real browser generates in 30–106 ms, so the window is tiny; the fix (blocking nav or announcing) adds branches. |
| 8 | blind | No notice when a Puzzle becomes ready on another screen | low | reject | Same ~100 ms window; the "Puzzle" nav enabling itself is the cue, per the stay-put decision. |
| 9 | blind, edge | No generation timeout or cancel | low | reject | Bounded by `maxAttempts`; measured at ≤1.4 s; worker crashes are handled by #1. |
| 10 | blind | The reducer accepts requests the UI never sends (double, unconfirmed replace, non-increasing id) | low | reject | The UI guards these; stale replies are already rejected. |
| 11 | blind, edge | Reply Difficulty not checked; `isPuzzle` is thin; null message data; `crypto` missing | low | reject | The worker is our own code, and the protocol is tested; all four are unreachable in practice. |
| 12 | blind | The solved link reads "Free Play", the same name as the nav item | low | reject | It names its destination; the copy can be revisited with the City copy pass. |
| 13 | blind | `useEscape` re-subscribes on every render | low | reject | Negligible cost; behaviour is correct. |
| 14 | blind | The picker uses native `disabled` while the nav uses `aria-disabled` | low | reject | The spec asks for a disabled picker; the generating status line names the work. |
| 15 | blind | `generate` repeats its final uniqueness and grade checks | low | reject | Measured 30–106 ms; not worth the complexity. |
| 16 | blind | `self` is typed as `Window` in the worker | low | reject | It type-checks and runs (smoke test passed). |
| 17 | edge | A test imports `brute` directly | false | reject | The import rule covers `src/` only. |
| 18 | blind | Spec status, task boxes and notes are stale | — | reject | The workflow manages status; ticked at verification. |

Real-browser smoke test (Chrome 155, Edge 154; 1280px; `npm run preview`): all steps pass, with 0 console, CSP or network errors. The worker loads from `assets/` as `text/javascript`. Generation took Hard 55–98 ms, Medium 64–106 ms and Easy 29–34 ms. The nav stays usable during generation; Carry on, Replace and Esc work; Lamplight works; Space in number-first places once.

## Design Notes

- **Generator:** one rng stream per seed, so attempts are deterministic.
  - Fill a solution by randomized backtracking.
  - Visit the 81 cells in shuffled order. Keep a removal only if `countSolutions(g, 2) === 1` and `grade(g)` is not `'notGradeable'` and ranks ≤ target. Run brute first, since it rejects faster.
  - Accept if the final grade === target; otherwise run the next attempt.
  - No symmetry: it lowers the Hard hit rate.
- **Request ids:** the shell owns the counter, so the reducer stays pure and can test stale replies directly. `freePlayRequested` stores the id, and the reply must match it while `status === 'generating'`.
- **Picker vs settings:** the picker's choice is `ui.freePlay.picked`, seeded from `settings.freePlayDifficulty ?? 'easy'` when the entry opens. `settings` changes only on a successful reply.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0, and the generator tests stay within their time limits.

**Manual checks (if no CLI):**
- `npm run preview`: start Hard. While "Finding a fair Puzzle…" shows, nav still works. The Puzzle opens titled "Free Play · Hard". The worker file loads from `/Jess-BMAD-project/assets/` with no CSP errors in the console.
