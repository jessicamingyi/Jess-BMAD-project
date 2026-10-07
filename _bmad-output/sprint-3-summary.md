---
title: 'Traveller Sudoku: Sprint 3: Play a calm Sudoku (Wed 7 Oct 2026)'
sprint: 3
status: in-progress
updated: '2026-10-07'
---

# Traveller Sudoku: Sprint 3: Play a calm Sudoku (Wed 7 Oct 2026)

**Goal:** a playable, live Free Play Sudoku.
**Tickets:** 10 (TS-15 to TS-24). **Progress:** 5 / 10 done.

- Readiness check (`bmad-sprint-planning`).
- **Epic 1, Stories 1.1 to 1.8:** project shell live on GitHub Pages; mouse play; Notes and number-first entry; Undo and Restart; keyboard and screen-reader play; Assists and Lamplight; Technique solver and grader; Free Play at a chosen Difficulty.
- **Creator:** write the 30 Cities and Postcard lines and settle their tone.

**Done when:** you can open the live site and play a fair Easy, Medium or Hard Puzzle with mouse or keyboard, in either theme.
**Risks:** 8 stories in a day is heavy; Stories 1.7 and 1.8 are large. Going live needs the repo made public for GitHub Pages.

## Progress so far

- **Stories 1.1–1.4 were built early, on Tue 6 Oct** (see the Sprint 2 summary).
- **Story 1.5, Keyboard and screen reader (Wed 7 Oct):**
  - **Keyboard:** full keyboard play: arrows, digits, Enter/Space in number-first, Backspace/Delete, N (Digit/Notes), M (input mode), Ctrl/Cmd+Z and Esc.
  - **Screen reader:** the board is a proper ARIA grid with a single tab stop, and a polite live region announces moves.
  - **Guard:** an architecture test keeps one keyboard handler.
  - **Tests:** DOM tests run in jsdom.
  - **Review:** 3 parallel reviews and 5 fixes. Lint, 163 tests and the build pass. Committed locally (`3a21b87`).
  - **Follow-ups:**
    - Real-browser check that Space places a digit once (logged in `deferred-work.md`).
    - Open question: should Undo, Restart, a refused Note and a deselected current digit be announced?
- Every story is committed locally only; nothing is pushed or deployed yet.

## Tickets done (5 / 10)

| ID | Ticket | Type | Size | Owner | Status | Done on |
|---|---|---|---|---|---|---|
| TS-16 | [Story 1.1: Publish the Traveller Sudoku shell](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Tue 6 Oct (early); Pages deploy pending |
| TS-17 | [Story 1.2: Solve a puzzle with the mouse](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Tue 6 Oct (early) |
| TS-18 | [Story 1.3: Notes and number-first entry](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Tue 6 Oct (early) |
| TS-19 | [Story 1.4: Undo and Restart](planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Tue 6 Oct (early) |
| TS-20 | [Story 1.5: Play with the keyboard and a screen reader](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Wed 7 Oct |

## Tickets not done yet (5)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-15 | Implementation readiness check (bmad-sprint-planning) | Chore | S | Claude | To do | - |
| TS-21 | [Story 1.6: Assists and Lamplight](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | To do | Story 1.5 |
| TS-22 | [Story 1.7: Fair puzzles: Technique solver and grader](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | To do | Story 1.2 |
| TS-23 | [Story 1.8: Start a Free Play Puzzle](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | To do | Story 1.7 |
| TS-24 | Write the 30 Cities and Postcard lines, settle their tone | Content | M | Jessica | To do | Needed before Story 3.1; deploys are blocked while placeholders exist |

---
Tickets and status: [backlog.md](implementation-artifacts/backlog.md) · visual board: [board.html](implementation-artifacts/board.html)
