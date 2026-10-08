---
title: 'Story 4.4: Storage notice and keeping your data'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_revision: 'f43f1767694a757992194af96b0e73155b51616c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-safe-across-versions-and-tabs.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-3-play-offline-and-update-gently.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Players are never told their Album lives only in this browser, and the game never asks the browser to keep it, so Safari can silently erase a journey after seven days away.

**Approach:** Add `meta.seenStorageNotice` and `meta.persistGranted` to the saved document through the first real migration (schema v1 → v2). Show the storage notice until "Got it"; on "Got it" save the flag and request `navigator.storage.persist()`, storing the result; ask again after the first Postcard if not granted; on a Safari refusal show the Add to Dock banner; at start record an already-granted `persisted()`. Complete the banner priority order.

## Boundaries & Constraints

**Always:**
- `SCHEMA_VERSION` becomes 2. `MIGRATIONS[1]` (v1 → v2) adds `meta.seenStorageNotice: false` and `meta.persistGranted: null` and changes nothing else; `MIGRATIONS[0]` stays a step that makes a v0 document unreadable (no v0 ever shipped). A stored v1 document loads as v2, is written back once by the lock holder (Story 4.2 path), and keeps every Postcard and Session.
- `Meta = { lastPlayedKey, seenStorageNotice: boolean, persistGranted: boolean | null }`; `fromDocument` validates both; `createInitialState()` defaults `false` / `null`.
- Storage notice: pending while `meta.seenStorageNotice` is false. Copy "Your Album lives in this browser only. Clearing browser data erases it." · "Got it", info edge. Non-blocking: Album slots, nav and the grid work while it shows; it follows the 4.2 placement (under the header above the Album slots; top of the side column on the Puzzle screen, so it moves there if a Puzzle opens first).
- "Got it" on the storage notice dispatches `storageNoticeAcknowledged` → `meta.seenStorageNotice: true` (saved); focus to the grid or the page heading; then the shell requests `persist()` and dispatches `persistResolved { granted, safari }` → `meta.persistGranted = granted`; refused and `safari` → `ui.addToDockPending: true`.
- Add to Dock banner: copy "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it." · "Got it", info edge; shown only on a Safari refusal; "Got it" dismisses it for the page. Never on other browsers.
- First Postcard: when "Add to Album" makes the Album length 1 and `meta.persistGranted !== true`, the shell requests `persist()` again and dispatches `persistResolved` (same handling; on a Safari refusal the Add to Dock banner shows on the Album).
- At start (writable tab only): if `navigator.storage.persisted()` resolves true, dispatch `persistResolved { granted: true }` (sets `persistGranted` true; no Safari banner again).
- `persist`/`persisted` missing or rejecting count as refused / not persisted, without error. They live only in `src/persistence/` (storage guard already covers `navigator.storage`).
- Safari detection is one pure function over the user agent (Safari, not Chrome/Chromium/Edge/Firefox/Android, iOS included), injectable for tests, outside `persistence/`.
- Banner priority (final): read-only > save failed > unreadable > storage notice > Add to Dock > update ready. A unit test covers the visible banner for every pair.
- Read-only tab: the storage notice still shows (below read-only); its "Got it" only hides it for the page (the read-only guard refuses the `meta` change) and no `persist()` is requested; no start-up `persisted()` write.

**Never:**
- No blocking of play, no modal, no repeated storage notice once `seenStorageNotice` is true.
- No `persist()` request before "Got it" or the first Postcard.
- No Add to Dock banner on a grant, on non-Safari browsers, or when `persist` is unavailable outside Safari.
- No change to Postcard, Session or Settings data in the migration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First launch | no saved data | Album, Europe, "Where to first?", storage notice above the slots; "Travel here" works | none |
| Notice then Puzzle | notice showing, player opens a Near City | notice at the top of the side column; grid in place | none |
| Got it, granted | Chrome, persist → true | `seenStorageNotice` true, `persistGranted` true (saved); no further banner | none |
| Got it, Safari refused | Safari UA, persist → false | `persistGranted` false; Add to Dock banner | none |
| Got it, other refused | Firefox UA, persist → false | `persistGranted` false; nothing shown | none |
| No API | `navigator.storage.persist` missing | treated as refused; Safari → banner, else nothing | no throw |
| First Postcard | `persistGranted` false, "Add to Album" on the first Postcard | persist requested again; Safari refusal → Add to Dock banner on the Album | none |
| Already persisted | start, `persisted()` → true | `persistGranted` true; no Safari banner later | none |
| Notice seen | `seenStorageNotice` true | no storage notice | none |
| v1 save | stored v1 document | loads as v2 with `seenStorageNotice` false, `persistGranted` null; written back; Postcards and Sessions intact | none |
| Pending pairs | any two banners pending | the higher by the final order; the next appears after dismissal | none |
| Read-only | other tab, notice pending | read-only banner first; after its "Got it", the storage notice; its "Got it" hides it, no persist, nothing written | none |

</intent-contract>

## Code Map

