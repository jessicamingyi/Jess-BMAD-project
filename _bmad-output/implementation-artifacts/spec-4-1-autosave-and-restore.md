---
title: 'Story 4.1: Autosave and restore'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_revision: '099c5b1068e7c3900260b15779f9bee4293be7b9'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A Lamplight player on a light OS may see a blank white system Canvas frame while the saved document loads.
    evidence: |-
      theme.css html:not([data-ready]) uses background-color: Canvas with color-scheme: light dark (spec Design Notes decision).
      Settle with a frame capture (DevTools Performance screenshots) on a light OS, Lamplight on, cold reload.
    location: >-
      src/ui/theme.css (pre-ready rule)
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** Nothing is saved: a reload loses the Album, every half-finished Puzzle and all Settings, and Story 3.5's launch rule and Story 3.3's "unrevealed Postcard shows again" can never run in the shipped app (retro 2026-10-08, V1).

**Approach:** Add `src/persistence/` as the only storage module: `toDocument`/`fromDocument` for one `{ schemaVersion: 1, album, sessions, settings, meta }` document saved whole to IndexedDB via `idb-keyval` under one key. The shell loads it before the first render, restores the saved slices onto a fresh `createInitialState()` UI, runs `launch` + `showPendingPostcard`, and writes the whole document (serialised, in order) after every action that changes a saved slice.

## Boundaries & Constraints

**Always:**
- Only files in `src/persistence/` import `idb-keyval` or reference `indexedDB`, `localStorage` or `navigator.storage`; the architecture test enforces this for every other file under `src/` (and `scripts/`).
- `idb-keyval` pinned at 6.3.x in `package.json` `dependencies`.
- The document holds `givens`, `solution`, `digits` as 81-char digit strings and `notes` as 81 numbers; `ui` is never written.
- A write happens only when `album`, `sessions`, `settings` or `meta` changed by reference; `ui`-only actions never write. Writes are queued one at a time; the last write always carries the latest state.
- Restored state: saved slices from storage, `ui` from `createInitialState()` (Undo empty, viewer/Hint/justArrived/solvedAgain empty), then `launch`, then `showPendingPostcard`.
- Lamplight is applied (`data-theme`) before React's first render, and nothing app-styled paints before the load settles.
- A solved City's grid Postmark shows its Postcard's `collectedOn`; an in-progress City shows today.

**Never:**
- No write on start (first visit or restore) until a saved slice changes.
- Never overwrite stored data that could not be read (bad JSON shape, `schemaVersion` ≠ 1): start from defaults and disable saving for this page load. The banner, backup key and read-only UI are Story 4.2.
- No Web Lock, migrations, `navigator.storage.persist()`, save-failed banner, service worker or storage notice (Stories 4.2–4.4).
- No `seenStorageNotice`/`persistGranted` in `meta` yet (Story 4.4 adds them).
- No `localStorage` mirror of the theme and no inline script (the CSP `default-src 'self'` forbids it).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First visit | store empty | Album, defaults, `sessions` `{}`; no write | none |
| Restore mid-City | saved, `lastPlayedKey` `city:lisbon` in progress | opens Lisbon's Puzzle, digits and Notes as left, Undo empty | none |
| Restore, last played solved | `lastPlayedKey` solved, another City in progress | launch rule picks the in-progress City | none |
| Unrevealed Postcard | album has `revealed: false` | Postcard reveal shows first | none |
| Settings kept | Lamplight on, Mistake on, Free Play Hard saved | applied on load; `data-theme` set before render | none |
| UI-only action | select cell, Notes mode, Hint step, viewer open, Restart confirm | no write | none |
| Rapid changes | three digits in quick succession | writes run in order; stored doc equals final state | a failed write is dropped silently; the next change retries |
| Unreadable data | stored value not a valid v1 document | defaults; saving off for this load; stored value untouched | no throw, no write |
| Load rejects | IndexedDB unavailable / `get` throws | defaults; saving off for this load | no throw |

</intent-contract>

## Code Map

