---
title: 'TS-42 + TS-44: start-up timeout race and Epic 4 test gaps'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
baseline_revision: '3e263762dcffe0fb5ef3d120acc7bd154c73b6a5'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['multiple-goals']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Epic 4 retro (`epic-4-retro-2026-10-09.md`): E1, if the 3 s start-up timeout fires while `settleLoad` is backing up unreadable data, the defaults still overwrite the main key, so the next launch shows an empty Album with no notice (data only in a backup key). E4, the boot timeout branches (late load after give-up, lock release after give-up) have no test. E5, nothing proves a read-only tab adding its first Postcard never calls `persist()`. R23, restore normalisation is asserted only for Undo. A7, `isObject` is defined twice and the "lock failed → holder" fallback is written twice.

**Approach:** Give `settleLoad` an abort check so that once boot has given up, it writes nothing to the main key (a backup may still finish, keeping the data safe). Add the missing tests and remove the two duplicates.

## Boundaries & Constraints

**Always:** After boot gives up, the main save key is never written by start-up code (no defaults write, no migration write-back). A started backup may complete. The give-up page stays as today: defaults, read-only `storageUnavailable`. Behaviour on the non-timeout paths is unchanged. Only `src/persistence/` touches storage.

**Never:** No change to the 3 s timeout value, banner copy, or the E2 read-only decision (that is TS-43). No new dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Late unreadable settle | Load resolves unreadable before 3 s; `saveBackup` resolves after 3 s | Backup written; `save` (defaults) never called; page read-only storageUnavailable; lock released | — |
| Late load | Load resolves (loaded doc) after 3 s | No `save`, no `saveBackup`; lock released; page defaults read-only | — |
| Late migration | Load resolves `migrated` but timeout already fired before write-back | Write-back skipped | — |
| Normal unreadable | Everything inside 3 s | Unchanged: backup, defaults written, unreadable notice | — |
| Read-only first Postcard | `otherTab` lock, stored doc with a revealable first Postcard, "Add to Album" | `persist` never called; nothing saved | — |
| Restore normalisation | Reload after a Hint open, Postcard viewer open and a "Solved again" | After reload: no Hint panel step, viewer closed, no "Solved again" line | — |

</intent-contract>

## Code Map

- `src/persistence/store.ts:92-135` -- `settleLoad(store, result, holder, now)`; `migrated` write-back (`store.save(result.doc)`) and `unreadable` backup then `store.save(toDocument(createInitialState()))`.
- `src/ui/boot.tsx:56-74` -- `sequence()` with `gaveUp` flag checked only before `settleLoad`; `withTimeout`, `UNAVAILABLE`, `LOAD_TIMEOUT_MS`. `boot.tsx:61` duplicates the lock-failure fallback from `lock.ts:35`.
- `src/persistence/lock.ts:22-36` -- `acquireSaveLock` already resolves `{held:true}` on a rejected request; the boot `.catch` covers an injected `acquireLock` that rejects (`autosave.test.ts` "a lock request that throws counts as the holder") — keep that behaviour, expressed once (e.g. export a `HOLDER_FALLBACK`/helper from `lock.ts`).
- `src/persistence/document.ts:51` and `src/persistence/migrations.ts:6` -- duplicate `isObject`; export one from `document.ts`.
- `tests/ui/autosave.test.ts:618-757` -- `describe('boot')`: fake timers pattern (`vi.useFakeTimers({ toFake: ['setTimeout','clearTimeout'] })`, `advanceTimersByTimeAsync`), `fakeStore`, `bootApp`, `release` spy pattern (`:691-701`); `describe('reload')` at `:204` with `reload(fake)` helper.
- `tests/ui/storage-notice.test.ts:363-385` -- `describe('a read-only tab')`, `otherTab`, `fakeBrowser`; first-Postcard fixtures in `describe('the first Postcard')` at `:231`.
- `tests/persistence/store.test.ts` -- unit tests for `settleLoad`.

## Tasks & Acceptance

**Execution:**
- `src/persistence/store.ts` -- `settleLoad` takes an optional `aborted: () => boolean` (default never); skip the `migrated` write-back and the `unreadable` defaults write when `aborted()` is true at that point; doc comment updated.
- `src/ui/boot.tsx` -- pass `() => gaveUp` to `settleLoad`; use the single lock fallback from `lock.ts`.
- `src/persistence/lock.ts` -- export the one fallback used by both.
- `src/persistence/document.ts`, `src/persistence/migrations.ts` -- one exported `isObject`.
- `tests/persistence/store.test.ts` -- `settleLoad` with `aborted` true: no `save` for unreadable (backup still called) and for migrated.
- `tests/ui/autosave.test.ts` -- boot tests: late load (resolves after timeout) → no save/backup, `release` called once; late backup (load unreadable in time, `saveBackup` resolves after timeout) → backup called, `save` never called, `release` called, banner is the storageUnavailable read-only one. Reload test asserting Hint, viewer and "Solved again" are cleared.
- `tests/ui/storage-notice.test.ts` -- read-only tab with a stored first revealable Postcard: "Add to Album" → `persist` not called, `save` not called.

