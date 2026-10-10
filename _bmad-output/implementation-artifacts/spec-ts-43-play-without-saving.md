---
title: 'TS-43: storage unavailable — play without saving'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_revision: 'ef66598cdc124e2cb956814bf9c6fc058b114d24'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      Reference docs still describe read-only storageUnavailable and the old banner order.
    evidence: |-
      epic-4-context.md:40 banner priority lacks savingOff/unreadable; spec-4-2 (31, 103), spec-4-4 (37) and
      spec-ts-42-44 (24, 32, 59) describe read-only storageUnavailable; EXPERIENCE.md Voice and Tone lacks the
      saving-off line. Scheduled in TS-48 (reconcile docs with as-built).
    location: >-
      _bmad-output/implementation-artifacts/epic-4-context.md:40
    severity: low
---

<intent-contract>

## Intent

**Problem:** Epic 4 retro E2: when storage can't be reached (the load fails, start-up hits the 3 s timeout, or unreadable data can't be backed up), the tab goes read-only with reason `storageUnavailable`. Nothing can be started at all, and even a first-time visitor is told "We couldn't read your saved progress", which is untrue. Jessica accepted the recommended default on 2026-10-09: keep the game playable, without saving, and say so plainly.

**Approach:** Replace the `storageUnavailable` read-only reason with a separate "saving off" state. The tab plays normally in memory, never writes, never asks for persistent storage, and shows one honest banner. Read-only stays only for another tab holding the lock or newer-version data.

## Boundaries & Constraints

**Always:**
- A saving-off tab never writes to storage: no saver, no start-up writes, and no `persist()`/`persisted()` calls. It releases the save lock as soon as start-up settles, so another tab can write.
- Everything else plays normally: Cities, Free Play, Hints, Postcards and Settings all change in memory.
- One new banner, "savingOff", ranks second, right after `readOnly`. Its info tone and wording are exactly: "We can't save your progress in this browser right now. You can keep playing, but nothing will be kept. Reload to try again." It is not announced; banners stay silent except save-failed.
- While saving is off, the storage notice ("Your Album lives in this browser only…") and the Add to Dock tip never show, because they promise saving.
- The `otherTab` and `newerVersion` read-only behaviour is unchanged.
- All copy lives in `src/content/copy.ts`.

**Never:**
- Change the 3 s timeout.
- Change the unreadable flow when its backup succeeds.
- Add a retry-without-reload feature.
- Add new dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Load fails | `store.load` rejects | Album opens with defaults; savingOff banner; "Travel here" opens a City; digits place; nothing saved; lock released | — |
| Start-up timeout | load or lock hangs past 3 s | Same as "load fails" | — |
| Backup fails | unreadable data, `saveBackup` rejects | Same as "load fails"; main key untouched | — |
| First visit, storage broken | no data, load rejects | savingOff banner, never the unreadable wording; no storage notice | — |
| Other tab | lock held elsewhere | Unchanged: read-only banner and inert grid | — |
| Got it | savingOff banner dismissed | Banner hides for the page; storage notice still never shows; still nothing saved | — |

</intent-contract>

## Code Map

- `src/game/types.ts:150-174`: `UiState.readOnly` and `ReadOnlyReason` (drop `storageUnavailable`); add `ui.savingOff: boolean` (UI only, never saved; doc it); add `'savingOff'` to `BannerKind`.
- `src/game/session.ts`: `createInitialState()` UI defaults; add `savingOff: false`.
- `src/game/banners.ts`: `BANNER_PRIORITY` (insert `'savingOff'` second); `pending()` (`savingOff` → `ui.savingOff`; `storageNotice` and `addToDock` false while `ui.savingOff`); widen the `BannerState` pick.
- `src/ui/notice-banner.tsx`: `bannerText`; add the savingOff line. The read-only fallback no longer needs the unreadable line for storageUnavailable.
- `src/content/copy.ts:210-216`: add `bannerSavingOff`.
- `src/persistence/store.ts:73-140`:
  - `Start` gains `savingOff: boolean`.
  - `settleLoad` returns `savingOff: true` (and `readOnly` `null`, or `otherTab` for a non-holder) where it now returns `readOnly: 'storageUnavailable'`: `failed`, backup failed, and both aborted branches.
