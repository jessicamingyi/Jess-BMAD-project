---
title: 'Story 3.5: Pick up where you left off'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_revision: '0e69d234dd0baa3ede825eae68638f045c099600'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The app always starts on the Album with no current Puzzle, even when a Puzzle is in progress, and nothing tells the player an unfinished Puzzle will wait. Story 3.5 (epics.md) asks that the game reopen on the last-played Puzzle with no clicks.

**Approach:** Add a pure launch rule `launch(state): AppState` in `game/`, run it in the app's `useReducer` initializer before `showPendingPostcard` (so an unrevealed Postcard still wins). Place focus on mount (grid or Album heading), and show "No rush - your Puzzle will wait." under the Album heading while any Puzzle is `inProgress`.

## Boundaries & Constraints

**Always:** Every Story 3.5 AC in epics.md holds. `launch` is pure (AD-1: no `Date`, `window`, `document`) and reads only `AppState` + the catalogue. It never changes `album`, `sessions` or `meta`. Keys accepted for a Puzzle are `free` or a `city:<id>` whose id is in the catalogue (`cityOfKey`). Catalogue order = `CITIES` order. Copy lives in `copy.ts`; styles use tokens only (with `-lamplight` twins where colour is set). The reveal from 3.3 keeps precedence and keeps its own focus ("Add to Album").

**Never:** Persistence or reload survival (Epic 4, Story 4.1). Seeding a sample Puzzle at startup. Changing which actions set `meta.lastPlayedKey` (already correct via `putSession`; see Design Notes). A `noteToggled` action (Notes go through `digitEntered` in Notes mode). New Session fields.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Last played in progress | `sessions[lastPlayedKey]` `inProgress`, key valid | `screen 'puzzle'`, `activeKey = lastPlayedKey`; digits/Notes as stored | No error expected |
| Last played unusable | `lastPlayedKey` solved, missing, null, or unknown City id; another Session `inProgress` | `puzzle` on the first `inProgress` City Session in `CITIES` order, else `free` if `inProgress` | No error expected |
| Nothing in progress | no `inProgress` Session | `screen 'album'`, `albumRegion = openingRegion(album)`; `activeKey` = `lastPlayedKey` if its Session exists and the key is valid, else `null` | No error expected |
| Unrevealed Postcard | any of the above + a pending Postcard | `showPendingPostcard` afterwards shows the reveal | No error expected |
| Unknown keys in `sessions` | `city:nope` `inProgress` | ignored by the City scan | No error expected |

</intent-contract>

## Code Map

- `src/game/session.ts:48-73` -- `createInitialState()`: `screen 'album'`, `activeKey null`, `albumRegion 'europe'`, `albumSeen 0`. `activeSession` (6-11), `FREE_PLAY_KEY = 'free'` (3).
- `src/game/reducer.ts:19-25` -- `putSession` sets `lastPlayedKey` for every grid-changing step (`applyDigit` incl. Notes, `clearCell` for `cellCleared`, `settle` for `hintApplied`, `undo`, `restart`). `freePlayGenerated` foreground sets it at 601 (Story 1.8, keep). `showPendingPostcard` (215-238) runs after every step and at start. `chooseScreen` (522) refuses `'puzzle'` with no active Session.
- `src/game/journey.ts` -- `cityOfKey` (40), `cityKey` (35), `openingRegion` (88-94).
- `src/content/cities.ts` -- `CITIES` (catalogue order), `cityById`.
- `src/ui/app.tsx:26,35-36` -- `emptyState`; `useReducer(withAnnouncement, initialState, (s) => showPendingPostcard(s ?? emptyState()))`. Focus effect (63-72) only fires on a screen change (`focusedScreen` ref starts at the initial screen, 45), so nothing is focused on mount; it targets `[role="grid"] [tabindex="0"]` or `headingRef`, skipped while `revealing`. Nav `puzzleAvailable={active !== null}` (125).
- `src/ui/album-screen.tsx:89-92` -- `h1.album-heading` then `.album-tabs`; the line goes between them. Receives full `state`.
- `src/ui/album.css`; `src/ui/puzzle.css:532-542` `.free-play-status` -- the meta / italic / `ink-muted` pattern to mirror.
- `src/content/copy.ts:58-59` -- `albumHeadingEmpty`, `albumHeading` neighbours.
- `tests/architecture/check-architecture.ts` -- `game` may import `engine` and `content` only; pure-layer bans.
- Existing coverage: `tests/game/reducer.test.ts`, `city-session.test.ts`, `free-play.test.ts`, `hint.test.ts`, `replay.test.ts` (lastPlayedKey); `tests/ui/nav.test.ts`; `tests/shell.test.ts` (app start); `tests/ui/album.test.ts`.

