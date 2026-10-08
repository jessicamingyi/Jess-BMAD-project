---
title: 'Traveller Sudoku: Sprint 4: Hints and Postcards (Thu 8 Oct 2026)'
sprint: 4
status: in-progress
updated: '2026-10-08'
---

# Traveller Sudoku: Sprint 4: Hints and Postcards (Thu 8 Oct 2026)

**Goal:** the game teaches and rewards.
**Tickets:** 9 (TS-25 to TS-33). **Progress:** 8 / 9 done. Epic 2 (Hints) and Stories 3.1–3.3 were built early on Wed 7 Oct. The City list is approved (TS-24); the Postcard lines (TS-40) are unscheduled, so deploys stay blocked.

- **Epic 2, Stories 2.1 to 2.4:** nudge and explanation, "Show me the move", Technique definitions, Mistake Hints and "Something doesn't fit yet".
- **Epic 3, Stories 3.1 to 3.5:** City catalogue and pre-built City Puzzles, choosing from the Album, receiving a Postcard, revisiting and replaying, picking up where you left off.

**Done when:** you can choose Lisbon, get stuck, learn the Technique from a Hint, solve it and watch the Postcard arrive.
**Risks:** the heaviest sprint (9 stories); deploys stay blocked until the City content is complete.

- **TS-32 Story 3.4, Revisit Postcards and replay Cities:**
  - **Revisit:** a Collected slot opens its Postcard in place over the Album (no scrim), with "Close" and "Play again". Esc or a click outside also closes it.
  - **Replay:** "Play again" starts a fresh Puzzle; if a replay is already under way it asks "Start fresh" / "Keep going", and the slot shows "Carry on". Solving again awards nothing and reads "Solved again. {City} is already in your Album."
  - **Review:** 3 reviews and 11 fixes (the viewer covering the Region tabs, a visible Close, screen-reader text on the slot, no confirm for an untouched replay), plus two browser checks.

## Tickets done (8 / 9)

| ID | Ticket | Type | Size | Owner | Status | Done on |
|---|---|---|---|---|---|---|
| TS-25 | [Story 2.1: Get a nudge and an explanation for the next move](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-26 | [Story 2.2: Show me the move](planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-27 | [Story 2.3: What's a [Technique]?](planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-28 | [Story 2.4: Hints that find Mistakes, and "Something doesn't fit yet"](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-29 | [Story 3.1: City catalogue and pre-built City Puzzles](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-30 | [Story 3.2: Choose a destination from the Album](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-31 | [Story 3.3: Receive a Postcard](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Wed 7 Oct (early) |
| TS-32 | [Story 3.4: Revisit Postcards and replay Cities](planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Thu 8 Oct |

## Tickets not done yet (1)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-33 | [Story 3.5: Pick up where you left off](planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | To do | Story 3.2 |

---
Tickets and status: [backlog.md](implementation-artifacts/backlog.md) · visual board: [board.html](implementation-artifacts/board.html)