- `src/persistence/document.ts` -- `SCHEMA_VERSION` (1 → 2), `fromDocument` `meta` validation, `toDocument` `meta` copy.
- `src/persistence/migrations.ts` -- `MIGRATIONS` (index = from-version); add index 0 (throws: no v0) and index 1 (v1 → v2).
- New `src/persistence/storage-persist.ts` -- `requestPersist(storage = navigator.storage): Promise<boolean>`, `isPersisted(...)`: missing API or rejection → false.
- `src/game/types.ts` -- `Meta`, `UiState` (`addToDockPending: boolean`), `BannerKind` (`storageNotice`, `addToDock`), `Action` (`storageNoticeAcknowledged`, `persistResolved`).
- `src/game/session.ts` -- `createInitialState` defaults.
- `src/game/reducer.ts` -- handle the two actions; `bannerDismissed` for `storageNotice` dispatches the acknowledgement path in the UI (keep `bannerDismissed` UI-only).
- `src/game/banners.ts` -- final priority list and `pending` cases.
- `src/content/copy.ts` -- the two strings.
- `src/ui/app.tsx` -- banner "Got it" mapping (storage notice → `storageNoticeAcknowledged`), effects: after acknowledgement (when `seenStorageNotice` flips true and the tab is writable) request persist; after the first Postcard is added request again; at mount `persisted()`; inject `persist`, `persisted`, `isSafari` via props (defaults from persistence and the UA helper).
- New `src/ui/browser.ts` -- `isSafari(userAgent = navigator.userAgent)`.
- `tests/persistence/migrations.test.ts`, `store.test.ts`, `tests/ui/autosave.test.ts` -- existing v0 → v1 fixtures assume `SCHEMA_VERSION` 1; update them to the real chain (inject steps or target explicitly).

## Tasks & Acceptance

**Execution:**
- `src/persistence/document.ts`, `migrations.ts`, `storage-persist.ts` -- v2 document, migration, persist helpers.
- `src/game/types.ts`, `session.ts`, `reducer.ts`, `banners.ts`, `src/content/copy.ts` -- state, actions, priority, copy.
- `src/ui/browser.ts`, `src/ui/app.tsx`, `src/ui/boot.tsx` -- Safari check, effects, banner wiring.
- `tests/game/banners.test.ts` -- every pair of the six kinds.
- `tests/persistence/*` -- v1 → v2 migration with a real v1 fixture (Postcards, Sessions, Settings carried), persist helpers (missing, rejecting).
- `tests/ui/storage-notice.test.ts` -- every matrix row through `boot()`/App with fake persist/persisted/isSafari, incl. the full UX-DR70 first-launch flow and focus after each "Got it".
- `tests/ui/browser.test.ts` -- Safari detection over sample UAs (macOS Safari, iOS Safari, Chrome, Edge, Firefox, Android Chrome).
- `tests/ui/contrast.test.ts` -- unchanged token pairs (info edge already covered); add if a new pair appears.

**Acceptance Criteria:**
- Given the built app in headless Chrome with no saved data, when the player chooses "Got it" and then a Near City, then the notice disappears, `seenStorageNotice` is saved, no Add to Dock banner shows (Chrome), the Puzzle opens, and a reload shows no notice; no console errors.
- Given a stored v1 document from Story 4.3's build, when the new build loads it, then it shows the same Album and Puzzles and the stored document becomes `schemaVersion: 2`.

## Design Notes

- **Schema v2 (decision):** new saved `meta` fields go through a real migration instead of optional v1 fields, so an older build never silently drops them; it is also the first exercise of Story 4.2's migration path. Story 4.3's deferred "newer schema behind an old worker" risk applies to this bump only after a hard reload past the worker; recorded there.
- **Unreadable ranks above the storage notice:** both are informational, but "we couldn't read your saved progress" explains an empty Album and must come first.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.

**Manual checks:**
- Both ACs above in headless Chrome over CDP (`vite preview`); for the v1 case, seed IndexedDB with a v1 document through the page before loading the new build.

## Auto Run Result

Status: done

**Summary:** the Album now shows "Your Album lives in this browser only. Clearing browser data erases it." until the player chooses "Got it", without blocking play. "Got it" saves `meta.seenStorageNotice` and asks the browser to keep the data (`navigator.storage.persist()`), storing the answer in `meta.persistGranted`; the first Postcard asks again if not granted; an already-granted (or dropped) grant is recorded at start. Desktop macOS Safari 17+ that refuses shows "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it."; other browsers show nothing. The two new saved fields arrive through the first real migration (schema v1 → v2). The banner order is final: read-only > save failed > unreadable > storage notice > Add to Dock > update ready.

**Files changed:**
- `src/persistence/document.ts`, `migrations.ts`, `storage-persist.ts` (new) -- schema v2, v1 → v2 migration, persist helpers
- `src/game/types.ts`, `session.ts`, `reducer.ts`, `banners.ts`, `src/content/copy.ts` -- `meta` fields, `addToDockPending`, two actions, final priority, copy
- `src/ui/browser.ts` (new), `src/ui/app.tsx`, `src/ui/boot.tsx`, `src/ui/notice-banner.tsx` -- Safari check, persistence effects, banner wiring
- `tests/**` -- banner pairs, migration, persist helpers, Safari detection, storage-notice flows; updated fixtures for schema v2

**Review:** 27 findings. 9 patch entries applied (1 medium, 8 low); 0 deferred; the rest rejected with reasons in the triage log.

**Follow-up review recommended:** false. One medium entry was patched (the Safari platform check), and nothing high.

**Verification:** `npm run lint` clean; `npm test` 64 files, 1256 tests pass; `npm run build` ok, precache 7 entries. Before the patches, headless Chrome on `vite preview`: first visit showed the notice above the slots; "Got it" saved `seenStorageNotice`, focused the heading; headless Chrome refused persistence and no Add to Dock banner showed; Paris opened; a reload showed no notice. A hand-written v1 document in IndexedDB loaded as v2 with Postcards and Sessions byte-identical, half-finished Paris reopened, and the notice showed.

**Residual risks:** the Safari path (real refusal, banner) is tested only with fakes; this is the first schema bump, so Story 4.3's deferred "newer schema behind an old worker" risk now applies after a hard reload; after an unreadable-data reset the notice shows again (the defaults have it unseen).