## Tasks & Acceptance

**Execution:**
- `src/game/launch.ts` (new) -- export `launch(state: AppState): AppState` per the matrix; doc comment states the rule order and that the reveal is applied afterwards by `showPendingPostcard`. Changes only `ui.screen`, `ui.activeKey`, `ui.albumRegion` and `ui.albumSeen`.
- `src/ui/app.tsx` -- initializer becomes `showPendingPostcard(launch(s ?? emptyState()))`; on mount (once, not while revealing) focus the grid's tab stop on `puzzle` or the heading on `album`, via the existing focus targets.
- `src/content/copy.ts` -- `albumNoRush: 'No rush - your Puzzle will wait.'`.
- `src/ui/album-screen.tsx`, `src/ui/album.css` -- render `<p className="album-no-rush">` under the heading when any Session in `state.sessions` is `inProgress`; meta size, `--type-meta-status-style`, `ink-muted` colour token.
- `tests/game/launch.test.ts` (new) -- every matrix row; purity (input state not mutated; `album`, `sessions`, `meta` same references); a City earlier in `CITIES` beats a later one regardless of object key order; Free Play only when no City is in progress.
- `tests/game/last-played.test.ts` (new) -- table test: `digitEntered` (digit and Notes mode), `cellCleared`, `hintApplied`, `undoRequested`, `restartConfirmed` set `lastPlayedKey`; `cityChosen` (fresh and "Carry on"), `freePlayResumed`, `cellClicked` selection, entry/input mode switches and `screenChosen` leave it unchanged.
- `tests/ui/launch.test.ts` (new) -- render `App` with fixture states: in-progress → Puzzle screen with focus on the grid tab stop and stored digits shown; none in progress → Album on `openingRegion` with focus on the heading; pending Postcard → reveal with focus on "Add to Album"; "Puzzle" nav enabled/disabled per `activeKey`; "No rush" shown iff a Session is `inProgress` (Free Play counts).
- `tests/ui/contrast.test.ts` -- add `ink-muted` on paper only if not already listed (both themes).

**Acceptance Criteria:**
- Given `npm test`, then existing suites pass with only setup changes (e.g. a test that relied on launching to the Album with an in-progress Session) and the suite stays about 15s.
- Given a launch state with `lastPlayedKey` in progress and an unrevealed Postcard, then the reveal shows first and, after "Add to Album", the Album opens as in 3.3 (the launch rule never overrides it).

## Spec Change Log

## Review Triage Log

### 2026-10-08 — Review pass
- verdicts: 19 findings — high 0, medium 0, low 13, false 6, maybe-false 0
- findings:
  - `[low]` `[patch]` (edge) "No rush" counts in-progress Sessions with unknown keys that `launch` ignores — only reachable from bad/stale state; count only valid Puzzle keys via the shared `isPuzzleKey`, plus a test.
  - `[false]` `[reject]` (edge) `launch` puzzle branch carries stale Undo/selection/confirm from another Session — `ui` is never saved and the app's initial state comes from `createInitialState` (`activeKey null`, empty Undo), so no reachable start state carries them.
  - `[false]` `[reject]` (edge) Album branch carries stale Undo to the new current Puzzle — same refutation as above.
  - `[false]` `[reject]` (intent) the shipped app can't reach the Puzzle branch until a reload restores state — the intent defers reload survival to Story 4.1 and asks for a pure, unit-tested rule.
  - `[low]` `[patch]` (intent) `freePlayGenerated` setting `lastPlayedKey` is untested — regression test added (Story 1.8 decision).
  - `[low]` `[reject]` (intent) "No rush" computed style isn't asserted — jsdom doesn't compute styles; the CSS uses the AC's tokens and was read in review.
  - `[false]` `[reject]` (intent) a solved last-played Session counted as current — the AC names "at launch the `lastPlayedKey` session"; recorded as a planner decision.
  - `[low]` `[patch]` (VG) first Album visit after launching onto a Puzzle never checked for Region — test with a Tokyo Postcard asserting Asia; doc comment notes the deliberate `albumSeen` asymmetry.
  - `[low]` `[patch]` (VG) "No rush" vs launch key mismatch — grouped with the first edge finding.
  - `[false]` `[reject]` (blind) `launch` skips `openSession` invariants — same refutation as the stale-UI edge finding.
  - `[low]` `[patch]` (blind) `key is string` predicates narrow `last` to `null` on false — now plain `boolean`.
  - `[low]` `[patch]` (blind) "No rush" vs launch key mismatch — grouped with the first edge finding.
  - `[false]` `[reject]` (blind) hyphen instead of em dash and singular "your Puzzle" — the wording is verbatim from the Story 3.5 AC.
  - `[low]` `[patch]` (blind) App doc comment omits the fallbacks and isn't wrapped — fixed.
  - `[low]` `[patch]` (blind) no negative last-played cases — added `hintRequested`, `restartRequested`, `restartCancelled`, refused `digitEntered` on a Given, foreground `freePlayGenerated`.
  - `[low]` `[patch]` (blind) launch UI test gaps — added a focus-fires-once test; App-level Free Play fallback and non-default start screens rejected as already covered by the pure `launch` tests.
  - `[low]` `[patch]` (blind) fragile test setup — `mountOnAlbum` asserts the Album, nav-scoped "Album" click, postcard Region intent restored or no-op clicks dropped.
  - `[low]` `[patch]` (blind) "is deterministic" test can't fail — deleted.
  - `[low]` `[patch]` (blind) puzzle branch leaves `albumSeen` unexplained — grouped with the VG Region finding.

