---
title: 'Traveller Sudoku: Sprint 2: Design and backlog (Tue 6 Oct 2026)'
sprint: 2
status: complete
updated: '2026-10-06'
---

# Traveller Sudoku: Sprint 2: Design and backlog (Tue 6 Oct 2026)

**Goal:** design the experience and turn the plan into buildable work.
**Result:** 7 / 7 tickets done (TS-8 to TS-14).

- **Look:** chose the **Vintage postcard** direction and the **Airmail** palette (Daylight default, Lamplight dark mode as a setting).
- **Experience:** `DESIGN.md` and `EXPERIENCE.md`: the Album doubles as the destination chooser; Puzzle screen with the Hint panel on the right; Postcard slides onto the finished grid; three-step Hints; warm, brief microcopy; full keyboard and screen-reader play.
- **Mockups:** Album, Puzzle with Hint, Postcard reveal and first launch.
- **Reviews:** accessibility (pass with fixes) and input reconciliation, which found that a full-but-wrong grid had no state. Added "Something doesn't fit yet".
- **Alignment:** PRD and architecture updated to match (three-step Hints, last-played tracking, reveal survives reload, Postcard dates, CSP via meta tag, and others).
- **Epics and stories:** 4 epics, **21 stories, 202 acceptance criteria**, all 24 FRs and 70 UX requirements covered. Final validation passed after fixes. Deploys are blocked while any City is a placeholder.
- **Backlog and board:** 39 tickets across 5 sprints.

**Carried forward:** the City content is now on the critical path for Sprint 4.

## Tickets done (7 / 7)

| ID | Ticket | Type | Size | Owner | Status |
|---|---|---|---|---|---|
| TS-8 | [UX exploration: 4 design directions, Airmail palette chosen](planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/mockups/color-themes-1.html) | Design | M | Jessica + Claude | Done |
| TS-9 | [UX spines DESIGN.md + EXPERIENCE.md and 4 key-screen mockups](planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/EXPERIENCE.md) | Design | L | Jessica + Claude | Done |
| TS-10 | [UX reviews (accessibility, input reconciliation) and fixes](planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/review-accessibility.md) | Review | M | Claude | Done |
| TS-11 | Align PRD and architecture with UX and stories (FR-9, AD-1/5/6/10/11/12) | Doc | S | Claude | Done |
| TS-12 | [Epics and stories: 4 epics, 21 stories, 202 acceptance criteria](planning-artifacts/epics.md) | Doc | L | Jessica + Claude | Done |
| TS-13 | [Final validation of epics and fixes (incl. placeholder deploy gate)](planning-artifacts/epics-validation.md) | Review | S | Claude | Done |
| TS-14 | [Backlog and sprint board](implementation-artifacts/board.html) | Chore | S | Claude | Done |

---
Tickets and status: [backlog.md](implementation-artifacts/backlog.md) · visual board: [board.html](implementation-artifacts/board.html)
