# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-undo-and-restart.md`
  summary: Adopt a DOM test environment (e.g. jsdom + a mount helper) so focus moves and click/keyboard wiring in `src/ui` can be tested.
  evidence: Vitest runs in `node` with `renderToStaticMarkup` only, which never runs effects or handlers; the 1.4 focus hand-off (Keep going / Restart) and PuzzleScreen dispatch wiring can regress with all tests green. Story 1.5 (keyboard) is the natural place to adopt it.
  resolved: Story 1.5 adopted jsdom 30.1.2 with mounted DOM tests in `tests/ui/keyboard.test.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-keyboard-and-screen-reader.md`
  summary: Check in real browsers (Firefox especially) that Space on a grid cell in number-first places the current digit once, not place-then-clear via a native keyup click.
  evidence: `useKeyboard` prevents only the Space keydown; jsdom never fires native button activation, so tests can't show it. If a browser still clicks on keyup, `cellClicked` re-applies the digit and clears it (unverified, medium if true). Settle with a manual Firefox/Chrome check; fix by also preventing the matching keyup.
  verified 2026-10-07 in Chrome 155 / Edge 154 (headless smoke test); Firefox not checked. Firefox is out of MVP scope (Jessica, 2026-10-09): tracked as TS-52 after MVP.
  tracked: TS-52 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-technique-solver-and-grader.md`
  summary: Test that the header "Free Play · {Difficulty}" follows the session's Difficulty for Medium and Hard, not just Easy.
  evidence: Hardcoding `difficulty={'easy'}` in `src/ui/app.tsx` passed all UI tests (verification-gap review); only the Easy sample reaches App until Story 1.8 adds generated Medium/Hard Puzzles.
  resolved: Story 1.8 (e556c6f) tests the header for Medium and Hard in `tests/ui/free-play.test.ts:175-182`.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-city-catalogue.md`
  summary: Pin the `build-cities` retry-seed derivation (`${id}#1`…`#4`) with a test, for example a stubbed `generate` that fails on the plain id.
  evidence: The verification-gap review showed that dropping or reformatting the retry keys passes every test. Released City Puzzles are locked by the snapshot, so only Cities added later would silently get a different Puzzle.
  tracked: TS-60 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-autosave-and-restore.md`
  summary: A Lamplight player on a light OS may see a blank white system Canvas frame while the saved document loads (severity medium, unverified).
  evidence: `src/ui/theme.css:230-233` `html:not([data-ready])` uses `background-color: Canvas` with `color-scheme: light dark` (spec-4-1 Design Notes decision); the theme is only known once the document has loaded. Settle with a frame capture (DevTools Performance screenshots) on a light OS, Lamplight on, cold reload. Mirrored from spec-4-1 frontmatter `deferred` (Epic 4 retro P2, action 4).
  tracked: TS-54 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-play-offline-and-update-gently.md`
  summary: Install metadata is thin: one SVG icon, no PNG or apple-touch-icon, no manifest `id`, no `theme-color` meta.
  evidence: `vite.config.ts:51` lists only `favicon.svg`; `public/` holds only `favicon.svg`; `index.html:6` links only the SVG icon. Not a 4.3 AC; relevant to Safari Add to Dock (Story 4.4) and the v1 release. Mirrored from spec-4-3 frontmatter `deferred` (Epic 4 retro R10, P2, action 4).
  tracked: TS-50 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-play-offline-and-update-gently.md`
  summary: A tab hard-reloaded past the service worker can save a newer schema while other tabs stay on the old precached build, where the newer-version banner's "Reload to carry on." does not help (reloading under the old worker shows the same banner again; the fix is to close every tab).
  evidence: Trigger now met (refreshed 2026-10-09): spec-4-3 deferred this "until a schema v2 exists", and Story 4.4 shipped the v1 → v2 migration (`src/persistence/document.ts:5` `SCHEMA_VERSION = 2`; `src/persistence/migrations.ts` `MIGRATIONS = [fromV0, fromV1]`), listed only under spec-4-4 Residual risks (`spec-4-4…md:126`). The waiting worker never takes over while a tab is open (`vite.config.ts:59-60` `skipWaiting: false`, `clientsClaim: false`), and the copy says reload (`src/content/copy.ts:212` `bannerNewerVersion`). Severity low. Epic 4 retro E3, action 4.
  tracked: TS-55 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/epic-4-retro-2026-10-09.md`
  summary: Each launch makes another `traveller-save-backup-<ISO>` copy of unreadable data while the defaults write after the backup keeps failing, using more of the quota that likely caused the failure.
  evidence: `src/persistence/store.ts:130` backs up, `:138` writes the defaults, and `:141` returns `unreadableNotice` + `saveFailed` when that write fails, so the main key still holds the unreadable value and the next launch backs it up again. The loop ends at the first successful write (any later autosave writes the whole document). Only the success path is tested (`tests/ui/autosave.test.ts`). Severity low. Epic 4 retro E6, action 4.
  tracked: TS-57 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/epic-4-retro-2026-10-09.md`
  summary: A tab without the save lock that finds unreadable data starts from an empty Album, read-only (another tab), with no unreadable notice, so it cannot say why the Album looks empty.
  evidence: `src/persistence/store.ts:128` `if (!holder) return base` (no slices, `readOnly: 'otherTab'`, `unreadableNotice: false`); only the lock holder backs up and shows the notice. Epic 4 retro R8, action 4.
  tracked: TS-56 in the product backlog (backlog.md), 2026-10-09.

- source_spec: `_bmad-output/implementation-artifacts/mvp-retro-2026-10-13.md`
  summary: Accepted residual risk. If the 3 s start-up timeout fires while the defaults write after an unreadable-data backup is in flight, the write lands but this tab shows the saving-off banner ("Anything saved before is left untouched"); the next launch loads clean defaults with no unreadable notice. The data is kept in the backup key.
  evidence: `src/persistence/store.ts:135-140` (the `aborted()` check comes before the write), `src/content/copy.ts:214` `bannerSavingOff`. Needs unreadable data and a write at the 3 s edge. Severity low. MVP retro R2, accepted by Jessica on 2026-10-13.
  tracked: accepted, no ticket.

- source_spec: `_bmad-output/implementation-artifacts/mvp-retro-2026-10-13.md`
  summary: A save lock granted after the start-up give-up is never released when the load then hangs, so later tabs open read-only although no tab saves.
  evidence: `src/ui/boot.tsx:78-81` stores the late lock, the `finally` at `:88-90` never runs while `loadSaved` hangs, and the timeout callback (`:92-96`) ran while the lock was still null. Severity low. MVP retro R1.
  tracked: TS-64 in the product backlog (backlog.md), 2026-10-13.
