---
title: 'Epics 1-3 retrospective action items (1, 2, 3, 4, 10)'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
baseline_revision: 'e8f001ca8a02f55b2eb8ffdd2745dc8329d31ea6'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['multiple-goals']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Epics 1-3 retrospective (`epics-1-3-retro-2026-10-08.md`) left five Claude-owned items open: a Free Play reply can swap the grid under a player who went back to the old Free Play (D1) and the foreground reply clears another Session's Hint (D5); the primary Hint button's key caption fails 4.5:1 contrast (D2); the solve date is frozen when `App` renders, not read at dispatch (D3); `reducer.ts` (762 lines) repeats "make Session current" three times and "untouched grid" twice, `keyboard.ts` has a stale comment and a duplicated Escape filter, `assists.ts` recomputes grid geometry (A3, A4, A5, A10); and `deferred-work.md` lacks the resolved line for the 1.7 header-Difficulty item (V5).

**Approach:** Fix each in place, behaviour-preserving except D1/D2/D3/D5, with a test per defect; split the reducer into area modules behind the unchanged `src/game/reducer.ts` public API.

## Boundaries & Constraints

**Always:** `src/game/reducer.ts` keeps exporting `reducer`, `showPendingPostcard`, `SOLVING_ACTIONS`, `applyDigit`, `clearCell` (importers unchanged). The reducer stays pure and returns the same reference on no-op. All existing tests keep passing unchanged except where a test encoded the defect. Architecture rules (game imports engine/content only) hold.

**Never:** No change to save format, copy text, layout, or any behaviour beyond D1/D2/D3/D5. No new dependencies. No pixel tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| D1 hold | Free Play in progress; replace confirmed → generating; "Puzzle" nav opens old Free Play; player places digits; reply arrives | Old Session, its digits, Undo, selection and screen unchanged; entry back to idle (not generating, not confirming); `settings.freePlayDifficulty` and `meta.lastPlayedKey` unchanged | Reply set aside, no error |
| D1 still opens | Same, but player is on the Free Play entry when the reply arrives | New Puzzle opens as today | — |
| D1 solved old | Old Free Play solved and current on Puzzle screen | New Puzzle replaces it as today (nothing to lose) | — |
| D5 | City Hint open (`ui.hint.sessionKey` = city), player on entry, reply opens new Free Play | City's Hint kept; a Free Play-owned Hint is cleared | — |
| D3 | App rendered on day N (no `today` prop); clock moves to N+1; solving move dispatched | Postcard `collectedOn` = N+1 | — |

</intent-contract>

## Code Map

- `src/game/reducer.ts` -- 762 lines: entry `reducer` (notices → pending-Postcard gate → date refusal → `reduce` → hint reset → reveal gate → read-only guard). Areas: grid (`placement`, `applyDigit`, `clearCell`, `select`, `record`, `undo`, `restart`, `step`), hints (`requestHint`, `applyHint`, `setDefinitionOpen`, `resetHintOnDigits`), journey (`settle`, `showPendingPostcard`, `addPostcard`, `chooseCity`, viewer/replay fns), navigation (`openSession`, `showPuzzle`, `chooseScreen`, `resumeFreePlay`), Free Play (`freePlay`, D1/D5 at `freePlayGenerated`), notices (`noticeAction`, `resolvePersist`, read-only sets).
- Make-current copies: `openSession` (:471), `freshCitySession` (:503), `freePlayGenerated` foreground (:678-695). Untouched-grid copies: `restart` `clean` (:181), `requestReplay` `untouched` (:560).
- `src/game/session.ts` -- `activeSession`, `createSession`, `FREE_PLAY_KEY`; home for an `isUntouched(session)` helper.
- `src/engine/grid.ts:31-33` -- `rowOf`, `colOf`, `boxOf` to reuse in `src/game/assists.ts:39-57`.
- `src/ui/keyboard.ts:97-101` stale "only keydown listener" comment; `:139-171` `useEscape`/`useDocumentEscape` share the bare-Escape filter.
- `src/ui/app.tsx:96,246` -- `date = today ?? localDate()` passed to `PuzzleScreen` (D3). `src/ui/puzzle-screen.tsx:31-36,44-48` doc + dispatch fallback `today ?? localDate()` already correct once `today` is undefined.
- `src/ui/controls.css:64-79` -- `.button-caption` is `ink-muted`; primary fill is `ink`, disabled primary fill `ink-muted` (:118-126).
- `tests/ui/contrast.test.ts` -- `PAIRS`, `palette`, `contrastRatio` helpers; `card`/`ink` and `card`/`ink-muted` pairs exist.
- `tests/game/free-play.test.ts` -- `run`, `requested`, `generated`, `screen` helpers for D1/D5 tests.
- `_bmad-output/implementation-artifacts/deferred-work.md:13-15` -- 1.7 item, add `resolved:` (fixed in e556c6f, `tests/ui/free-play.test.ts:175-182`).

