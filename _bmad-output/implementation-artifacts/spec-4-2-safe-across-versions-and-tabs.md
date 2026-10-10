---
title: 'Story 4.2: Safe across versions and tabs'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_revision: '826f3b9d164db4b2677504c6fbddd57305cc2347'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-1-autosave-and-restore.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Story 4.1 saves and restores, but a newer-version document, unreadable data, a second open tab or a failed write can still silently lose or overwrite the player's journey, and the player is never told.

**Approach:** Extend `src/persistence/` with forward migrations, a never-overwritten backup key and a non-blocking Web Lock (`traveller-save`) so only one tab writes. Surface every protective state through one inline notice-banner component (one banner at a time, by priority) driven by new `ui` fields (`readOnly`, `saveFailed`, `unreadableNotice`, dismissals) and reducer actions; a read-only tab refuses every change to a saved slice.

## Boundaries & Constraints

**Always:**
- Only `src/persistence/` touches storage, `navigator.locks` included (extend the architecture guard to `navigator.locks`).
- Boot order: request the lock (`ifAvailable: true`, never waits), load, migrate, then decide: holder → may write; non-holder → read-only (`otherTab`), never writes, still shows the saved state.
- Migrations: an ordered list, one version step at a time, run before `fromDocument`; a migrated document is written back once (only by the lock holder).
- `schemaVersion` newer than the code → read-only (`newerVersion`); the stored value is never written (byte-for-byte unchanged).
- Unreadable (invalid shape, failed validation, or a migration that throws): the raw value is copied first to a new backup key (`traveller-save-backup-<ISO timestamp>`, never reused or overwritten), then the app starts from defaults with the unreadable banner on the Album and normal saving. If the backup write fails, or the load fails or hangs (4.1's timeout), the tab is read-only (`storageUnavailable`) and shows the unreadable banner text. *(Superseded by TS-43 (spec-ts-43-play-without-saving.md): this case now plays on in memory with saving off and its own banner, not read-only; annotated 2026-10-09, TS-48.)*
- Read-only (any cause): the reducer returns the previous state for any action whose result changes `album`, `sessions`, `settings` or `meta` (UI-only changes still apply, so opening an existing Puzzle or the viewer works); grid, side column (pad, action row, Hint) and Settings toggles are `inert`; Hint is unavailable; nothing is ever written.
- Save failed: a rejected write dispatches `saveFailed` → `ui.saveFailed` true, the banner shows and the live region announces it once per false→true transition; a later successful write dispatches `saveSucceeded` → clears it and the banner. The next saved-slice change retries (4.1 saver).
- Banner: inline, non-modal; `card` background, 1px `rule-thin` border, 4px left edge `postmark` (info) or `airmail-red` (save failed), `body` `ink` text, exactly one text button "Got it" ≥ 24×24px. Puzzle screen: top of the side column; elsewhere: full content width directly under the header, pushing content down. Never overlays the grid. Priority in this story: read-only > save failed > unreadable. "Got it" hides that banner (a read-only tab stays read-only) and moves focus to the grid tab-stop on the Puzzle screen, else the page heading.
- All banner strings live in `src/content/copy.ts`, verbatim from the ACs.

**Never:**
- No `alert()`, modal, toast or overlay; no reload triggered by the app.
- No storage notice, Add to Dock banner, `persist()` or update banner (Stories 4.3/4.4), but the banner picker takes a priority list Story 4.4 can extend.
- Never write the main key or a backup from a non-holder tab or after `newerVersion`.
- Never overwrite an existing backup key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Migrate | stored v0 doc, fake v0→v1 migration | loads as v1, every Postcard and Session carried; v1 written back once by the holder | none |
| Newer | stored `schemaVersion: 2` | defaults shown (the newer document can't be read) *(as built: the saved state shows read-only when it still reads as this version's document, else defaults; the Spec Change Log cited below was never written. Epic 4 retro R6; `src/persistence/store.ts:60-63`; annotated 2026-10-09, TS-48)*, read-only, "A newer version saved your progress. Reload to carry on."; stored value byte-for-byte unchanged | no writes ever |
| Unreadable | invalid doc | backup key holds the raw value; defaults; unreadable banner on Album; later changes save to the main key | none |
| Backup fails | invalid doc, backup `set` rejects | read-only, unreadable banner text, nothing written *(Superseded by TS-43 (spec-ts-43-play-without-saving.md): saving off, not read-only; annotated 2026-10-09, TS-48.)* | no throw |
| Migration throws | v0 doc, migration throws | treated as unreadable (backup, defaults, banner) | no throw |
| Second tab | lock not available | saved state shown, read-only, "Traveller Sudoku is open in another tab…" | no writes ever |
| Locks API missing | `navigator.locks` undefined | tab treated as holder | none |
| Read-only input | readOnly, digit typed / City chosen / setting toggled | state unchanged, nothing written | none |
| Read-only browse | readOnly, open existing Puzzle via nav or "Carry on" | Puzzle visible, grid inert, Hint unavailable | none |
| Save fails twice | two rejected writes | one banner, one announcement | no alert |
| Save recovers | failure then success | `saveFailed` false, banner gone; a later failure shows and announces again | none |
| Two pending | readOnly + saveFailed | only the read-only banner | none |
| Dismiss | "Got it" on Puzzle / Album | banner hidden; focus to grid / heading; read-only stays | none |

</intent-contract>

## Code Map

- `src/persistence/store.ts` -- `SaveStore` (`load`/`save`), `loadSaved`, `createSaver`, `SAVE_KEY`. Extend the store with `saveBackup(key, raw)` (or a generic `set`) and have `loadSaved` return `{ kind: 'empty' | 'loaded' | 'migrated' | 'newer' | 'unreadable', slices?, raw? }`. The saver must report failure/success to a callback (today it swallows).
- `src/persistence/document.ts` -- `SCHEMA_VERSION`, `fromDocument`. New `src/persistence/migrations.ts`: `MIGRATIONS: ((doc) => doc)[]` indexed by from-version (empty in production; tests inject a v0→v1).
- New `src/persistence/lock.ts` -- `acquireSaveLock(): Promise<boolean>` via `navigator.locks.request('traveller-save', { ifAvailable: true }, cb)`; when granted, `cb` returns a promise that never settles (held for the page's life); missing API → true.
- `src/ui/boot.tsx` -- `boot(store, rootEl, html)` and `loadWithTimeout`: sequence lock → load → migrate/backup → initial `ui` flags → render. Inject the lock function for tests.
- `src/ui/app.tsx` -- props `loaded`, `store`, `saving`; autosave effect + `createSaver`. Replace `saving` with an initial `ui` overlay (readOnly reason, unreadableNotice) and dispatch `saveFailed`/`saveSucceeded` from the saver callback. Banner slot directly under `<header>` for non-Puzzle screens.
- `src/ui/puzzle-screen.tsx:93-95` -- grid `inert` and `.side-column` `inert` (reveal); add read-only to both; banner goes first inside `.side-column`. Hint button disabled when read-only.
- `src/ui/settings-screen.tsx` -- toggles inert when read-only.
- `src/game/types.ts` -- `UiState` (add `readOnly: 'newerVersion' | 'otherTab' | 'storageUnavailable' | null`, `saveFailed: boolean`, `unreadableNotice: boolean`, `dismissed: readonly BannerKind[]`), `Action` union (add `saveFailed`, `saveSucceeded`, `bannerDismissed`).
- `src/game/session.ts:48-75` -- `createInitialState()` defaults for the new `ui` fields.
- `src/game/reducer.ts:206` `reducer` -- add the read-only guard (wrap: if `ui.readOnly` and any saved slice reference changed, return `state`).
- `src/game/announce.ts:104` `withAnnouncement` -- announce the save-failed copy on the false→true transition only.
- New `src/game/banners.ts` -- pure `visibleBanner(ui): BannerKind | null` over an ordered priority list.
- New `src/ui/notice-banner.tsx` (+ CSS in `src/ui/controls.css` or a new `banner.css`) -- the component; theme tokens `--color-postmark`, `--color-airmail-red`, `--color-rule-thin`, `--rule-thin` exist in `theme.css`.
- `src/content/copy.ts` -- banner strings.
- `tests/architecture/check-architecture.ts` `checkStorageBoundary` -- add `navigator.locks`.
- `tests/ui/autosave.test.ts` -- `boot()` tests and the fake store pattern; extend for lock/backup/migration/read-only.
- `tests/ui/contrast.test.ts` -- add banner text and edge pairs (both themes).

## Tasks & Acceptance

**Execution:**
- `src/persistence/migrations.ts`, `document.ts`, `store.ts`, `lock.ts` -- load pipeline, backup, saver outcome callback, lock -- the protective core.
- `src/game/types.ts`, `session.ts`, `reducer.ts`, `announce.ts`, `banners.ts` -- new `ui` fields, actions, read-only guard, one-time announcement, banner priority.
- `src/content/copy.ts` -- the four banner strings and "Got it".
- `src/ui/notice-banner.tsx` + CSS -- the banner.
- `src/ui/app.tsx`, `boot.tsx`, `puzzle-screen.tsx`, `settings-screen.tsx` -- wiring, placement, inert, focus on dismiss.
- `tests/architecture/*` -- `navigator.locks` in the storage guard.
- `tests/persistence/*` -- migrations (fake v0, throwing migration), newer untouched byte-for-byte, backup key written before anything else and never reused, backup failure, saver outcome callbacks.
- `tests/game/banners.test.ts`, `tests/game/read-only.test.ts` -- priority for every pair; reducer refuses saved-slice changes and allows UI-only ones.
- `tests/ui/notice-banner.test.ts`, `tests/ui/autosave.test.ts` -- every matrix row through `boot()`/App: placement (side column vs under header), one banner, focus on dismiss, inert grid/side column/Settings, Hint unavailable, save-failed announced once and cleared on success, second-tab with a fake lock.
- `tests/ui/contrast.test.ts` -- banner pairs.

**Acceptance Criteria:**
- Given a file outside `src/persistence/` that references `navigator.locks`, when `npm test` runs, then the architecture test fails naming it.
- Given the built app open in two Chrome tabs, when the second tab loads, then it shows the other-tab banner, its grid is inert, and progress made in the first tab survives a reload of the first tab.

## Design Notes

- **`storageUnavailable`:** 4.1 turned saving off silently after a failed or hung load; this story makes that state visible as read-only with the unreadable banner text ("…kept safe, not overwritten."), which is accurate because nothing was touched. Chosen over a new string to keep the copy set to the ACs. *(Superseded by TS-43 (spec-ts-43-play-without-saving.md): this case now plays on in memory with saving off and its own banner, not read-only; annotated 2026-10-09, TS-48.)*
- **Unreadable priority:** the AC fixes only read-only > save failed; the unreadable notice is informational and ranks below both (Story 4.4 inserts its banners after save failed).
- **Read-only guard at the reducer** (not only `inert`) stops in-memory play that could never be saved (choosing a new City, Free Play, toggles via keyboard).

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.

**Manual checks:**
- `npm run build && npm run preview`, headless Chrome: (a) Story 4.1 follow-up: cold reload with Lamplight on → no console errors, `data-theme` set; (b) open a second tab → other-tab banner, grid inert; first tab still saves; (c) DevTools: set the stored `schemaVersion` to 99, reload → newer banner, value unchanged.

## Auto Run Result

Status: done

**Summary:** saved progress is now protected across versions and tabs. Only the tab holding the Web Lock `traveller-save` writes; a second tab, newer-version data or a failed or hung load *(superseded by TS-43 (spec-ts-43-play-without-saving.md): a failed or hung load now turns saving off, not read-only; annotated 2026-10-09, TS-48)* makes the tab read-only (the reducer refuses saved-slice changes; grid, side column and Settings inert; Hint unavailable) with its banner. Older documents migrate forward one version at a time and are written back once. Unreadable data is copied to a fresh `traveller-save-backup-<ISO>` key, never overwritten, before the app starts from defaults. Failed writes show the save-failed banner, announced once per failure, and clear on the next good write. One inline banner shows at a time by priority: read-only > save failed > unreadable.

**Files changed:**
- `src/persistence/migrations.ts`, `lock.ts` (new), `store.ts`, `document.ts` -- migrations, releasable lock, load/settle pipeline, backups, saver outcomes
- `src/game/types.ts`, `session.ts`, `reducer.ts`, `announce.ts`, `banners.ts` (new) -- `ui` notice fields, actions, read-only guard, one-time announcement, banner priority
- `src/ui/notice-banner.tsx`, `banner.css` (new), `app.tsx`, `boot.tsx`, `puzzle-screen.tsx`, `settings-screen.tsx`, `theme.css`, `settings.css` -- banner, placement, inert, focus, timed boot
- `src/content/copy.ts` -- banner strings and "Got it"
- `tests/**` -- architecture guard (`navigator.locks`), persistence, game and UI tests; contrast pairs

**Review:** 30 findings. 11 patch entries applied (4 medium, 7 low); 0 deferred; the rest rejected with reasons in the triage log. One spec amendment (newer-version restore; see Spec Change Log).

**Follow-up review recommended:** true. Four medium entries were patched. The unverified risk is the patched boot path in a real browser: the releasable lock across two real tabs (a `newerVersion` tab handing the lock to a fresh tab) and the read-only reveal, checked only with fakes since the patch.

**Verification:** `npm run lint` clean; `npm test` 57 files, 1137 tests pass; `npm run build` ok. Before the patches, headless Chrome on `vite preview`: second tab read-only with its banner and the first tab still saving; `schemaVersion` 99 → newer banner, value unchanged; corrupt document → backup key and unreadable banner; no console errors; Story 4.1's Lamplight reload confirmed (`data-theme` set).

**Residual risks:** a start-up write already in flight when the 3 s timeout fires can still land; the Story 4.1 pre-ready Canvas frame (deferred there) still stands; a tab with unreadable data now writes the defaults once at start-up.
