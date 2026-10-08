# Epic 4 Context: Never lose your journey

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make the journey built in Epics 1–3 durable. The Album, every half-finished City Puzzle, the current Free Play Puzzle and Settings save automatically and survive reloads, browser restarts, going offline, new versions and a second tab. The player is told calmly where their data lives, the game asks the browser to keep it (with a Safari "Add to Dock" tip), and save failures, read-only tabs, unreadable data and waiting updates show as calm inline notices. The brief's core promise is "never lose progress", and this epic delivers it.

## Stories

- Story 4.1: Autosave and restore
- Story 4.2: Safe across versions and tabs
- Story 4.3: Play offline and update gently
- Story 4.4: Storage notice and keeping your data

## Requirements & Constraints

- **Autosave:** every change to a started City Puzzle or the Free Play Puzzle (digits and Notes), to Settings (Assists, Lamplight, last Free Play Difficulty) or to the Album is saved automatically and survives reload and browser restart. Undo history is not kept across reloads. Settings now persist, replacing the reset-on-reload behaviour from Epic 1, and Lamplight must apply before first paint with no Daylight flash.
- **Never lose progress:** older saved data is migrated forward, never discarded. Newer-version or unreadable data is never overwritten.
- **Offline:** after the first visit the whole game (shell, 30 City Puzzles, Postcard lines, Technique texts, Free Play worker) works with no network, including after a new version is deployed. Updates never interrupt or reload a session.
- **Durable storage:** request persistent storage and surface every save failure as a non-modal notice while play continues. No browser alerts.
- **Storage notice:** shown once on first launch: data lives in this browser only, and clearing browser data erases it.
- **Calm and private:** nothing overlays an in-progress grid, there are no modals or toasts, and no third-party requests (`default-src 'self'` CSP must stay violation-free). No data leaves the browser.
- **Known limitation:** desktop Safari usually refuses persistence unless the game is added to the Dock, and can erase data after 7 days away. Backup/export is out of scope.

## Technical Decisions

- **Persistence boundary:** only `src/persistence/` (`document`, `migrations/`, `save-lock`, `storage-persist`) may import `idb-keyval` (6.3) or touch `indexedDB`, `localStorage` or `navigator.storage`, and the architecture test enforces this. The `persistence` → `game` direction is allowed. The pure core still never touches storage, `Date` or randomness.
- **Document:** `toDocument`/`fromDocument` own the shape `{ schemaVersion: 1, album, sessions, settings, meta }`, with `givens`/`solution`/`digits` as 81-char digit strings and `notes` as 81 numbers (9-bit masks). `ui` (`hint`, `undo`, `saveFailed`, `readOnly`, `updateReady`) is never saved. The whole document is written to IndexedDB under one key.
- **When to write:** only after an action changes `album`, `sessions`, `settings` or `meta`. Actions that change only `ui` never write. Writes are serialised in order, so the latest state wins. A first visit writes nothing until a saved slice changes.
- **Load:** the document is loaded before the first render, and the existing launch rule and the unrevealed-Postcard re-show (Epic 3) then apply unchanged. `meta` holds `seenStorageNotice`, `persistGranted` and `lastPlayedKey`.
- **Migrations:** run forward one version at a time before `fromDocument`, then the migrated document is written back. If the stored version is newer than the code's, the tab sets `ui.readOnly`, never writes, and leaves the stored bytes untouched. For unreadable data (bad structure, failed validation, a migration that throws), the raw value is copied to a never-overwritten backup key and the app starts from an empty Album. If that backup copy fails, the tab goes read-only instead.
- **Single writer:** each tab requests the Web Lock `traveller-save` without waiting, and only the holder writes. Other tabs load and show saved state but are read-only.
- **Save failure:** sets `ui.saveFailed` and play continues. The next saved-slice change retries, and a successful write clears the flag.
- **PWA:** `vite-plugin-pwa` 2.0 (fallback 1.3), `generateSW`, `registerType: 'prompt'`, registered from bundled code (no inline script). The precache includes the shell, the generator worker, `cities.json`, `city-puzzles.json`, the Technique texts and the icons, and a build test asserts the content and worker are listed. There is no cross-origin runtime caching, and the service worker never touches IndexedDB. The app never calls `updateSW()`; a waiting worker only sets `ui.updateReady`, and the new version takes over once all tabs are closed. The manifest names "Traveller Sudoku", uses self-hosted icons from `public/`, and sets `start_url`/`scope` equal to the Vite `base` (`/<repo>/`).
- **Persistent storage:** `navigator.storage.persist()` is requested when the storage notice is dismissed, and again after the first Postcard if not yet granted. The result goes to `meta.persistGranted`. If `persist` is unavailable, treat it as refused without error. On start, `navigator.storage.persisted()` returning true sets `persistGranted`.

## UX & Interaction Patterns

- **Notice banner:** inline and non-modal: `card` background, 1px `rule-thin` border, a 4px left edge in `postmark` (info) or `airmail-red` (save failed), `body` `ink` text, and exactly one text button ("Got it"; no icons, no "×"), ≥ 24×24px. On the Puzzle screen it sits at the top of the side column so the grid never moves. Elsewhere it spans the content width under the header and pushes content down. Only one shows at a time, by priority: read-only > save failed > storage notice > persistence (Add to Dock) > update ready. The next pending banner appears once the visible one is resolved or dismissed.
- **Focus:** dismissing a banner moves focus to the grid (Puzzle screen) or the page heading elsewhere. Focus order is header nav → banner → content, or on the Puzzle screen grid → side column with the banner first.
- **Read-only tab:** grid, pad and Settings stay visible but `inert`, Hint is unavailable, and "Got it" hides the banner while the tab stays read-only.
- **Save failed:** announced once in the polite live region, never once per retry. Normal saves are never announced.
- **Microcopy (centralised strings):**
  - Storage: "Your Album lives in this browser only. Clearing browser data erases it."
  - Safari: "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it."
  - Save failed: "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here."
  - Other tab: "Traveller Sudoku is open in another tab. Play there, or close it and reload this one."
  - Newer version: "A newer version saved your progress. Reload to carry on."
  - Unreadable: "We couldn't read your saved progress. It's been kept safe, not overwritten."
  - Update: "A new version is ready. It arrives next time you open the game."
- **First launch:** Album on Europe, "Where to first?", storage notice above the slots. "Travel here" works while it shows, and if a Puzzle opens first the notice moves to the side column. "Got it" requests persistence, and the Add to Dock banner shows only on a Safari refusal.
- **Return offline:** the service worker serves the app, saved data loads, and the half-finished Puzzle opens exactly as left. Album slots show "Carry on" for in-progress Puzzles.

## Cross-Story Dependencies

- 4.1 establishes the persistence module, the document and the write pipeline. 4.2 adds the banner component, migrations, the Web Lock, read-only mode and save-failure handling on top of it. 4.3 (PWA) relies on 4.1 for offline restore and on 4.2's banner and migrations for update-ready and carry-forward. 4.4 adds the storage notice and Add to Dock banners and completes the five-level banner priority from 4.2.
- Builds on Epic 3: the launch rule (`lastPlayedKey`), unrevealed-Postcard re-show, "Add to Album" (which triggers the second `persist()` request) and the Album slot states. Builds on Epic 1: the Settings surface, Lamplight tokens, the Free Play worker, the architecture test, CI and the Vite `base`.