## Design Notes

**Decisions (auto-planner, 2026-10-08):**
- `lastPlayedKey` setters already match the AC through `putSession`; this story only adds tests. `freePlayGenerated` (foreground) keeps setting it, as decided in Story 1.8: generating a Puzzle replaces the Session and is not "only opening" one.
- "Current Puzzle at launch" follows the AC literally: when nothing is in progress, `activeKey` is the `lastPlayedKey` Session if it exists (even solved), so "Puzzle" returns to it; otherwise `null` and "Puzzle" is disabled.
- `launch` sets `albumSeen = album.length` when opening on the Album, so the next Album visit does not re-pick the Region.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.

**Manual checks:**
- With the dev server, Lamplight and Daylight: start a City, place a digit, go to the Album and check "No rush" under the heading; the "Puzzle" nav returns to the grid with focus on it. (A real reload resets state until Story 4.1.)

## Auto Run Result

Status: done

**Summary:** A pure launch rule (`game/launch.ts`) opens the last-played Puzzle in progress, else the first City in progress in catalogue order, else Free Play, else the Album on the latest Postcard's Region; an unrevealed Postcard still shows first. Focus lands on the grid or the Album heading at start, and the Album shows "No rush - your Puzzle will wait." while a Puzzle is in progress. `lastPlayedKey` setters were already correct and are now pinned by tests.

**Files changed:**
- `src/game/launch.ts` -- new pure `launch` and exported `isPuzzleKey`.
- `src/ui/app.tsx` -- initializer runs `launch` before `showPendingPostcard`; focus also moves on mount.
- `src/ui/album-screen.tsx`, `src/ui/album.css`, `src/content/copy.ts` -- the "No rush" line.
- `tests/game/launch.test.ts`, `tests/game/last-played.test.ts`, `tests/ui/launch.test.ts` -- new.
- `tests/ui/postcard.test.ts`, `replay.test.ts`, `album.test.ts`, `hint-panel.test.ts`, `puzzle-title.test.ts` -- setup only (navigate to the Album/Puzzle after launch).

**Review:** 4 layers, 19 findings: 13 low patched (9 fix groups), 6 false rejected (stale `ui` at launch is unreachable because `ui` is never saved; reload is Story 4.1; the copy is verbatim from the AC; a solved last-played Session as current follows the AC). Nothing deferred. Patched by verdict: high 0, medium 0, low 13. Follow-up review recommended: false.

**Verification:** `npm run lint && npm test && npm run build` exit 0 (965 tests, about 9.5s). Headless Chrome (1280px): fresh start opens "Where to first?" with focus on the heading and "Puzzle" disabled; after one digit in Paris the Album shows "No rush" under the heading (italic, ink-muted, 14px) and "Carry on" on Paris; "Puzzle" returns to the grid with focus on a cell; no console errors. Lamplight not rechecked (colour comes from the existing `ink-muted` token, contrast pair already tested).

**Residual risks:** opening straight onto a Puzzle in the real app needs Story 4.1's restore; until then every real launch is a fresh Album.