## Tasks & Acceptance

**Execution:**
- `src/game/session.ts` -- add `isUntouched(session)` (digits === givens, no Notes) -- A4.
- `src/game/reducer.ts` + new `src/game/reducer-grid.ts`, `reducer-hint.ts`, `reducer-journey.ts`, `reducer-free-play.ts`, `reducer-notices.ts`, `reducer-shared.ts` -- move each area's functions; `reducer-shared.ts` holds validators, `putSession`, and one `makeCurrent(state, key)` (activeKey, empty Undo, selection, current digit, Restart confirm) used by `openSession`, `freshCitySession` and the Free Play foreground reply; use `isUntouched` in restart and replay -- A3, A4.
- `src/game/reducer-free-play.ts` -- D1: when the old Free Play is current (`activeKey === FREE_PLAY_KEY`), in progress, and the screen is `puzzle`, set the reply aside: only `ui.freePlay` goes to idle/not confirming. D5: foreground branch clears `ui.hint` only when it belongs to `FREE_PLAY_KEY`.
- `tests/game/free-play.test.ts` -- tests for the D1 hold (replace → generate → Puzzle nav → digit → reply), the solved-old case, and D5.
- `src/ui/controls.css` -- `.button--primary .button-caption { color: var(--color-card) }` -- D2.
- `tests/ui/contrast.test.ts` -- caption pairs: parse the primary caption colour from controls.css and assert ≥4.5:1 on `ink` and on `ink-muted` (disabled) in both themes; add `card` on `ink` / `card` on `ink-muted` caption notes -- D2.
- `src/ui/app.tsx` -- pass the `today` prop (undefined in the shipped app) to `PuzzleScreen`, not the render-time date; update `src/ui/puzzle-screen.tsx` doc comment -- D3.
- `tests/ui/postcard.test.ts` (or new) -- mount App with no `today`, fake system time day N, advance to N+1 without re-render, solve, expect `collectedOn` N+1 -- D3.
- `src/ui/keyboard.ts` -- fix comment; extract `isBareEscape(e)` shared by both Escape hooks -- A10.
- `src/game/assists.ts` -- use `rowOf/colOf/boxOf` -- A5.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- add resolved line -- V5.

**Acceptance Criteria:**
- Given the full suite, when `npm test`, `npm run lint`, `npm run build` run, then all pass and `src/game/reducer.ts` is under 250 lines.
- Given the primary Hint button in either theme, enabled or aria-disabled, when its key caption is measured, then contrast is ≥ 4.5:1.
- Given the I/O matrix rows, when the tests run, then each holds.

## Spec Change Log

## Review Triage Log