- `src/ui/boot.tsx`:
  - `UNAVAILABLE` becomes `{ readOnly: null, savingOff: true, … }`.
  - Release the lock when `start.readOnly !== null || start.savingOff`.
  - Pass the notices through.
- `src/ui/app.tsx`:
  - `notices` prop type gains `savingOff`.
  - No saver when `notices.savingOff`.
  - `writable` (the persist gates at `:128-180`) also requires `!state.ui.savingOff`.
  - Update the doc comment.
- `src/game/reducer-notices.ts`: the `storageNoticeAcknowledged` and `resolvePersist` handling. A savingOff tab never asks; check nothing writes `meta` expecting a save.
- Tests referencing `storageUnavailable`:
  - `tests/game/read-only.test.ts:29`
  - `tests/game/banners.test.ts:59`
  - `tests/ui/notice-banner.test.ts:41`
  - `tests/persistence/store.test.ts`
  - `tests/ui/autosave.test.ts`: the boot timeout tests and "a holder that ends read-only (storageUnavailable) releases the lock". These now expect savingOff with play allowed.

## Tasks & Acceptance

**Execution:**
- `src/game/types.ts`, `src/game/session.ts`: types and initial state, as in the Code Map.
- `src/content/copy.ts`: add `bannerSavingOff`.
- `src/game/banners.ts`: add the savingOff priority and pending rule, and suppress the storage notice and Add to Dock while saving is off.
- `src/ui/notice-banner.tsx`: render the savingOff line.
- `src/persistence/store.ts`: settle to `savingOff` instead of `readOnly: 'storageUnavailable'`.
- `src/ui/boot.tsx`: `UNAVAILABLE`, the lock release, and notices.
- `src/ui/app.tsx`: no saver; the persist gates; docs.
- Tests: update the existing `storageUnavailable` expectations. Add mounted tests for each matrix row: the banner text, play allowed (a slot opens and a digit places), `save`/`saveBackup`/`persist`/`persisted` never called, the lock released, and no storage notice after "Got it". Add banners unit tests for the priority and suppression.