- `src/persistence/.gitkeep` -- replace with `document.ts` (pure `toDocument`/`fromDocument` + v1 validation) and `store.ts` (`idb-keyval` `get`/`set` under key `traveller-save`, a serial write queue, `loadSaved()` → `{ kind: 'empty' } | { kind: 'loaded', slices } | { kind: 'unreadable' }`). Export a `SaveStore` interface (`load`, `save`) so tests inject a fake.
- `src/game/session.ts:48-75` -- `createInitialState()`; the restore base for `ui`. `DEFAULT_SETTINGS` for first visit.
- `src/game/types.ts:18-60,86-88,215` -- `Session`, `Postcard`, `Settings`, `Meta`, `AppState`; document fields mirror these (no type changes needed).
- `src/game/launch.ts:31-50` -- launch rule; already sets `albumRegion`/`albumSeen` for the Album branch.
- `src/game/reducer.ts` `showPendingPostcard` -- applied after `launch` (as `App` does today).
- `src/ui/app.tsx:36-60` -- `useReducer` initialiser and the Lamplight effect. Add a `store?: SaveStore` test prop (like `createWorker`) and a `loaded?: Slices` start; add an effect that saves when `album/sessions/settings/meta` references differ from the last saved/loaded ones (skip the initial render).
- `src/main.tsx` -- await `loadSaved()` before `createRoot().render`; set `document.documentElement.dataset.theme` from loaded settings; then set `data-ready` on `<html>`.
- `src/ui/theme.css:8-9,219-221` -- `:root` `color-scheme`, `html` desk background. Add a pre-ready rule: `html:not([data-ready])` uses `color-scheme: light dark`, `background-color: Canvas`, and hides `body` (no Daylight desk before load).
- `src/ui/puzzle-screen.tsx:88` -- Postmark date: use the City's Postcard `collectedOn` when the Session is solved (fold-in of retro D4).
- `tests/architecture/check-architecture.ts:45-60,166-250` -- banned-identifier scan, currently engine/game only; add a storage rule for every non-`persistence/` file.
- `tests/ui/*.test.ts` (e.g. `launch.test.ts`, `city-session`, `settings.test.ts`) -- jsdom mount pattern (`createRoot` + `act`); jsdom has no IndexedDB, so UI tests use the injected fake store.

## Tasks & Acceptance

**Execution:**
- `package.json` / `package-lock.json` -- `npm install idb-keyval@6.3.0 --save-exact` -- storage library pinned by AD-7.
- `src/persistence/document.ts` -- `SCHEMA_VERSION = 1`; `toDocument(state)` → `{ schemaVersion, album, sessions, settings, meta }` (copies, no `ui`); `fromDocument(value: unknown)` → slices or `null` when not a valid v1 document (checks shapes: 81-char digit strings, 81 numeric notes, known `status`/`difficulty`, settings booleans, `meta.lastPlayedKey` string|null).
- `src/persistence/store.ts` -- `SaveStore` interface; `idbStore` using `idb-keyval`; `loadSaved(store)`; `createSaver(store)` returning `save(doc)` that chains writes on one promise and swallows a rejected write (next save retries the whole document).
- `src/persistence/.gitkeep` -- delete.
- `src/ui/app.tsx` -- accept `store` and loaded slices; build initial state as `showPendingPostcard(launch({ ...createInitialState(), ...slices }))`; save on saved-slice change unless saving is disabled (`saving={false}` after an unreadable or failed load); update the component doc comment (settings and Sessions are now restored). Keep the existing Lamplight effect.
- `src/main.tsx` -- load, apply theme, mark ready, render `<App loaded=… store=… saving=…/>`.
- `src/ui/theme.css` -- pre-ready rule.
- `src/ui/puzzle-screen.tsx` -- solved-City Postmark uses `collectedOn`; doc comment updated.
- `src/game/types.ts` -- update the `Settings` doc comment ("Reset on every load in Epic 1") to say they are saved.
- `tests/architecture/check-architecture.ts` + `architecture.test.ts` -- storage boundary rule with a failing-fixture test.
- `tests/persistence/document.test.ts` -- round-trip, `ui` excluded, field formats, invalid inputs → `null`, `schemaVersion: 2` → `null`.
- `tests/persistence/store.test.ts` -- fake `idb-keyval`-shaped backend: writes serialised in order, last write wins, rejected write then retry, `get` rejecting → unreadable/empty handling.
- `tests/ui/autosave.test.ts` -- mount App with a fake store: saved-slice action writes once; each UI-only action in the matrix writes nothing (spy); first visit writes nothing; **reload** = unmount, remount from the fake store's saved document: several half-finished Cities + Free Play reopen exactly, Album slots read "Carry on", Undo empty, launch rule picks `lastPlayedKey`, unrevealed Postcard shows first, Settings (Assist, Lamplight, Free Play Difficulty) kept, solved City Postmark shows `collectedOn`; unreadable document → defaults and no write.