### 2026-10-09 — Review pass
- verdicts: 23 findings — high 0, medium 0, low 15, false 8, maybe-false 0
- findings:
  - `[low]` `[reject]` (verification-gap other) D1 hold applies only on the Puzzle screen; an old Free Play played then left for Settings/Album is still replaced by a late reply — pre-existing behaviour, needs replace → old grid → play → leave screen inside the generation window; a fix needs new "touched since request" state, not a direct correction. Residual risk.
  - `[false]` `[reject]` (verification-gap other) held reply leaves `ui.freePlay.picked` at the requested Difficulty — `chooseScreen` reseeds `picked` from `settings.freePlayDifficulty` on entering the entry (`src/game/reducer.ts`), the only screen that shows it.
  - `[low]` `[reject]` (edge-case) same as the first row (Settings/Album hold) — same reason.
  - `[false]` `[reject]` (edge-case) `picked` names a Difficulty no Session holds — same refutation as row 2.
  - `[false]` `[reject]` (intent) `sprint-status.yaml` not touched — done at close-out in the same commit, as the intent orders ("when done").
  - `[false]` `[reject]` (intent) item 8 close-out missing — performed at close-out below (patched rows list file:line).
  - `[low]` `[reject]` (intent) D1 discards rather than defers or announces — delegated decision recorded in Design Notes; one Free Play slot, nothing on screen changes. Flagged for Jessica.
  - `[low]` `[reject]` (intent) no mounted-App D1 test — the decision lives in the pure reducer, which the tests pin; the UI only dispatches the reply.
  - `[low]` `[reject]` (intent) D2 checked against CSS text, not rendered colour — jsdom computes no styles (retro V7 accepted); no later rule overrides the caption (verified by verification-gap layer).
  - `[low]` `[reject]` (intent) in-progress Postmark still reads the clock at render — any move re-renders it; out of D3's scope (solve date).
  - `[false]` `[reject]` (intent) delegated decisions not reflected in sprint-status/retro — they are recorded in this spec, which the sprint-status items reference via close-out.
  - `[low]` `[reject]` (blind) D1 hold only on the Puzzle screen — same as row 1.
  - `[low]` `[reject]` (blind) held reply dropped with no feedback — delegated decision (row 7).
  - `[low]` `[patch]` (blind) hold test never checks `ui.hint` — added assertion, `tests/game/free-play.test.ts:288`.
  - `[low]` `[patch]` (blind) hint.test reroute left the Puzzle-screen reply scenario unasserted — added held-reply case keeping the Hint, `tests/game/hint.test.ts:206`.
  - `[low]` `[reject]` (blind) `settle` lives in `reducer-journey.ts` — it is the Postcard award rule; moving it is taste, no caller diverges.
  - `[low]` `[reject]` (blind) `isScreen` in shared / navigation stays in `reducer.ts` — layout choice; no named harm.
  - `[low]` `[patch]` (blind) module header `/** */` attaches to `isCell` as JSDoc — now `/* */`, `src/game/reducer-shared.ts:3`.
  - `[false]` `[reject]` (blind) spec Code Map lines stale / logs empty — fix edits this build's spec; logs are filled here.
  - `[low]` `[reject]` (blind) D2 regex fragile — unlikely to meet; guarding selector lists adds complexity.
  - `[low]` `[patch]` (blind) PuzzleScreen `today` doc contradicts itself — reworded, `src/ui/puzzle-screen.tsx:31-38`.
  - `[false]` `[reject]` (blind) D3 test checks Postmark text, not `collectedOn` — a solved City's Postmark renders `collectedOn`, so it is the stored date at the outer surface; all four solving actions share one wrapper.
  - `[low]` `[reject]` (blind) no direct tests for `isUntouched`/`makeCurrent` — exercised by restart, replay and Free Play reducer tests.

**Close-out (process item 8):** all 4 patch rows confirmed landed at the cited file:line; full suite 1265/1265, lint and build clean after patching.

## Design Notes

**Delegated decisions (user away, recommended defaults):**
- D1 "hold" = set the reply aside (dropped). Only one Free Play slot exists, so it cannot wait under "Carry on" as a City's does; the player visibly chose to keep playing the old grid, so nothing they made is destroyed. The entry returns to idle; "Start a new one" asks again. Not announced: nothing on screen changes.
- D2 caption colour = `card` (already measured ≥4.5:1 on `ink` and `ink-muted`); no new token.
- A3 split = flat sibling modules `reducer-*.ts` in `src/game/` (no subfolder), so the architecture checker's path rules apply unchanged.

## Verification

**Commands:**
- `npm test` -- expected: all pass, new D1/D2/D3/D5 tests included
- `npm run lint` -- expected: clean
- `npm run build` -- expected: success
- `wc -l src/game/reducer*.ts` -- expected: reducer.ts < 250

## Auto Run Result

Status: done

- **Summary:** fixed retro items 1 (D1 hold + D5 Hint), 2 (D2 caption contrast), 3 (D3 dispatch-time date), 4 (reducer split into `reducer-*.ts`, `makeCurrent`, `isUntouched`, `isBareEscape`, engine geometry in assists) and 10 (deferred-work resolved line).
- **Files:** `src/game/reducer.ts` (762 → 131 lines, entry + router + chooseScreen); `src/game/reducer-{shared,grid,hint,journey,free-play,notices}.ts` (areas); `src/game/session.ts` (`isUntouched`); `src/game/assists.ts` (rowOf/colOf/boxOf); `src/ui/app.tsx` (passes `today` prop through); `src/ui/puzzle-screen.tsx` (doc); `src/ui/controls.css` (primary caption = card); `src/ui/keyboard.ts` (comment, `isBareEscape`); tests: free-play, hint, contrast, postcard; `deferred-work.md`.
- **Review:** 23 findings; 4 patched (all low), 0 deferred, 19 rejected (reasons in the triage log).
- **Follow-up review recommended:** false (no high, no medium patched).
- **Verification:** `npm test` 1265/1265, `npm run lint` clean, `npm run build` ok.
- **Residual risks:** D1 hold covers the Puzzle screen only (an old Free Play played then left for Settings/Album before a late reply is still replaced, as before); the held reply is dropped silently (delegated decision, for Jessica to confirm).