**Acceptance Criteria:**
- Given any matrix row, when the app boots in jsdom with the fake store, then the stated banner, play and no-write behaviour hold.
- Given `npm test`, `npm run lint` and `npm run build`, when they run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-10-09 — Review pass
- verdicts: 28 findings — high 0, medium 3, low 16, false 9, maybe-false 0
- findings:
  - `[low]` `[reject]` (intent) "nothing is known stored" qualifier dropped: backup-failed and existing-backup cases also play without saving — accepted default was "playable without saving"; the wording patch below makes the line true when data exists.
  - `[medium]` `[patch]` (intent) returning players get no word that earlier progress is untouched — line now: "We can't save your progress in this browser right now. Anything saved before is left untouched. You can keep playing, but this session won't be kept - reload to try again.", `src/content/copy.ts`.
  - `[low]` `[reject]` (intent) all tests are jsdom/fake store, not real browsers — the real-browser run is TS-45/TS-46.
  - `[low]` `[reject]` (intent) Free Play, Hints, Postcards not exercised with saving off — no `savingOff` gate exists in reducer or screens to break them.
  - `[false]` `[reject]` (intent) lock release beyond intent — follows from "never writes"; spec Always.
  - `[medium]` `[patch]` (intent) read-only + saving-off overlap — see edge row 1.
  - `[medium]` `[patch]` (edge) a non-holder whose load fails says "keep playing" over an inert grid after "Got it" — `savingOff` pending only when `readOnly === null`, `src/game/banners.ts`; tests in `tests/game/banners.test.ts`, `tests/ui/autosave.test.ts` (other tab, load fails).
  - `[medium]` `[patch]` (edge) a tab whose lock resolved not held then timed out became playable beside the writing tab — boot remembers the lock outcome and starts `readOnly: 'otherTab'`, `src/ui/boot.tsx`; test "lock not held, load hangs".
  - `[false]` `[reject]` (edge) non-holder late load drops otherTab — same fix as above (start derived after the give-up).
  - `[false]` `[reject]` (edge) banners test codifies the contradiction — test changed with the patch.
  - `[false]` `[reject]` (edge) claim "otherTab unchanged" violated on timeout — same fix.
  - `[false]` `[reject]` (edge) claim "everything plays" violated for non-holder — same banner fix.
  - `[low]` `[patch]` (edge) backup-fails / load-rejects rows don't assert no persist; load-hang no lock-release assert — added, `tests/ui/autosave.test.ts`. The lock is now also released at the give-up while still loading (a hung load no longer blocks other tabs), `src/ui/boot.tsx`.
  - `[false]` `[reject]` (blind) contradiction banner — duplicate of edge row 1.
  - `[false]` `[reject]` (blind) returning player reassurance — duplicate of intent row 2.
  - `[false]` `[reject]` (blind) backup-failed loses information — covered by the new wording.
  - `[low]` `[patch]` (blind) first-Postcard `persist()` gate untested for saving off — mounted App test, `tests/ui/storage-notice.test.ts`.
  - `[low]` `[reject]` (blind) not every area played in memory — as intent row 4.
  - `[low]` `[patch]` (blind) new reducer-notices branches untested — two unit tests, `tests/game/storage-notice.test.ts`.
  - `[low]` `[reject]` (blind) `bannerText` fallback not exhaustive — every current kind is handled; a `never` switch is a refactor.
  - `[low]` `[patch]` (blind) `expectPlaysWithoutSaving` doc overclaims — reworded; `saveBackup` asserted per test.
  - `[low]` `[reject]` (blind) redundant assertions — harmless.
  - `[low]` `[reject]` (blind) "banners stay silent" check weak — banners have no live role; unchanged pattern.
  - `[low]` `[patch]` (blind) other-tab test stops before "Got it" — new other-tab + load-fails test dismisses and asserts no saving-off banner.
  - `[low]` `[defer]` (blind) reference docs still describe the old behaviour — deferred to TS-48 (frontmatter `deferred`).
  - `[low]` `[reject]` (blind) spec `deferred` vs Design Notes mismatch — fix edits this spec; the deferral is now listed.
  - `[low]` `[reject]` (blind) matrix lacks migrated-after-give-up and hanging-backup rows — fix edits this spec; both are tested.
  - `[low]` `[reject]` (verification-gap) no gaps reported — row kept for the count.

**Close-out (process item 8):** every patch row confirmed landed (files above); full suite 1290/1290, lint and build clean after patching.

## Design Notes

- **Delegated decision (Jessica, 2026-10-09):** play without saving, not read-only (Epic 4 retro open question 1).
- **Wording:** the line is drafted in the house voice (warm, brief, no exclamation marks). It goes into EXPERIENCE.md's Voice and Tone table in TS-48.
- **Lock:** the lock is released because a saving-off tab never writes. That lets a second tab, opened later, save normally.

## Verification

**Commands:**
- `npm test`: expected all pass.
- `npm run lint`: expected clean.
- `npm run build`: expected success.

## Auto Run Result

Status: done

- **Summary:** when storage can't be reached (load fails, the 3 s start-up timeout, or an unreadable save that can't be backed up), the tab now plays in memory with saving off instead of going read-only, and says so in one banner. Read-only is only for another tab holding the lock (including one that then times out) or newer data. A saving-off tab never writes, never asks for persistent storage, gives the lock back, and hides the storage notice and Add to Dock tip.
- **Files:** `src/game/types.ts`, `session.ts`, `banners.ts`, `reducer-notices.ts`; `src/content/copy.ts`; `src/persistence/store.ts`; `src/ui/boot.tsx`, `app.tsx`, `notice-banner.tsx`; tests in `tests/game/{banners,read-only,reducer,storage-notice}.test.ts`, `tests/persistence/store.test.ts`, `tests/ui/{autosave,notice-banner,storage-notice}.test.ts`.
- **Review:** 28 findings; 9 patch rows (3 medium, 6 low), 1 deferred (docs to TS-48), rest rejected.
- **Follow-up review recommended:** false. Three medium entries were patched; the boot lock logic was re-read by the parent and is covered by the late-load, late-lock and load-hang tests.
- **Verification:** `npm test` 1290/1290, lint clean, build ok.
- **Residual risks:** real-browser storage failure not yet exercised (TS-45/TS-46); the new banner line awaits Jessica's read in TS-48.