**Acceptance Criteria:**
- Given the matrix rows, when the tests run, then each holds and each new test fails if its fix (or guarded line) is removed.
- Given the full suite, when `npm test`, `npm run lint`, `npm run build` run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-10-09 — Review pass
- verdicts: 25 findings — high 0, medium 1, low 17, false 7, maybe-false 0
- findings:
  - `[low]` `[patch]` (intent) E1's harm is at the next launch, which no test observed — late-backup test now boots again and asserts the unreadable notice, `tests/ui/autosave.test.ts` ("unreadable data whose backup finishes after the give-up").
  - `[low]` `[patch]` (intent) guard narrows rather than closes the race (a main-key write in flight at the timeout still lands) — cannot cancel an IndexedDB write without hanging the page; documented as residual in `src/persistence/store.ts` settleLoad doc and `src/ui/boot.tsx` doc.
  - `[false]` `[reject]` (intent) E4 per-line mutation coverage not met — implementer mutation-checked the late-load return and both releases; each fails a test.
  - `[low]` `[reject]` (intent) aborted `migrated` branch return value only visible to the unit test — boot discards it by design; comments now say so.
  - `[medium]` `[patch]` (intent) R23 test cannot tell "normalised" from "never stored" / viewer leg — grouped with the vacuous viewer finding below.
  - `[false]` `[reject]` (intent) A7 still two `.catch` sites — the ticket asked for one fallback; both sites share `HOLDER_FALLBACK`.
  - `[medium]` `[patch]` (verification-gap) R23 "viewer closed" check is vacuous (reload lands on the Puzzle screen) — test reordered so the reload lands on the Album, `tests/ui/autosave.test.ts:276-279`.
  - `[low]` `[reject]` (verification-gap other) migrated `aborted()` guard unreachable from boot (no await between the boot check and it) — harmless defensive code; unit-tested.
  - `[medium]` `[patch]` (blind) viewer check vacuous — same patch as above.
  - `[low]` `[reject]` (blind) late-load it.each cases hit the same branch — they pin the early return for each document kind; cheap.
  - `[low]` `[patch]` (blind) spec/doc overclaims "never written" for an in-flight write — documented residual (row 2).
  - `[low]` `[patch]` (blind) a lock granted after the give-up untested — added "a lock granted after the give-up is released once; nothing written", `tests/ui/autosave.test.ts:880`.
  - `[false]` `[reject]` (blind) `HOLDER_FALLBACK` shared mutable object — `SaveLock` fields are `readonly`; no caller mutates it.
  - `[low]` `[patch]` (blind) read-only first-Postcard test doesn't assert `persisted` — added, `tests/ui/storage-notice.test.ts:396`; options reduced to `{ grant: true }`.
  - `[low]` `[reject]` (blind) `bootPastTimeout` duplicates the existing timeout setup — test-only taste.
  - `[low]` `[reject]` (blind) R23 test checks three things in one `it` — reordered for correctness; splitting adds three boots for no new coverage.
  - `[low]` `[patch]` (blind) boot doc comment not updated — added the give-up write rule, `src/ui/boot.tsx`.
  - `[low]` `[patch]` (blind) aborted-branch comments imply the result drives the page — reworded, `src/persistence/store.ts`.
  - `[false]` `[reject]` (blind) spec bookkeeping unfinished — fix edits this build's spec; logs are filled here.
  - `[low]` `[patch]` (edge) in-flight defaults write after give-up — residual documented (row 2).
  - `[low]` `[patch]` (edge) `gaveUp` set only after the `withTimeout` await resumes — now set in the timer callback (`onTimeout`), `src/ui/boot.tsx`.
  - `[false]` `[reject]` (edge) migrated guard unreachable — duplicate of the verification-gap other finding.
  - `[medium]` `[patch]` (edge) viewer assertion vacuous — same patch.
  - `[false]` `[reject]` (edge) late-load cases pass with the new guards removed — they pin the existing early return (E4), not the new guards; the late-backup test pins the new guard.
  - `[false]` `[reject]` (edge) Always overclaim — duplicate of row 2 (documented residual).

**Close-out (process item 8):** every patch row confirmed landed at its file:line; full suite 1276/1276, lint and build clean after patching.

## Design Notes

A backup that has already started is allowed to finish after give-up: it only copies the unreadable value aside, never touches the main key, and the next launch simply backs up again (harmless extra copy, retro E6 territory).

## Verification

**Commands:**
- `npm test` -- expected: all pass
- `npm run lint` -- expected: clean
- `npm run build` -- expected: success

## Auto Run Result

Status: done

- **Summary:** TS-42: after the 3 s start-up timeout gives up, start-up never starts a main-key write (`settleLoad` `aborted` check; `gaveUp` set the moment the timer fires), so unreadable data is no longer replaced by defaults and the next launch shows the unreadable notice. TS-44: tests for every boot timeout branch, the read-only first-Postcard `persist()` guard and restore normalisation; one `isObject`, one `HOLDER_FALLBACK`.
- **Files:** `src/persistence/store.ts` (aborted check, docs); `src/ui/boot.tsx` (onTimeout, single release after give-up, docs); `src/persistence/lock.ts` (`HOLDER_FALLBACK`); `src/persistence/document.ts`, `migrations.ts` (one `isObject`); tests in `tests/persistence/store.test.ts`, `tests/ui/autosave.test.ts`, `tests/ui/storage-notice.test.ts`.
- **Review:** 25 findings (4 layers); 7 patch entries applied (1 medium, 6 low), 0 deferred, rest rejected with reasons above.
- **Follow-up review recommended:** false (no high; one medium patched).
- **Verification:** `npm test` 1276/1276, lint clean, build ok; implementer mutation-checked each guard.
- **Residual risks:** a main-key write already in flight when the timeout fires cannot be cancelled and may land (window: one small IndexedDB write at the 3 s mark). The real `navigator.locks` path stays untested in jsdom.