**Acceptance Criteria:**
- Given a file outside `src/persistence/` that imports `idb-keyval` or references `indexedDB`, `localStorage` or `navigator.storage`, when `npm test` runs, then the architecture test fails naming that file.
- Given the built app in Chrome with Lamplight on and a half-finished City, when the page is reloaded, then the City reopens as left, Lamplight is on with no Daylight frame seen, and the browser console shows no errors.
- Given a solve after reload, when the Album opens, then the new Postcard is saved and survives another reload.

## Design Notes

- **No-flash approach (decision, unattended):** IndexedDB is async, so the page is held unpainted until the load settles (`html:not([data-ready])`: body hidden, canvas = system `Canvas` colour). Lamplight users never see the Daylight desk; on a light OS they may see a blank system-coloured frame for the IndexedDB read. A synchronous `localStorage` theme mirror was rejected: it needs a head script (no inline scripts under the CSP) outside `src/persistence/` and a second source of truth.
- **Unreadable data:** 4.1 never overwrites it (NFR11) by switching saving off for the page load; Story 4.2 adds the backup key, banner and migrations on top of `fromDocument` returning `null`.
- **Saved-slice detection** relies on the reducer's existing structural sharing: unchanged slices keep their reference.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.

**Manual checks:**
- `npm run build && npm run preview`, headless Chrome: start a City, add digits and Notes, toggle Lamplight, reload → same Puzzle, Lamplight, no console errors; solve a City and reload during the reveal → reveal shows again; DevTools IndexedDB shows one key `traveller-save`.

## Auto Run Result

Status: done

**Summary:** the Album, Sessions, Settings and `meta` now save to IndexedDB (`idb-keyval` 6.3.0, one key `traveller-save`) after every change to a saved slice, and restore before the first render; `ui` restarts from `createInitialState()`, then the launch rule and the unrevealed-Postcard rule run. Retro item 5 is folded in: reload tests for resume, Postcard restore and `ui` normalisation; the solved-City Postmark uses `collectedOn`.

**Files changed:**
- `src/persistence/document.ts` -- the saved document and v1 validation
- `src/persistence/store.ts` -- IndexedDB store, load, serial saver
- `src/ui/boot.tsx` -- load with timeout, theme, ready, render
- `src/main.tsx` -- calls `boot`
- `src/ui/app.tsx` -- restore and the autosave effect
- `src/ui/theme.css` -- pre-ready gate
- `src/ui/puzzle-screen.tsx` -- solved-City Postmark date
- `src/game/types.ts` -- Settings doc comment
- `tests/architecture/*` -- storage boundary guard
- `tests/persistence/*`, `tests/ui/autosave.test.ts` -- new tests
- `tests/ui/postcard.test.ts` -- Postmark expectation is now `collectedOn`
- `vite.config.ts` -- `testTimeout` 15 s (the first jsdom App mount in a file passed 5 s under the full parallel run)
- `package.json`, `package-lock.json` -- `idb-keyval` 6.3.0

**Review:** 31 findings. 6 patch entries applied (2 medium, 4 low); 1 deferred (the Canvas frame, unverified); the rest rejected with reasons in the triage log.

**Follow-up review recommended:** true. Two medium entries were patched (boot extraction, load timeout); the unverified risk is the new `boot()` ordering in a real browser (theme and ready before the first React commit), which only jsdom has exercised since the patch.

**Verification:** `npm run lint` clean; `npm test` 51 files, 1045 tests pass; `npm run build` ok. Before the patches, headless Chrome on `vite preview`: a first visit writes nothing; Paris with a digit and Notes plus Lamplight survived a reload; one `traveller-save` key, schemaVersion 1, no `ui`; a reload during a reveal re-showed it; no console errors or CSP violations.

**Residual risks:** the pre-ready Canvas frame (deferred); saving is silently off after unreadable data until Story 4.2's banner; two tabs can overwrite each other until Story 4.2.
