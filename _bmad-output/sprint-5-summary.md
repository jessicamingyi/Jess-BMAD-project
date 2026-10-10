---
title: 'Traveller Sudoku: Sprint 5: Never lose your journey, release v1 (Fri 9 Oct 2026)'
sprint: 5
status: done
updated: '2026-10-09'
---

# Traveller Sudoku: Sprint 5: Never lose your journey, release v1 (Fri 9 Oct 2026)

**Goal:** a durable, offline v1 on the web.
**Tickets:** 5 (TS-34 to TS-37, and TS-40). **Progress:** 5 / 5 done. Epic 4 complete: Stories 4.1 to 4.4 were built early, on Thu 8 Oct. The Postcard lines (TS-40) are written and approved. Release v1 (TS-38) and the retrospective (TS-39) moved to Sprint 6 (test, harden and release).

- **Epic 4, Stories 4.1 to 4.4:** autosave and restore; safe across versions and tabs; offline play and gentle updates; storage notice and keeping your data.
- **Release v1:** no placeholders, deploy gate green, smoke test offline and on Safari.
- **Retrospective** (`bmad-retrospective`).

**Done when:** your Album survives a reload, going offline, a new version and a second tab, and v1 is live.
**Risks:** Story 4.2 is the largest; split it if Sprint 4 overruns into Sprint 5.

- **TS-34 Story 4.1, Autosave and restore:**
  - **Saving:** the Album, every Puzzle (digits and Notes), Settings and the last-played Puzzle save to IndexedDB after every change; selecting cells, Hint steps and other screen-only actions never write. Only `src/persistence/` may touch storage, and the architecture test enforces it.
  - **Restoring:** saved progress loads before the first screen; the launch rule from Story 3.5 and an unrevealed Postcard now work on a real reload. Lamplight is applied before anything paints. Undo starts empty.
  - **Safety:** unreadable saved data, a failed load or a load that hangs for 3 s starts from defaults and never overwrites what is stored (Story 4.2 adds the notice).
  - **Retro fold-in:** a solved City's Postmark shows the date its Postcard was collected.
  - **Built with `bmad-build-auto`** (no checkpoints): 4 review layers, 31 findings, 6 fixes (start-up code now tested, load timeout, storage-guard gaps), 1 deferred (a possible blank system-coloured frame before load on a light OS); one headless Chrome check.

- **TS-35 Story 4.2, Safe across versions and tabs:**
  - **One writer:** only the tab holding the `traveller-save` lock saves. A second tab shows "Traveller Sudoku is open in another tab…", keeps the Puzzle visible but not editable, and never writes.
  - **Newer or unreadable data:** a newer version's save makes the tab read-only and is never touched. Unreadable data is copied to a backup key first, then the game starts fresh with "We couldn't read your saved progress. It's been kept safe, not overwritten."
  - **Failed saves:** "Your last change couldn't be saved…" shows and is announced once; the next good save clears it. Older saves migrate forward one version at a time.
  - **Notice banner:** one inline banner at a time, by priority, with a single "Got it"; it never covers the grid.
  - **Built with `bmad-build-auto`:** 4 review layers, 30 findings, 11 fixes (a read-only tab stuck behind a Postcard reveal or on Free Play "generating", the lock released by tabs that can't write, newer-version data shown read-only), one spec correction; headless Chrome check of two tabs, newer and corrupt data.

- **TS-36 Story 4.3, Play offline and update gently:**
  - **Offline:** after one online visit the whole game works with no network: saved progress, every City Puzzle and Free Play generation. A service worker (`vite-plugin-pwa`, `generateSW`) precaches the full build; nothing is fetched from another site.
  - **Gentle updates:** a new version waits until every tab is closed; meanwhile "A new version is ready. It arrives next time you open the game." shows as the lowest-priority banner. The game never reloads itself. A tab coming back into view checks for a new deploy.
  - **Built with `bmad-build-auto`:** 4 review layers, 19 findings, 5 fixes (a build test that the real bundle registers the worker, every built file precached, the update check for long-open tabs), 2 deferred (install icons for Add to Dock, a future schema v2 behind an old worker); headless Chrome offline and update checks.

- **TS-37 Story 4.4, Storage notice and keeping your data:**
  - **Storage notice:** "Your Album lives in this browser only. Clearing browser data erases it." shows on first launch above the Album slots (or at the top of the side column in a Puzzle) without blocking play, until "Got it".
  - **Keeping your data:** "Got it" asks the browser to keep the Album (`navigator.storage.persist()`); the first Postcard asks again if it wasn't granted; a grant the browser already gave (or dropped) is recorded at start.
  - **Safari:** on desktop macOS Safari 17+, a refusal shows "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it."; other browsers show nothing.
  - **Saved data v2:** the two new fields arrive through the first real migration; existing saves load and are rewritten as v2 with every Postcard and Puzzle intact. The banner order is now complete.
  - **Built with `bmad-build-auto`:** 4 review layers, 27 findings, 9 fixes (Add to Dock limited to desktop macOS Safari 17+ that isn't already installed, rejected storage calls handled, a dropped grant corrected); headless Chrome first-launch and v1-save checks.

- **Fri 9 Oct (Jessica away; Claude took recommended defaults):**
  - **Epic 4 merged:** fast-forwarded into `main` and pushed (e8f001c), CI green.
  - **Epics 1–3 retro fixes** (branch `fix/epics-1-3-retro-actions`, 3f561c8), built with `bmad-build-auto`:
    - A Free Play reply no longer swaps the grid under a player who went back to the old Free Play.
    - The Hint key caption now has readable contrast.
    - The solve date is read at the moment of the solve.
    - `reducer.ts` is split into areas (762 → 131 lines).
    - 4 review layers, 23 findings, 4 small fixes.
  - **Epic 4 retrospective** (`implementation-artifacts/epic-4-retro-2026-10-09.md`, 5910fd3), verdict **accepted with open items**:
    - All 6 player journeys passed in headless Chrome.
    - Open items: a rare start-up timeout race (E1), and storage-unavailable leaving the game read-only (E2).
    - The Epic 4 specs lost their triage logs.
    - 9 new action items.
  - **TS-40 Postcard lines drafted** (branch `content/ts-40-postcard-lines`, 9975643): 29 lines in Lisbon's voice. The deploy gate now passes on that branch. **Approved by Jessica** the same day; TS-40 is done.

## Tickets done (5 / 5)

| ID | Ticket | Type | Size | Owner | Status | Done on |
|---|---|---|---|---|---|---|
| TS-34 | [Story 4.1: Autosave and restore](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Thu 8 Oct (early) |
| TS-35 | [Story 4.2: Safe across versions and tabs](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Thu 8 Oct (early) |
| TS-36 | [Story 4.3: Play offline and update gently](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Thu 8 Oct (early) |
| TS-37 | [Story 4.4: Storage notice and keeping your data](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Thu 8 Oct (early) |
| TS-40 | [Write the 30 Postcard lines](planning-artifacts/cities.md) | Content | M | Jessica + Claude | Done | Fri 9 Oct |

## Moved to Sprint 6

| ID | Ticket | Why |
|---|---|---|
| TS-38 | Release v1 | A testing and hardening sprint goes first (see [Sprint 6](sprint-6-summary.md)). |
| TS-39 | Retrospective | The Epic 4 retrospective ran on 9 Oct; the final MVP retrospective follows the release. |
