---
title: 'Traveller Sudoku: Sprint 5: Never lose your journey, release v1 (Fri 9 Oct 2026)'
sprint: 5
status: in-progress
updated: '2026-10-08'
---

# Traveller Sudoku: Sprint 5: Never lose your journey, release v1 (Fri 9 Oct 2026)

**Goal:** a durable, offline v1 on the web.
**Tickets:** 6 (TS-34 to TS-39). **Progress:** 2 / 6 done. Stories 4.1 and 4.2 were built early, on Thu 8 Oct.

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

## Tickets done (2 / 6)

| ID | Ticket | Type | Size | Owner | Status | Done on |
|---|---|---|---|---|---|---|
| TS-34 | [Story 4.1: Autosave and restore](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Thu 8 Oct (early) |
| TS-35 | [Story 4.2: Safe across versions and tabs](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Thu 8 Oct (early) |

## Tickets not done yet (4)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-36 | [Story 4.3: Play offline and update gently](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | To do | Story 4.1 |
| TS-37 | [Story 4.4: Storage notice and keeping your data](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | To do | Story 4.2 |
| TS-38 | Release v1: no placeholders, deploy gate green, offline + Safari smoke test | Chore | S | Jessica + Claude | To do | All stories |
| TS-39 | Retrospective (bmad-retrospective) | Chore | S | Jessica + Claude | To do | Release v1 |

---
Tickets and status: [backlog.md](implementation-artifacts/backlog.md) · visual board: [board.html](implementation-artifacts/board.html)
