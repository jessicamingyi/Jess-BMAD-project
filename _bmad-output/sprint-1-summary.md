---
title: 'Traveller Sudoku: Sprint 1: Discover and plan (Mon 5 Oct 2026)'
sprint: 1
status: complete
updated: '2026-10-06'
---

# Traveller Sudoku: Sprint 1: Discover and plan (Mon 5 Oct 2026)

**Goal:** find an idea worth building and plan it.
**Result:** 7 / 7 tickets done (TS-1 to TS-7).

- **The idea:** started from a list of hackathon game ideas, chose Sudoku, then made it a personal project. The core insight came from the creator: Sudoku felt boring because there was **nothing to play for**.
- **Research:** user-voice research across App Store reviews and Hacker News (Reddit was blocked). Ads during a puzzle drive players away; the best premium app keeps losing paying users over broken offline play and lost progress; hints that teach are a long-standing need; streaks and flashy rewards backfire.
- **Product brief:** **Traveller Sudoku**: solve a City's Puzzle, receive a text-only Postcard, fill an Album. Calm, ad-free, no game over.
- **PRD:** 24 functional requirements. Reviews led to Free Play (so play doesn't stop after 30 Puzzles), storage that survives updates and browser clean-up, and desktop only.
- **Architecture:** functional core / imperative shell on Vite 8 + React 19 + TypeScript, offline as a web app, IndexedDB storage, GitHub Pages hosting. 12 rules (AD-1 to AD-12). Four reviews caught a hint bug that would loop forever, a two-tab save risk and an update setting that would reload mid-Puzzle.
- **Also:** installed `uv` so BMAD skills run.

**Carried forward:** the 30 Cities and Postcard lines (creator), and checking the research against Reddit.

## Tickets done (7 / 7)

| ID | Ticket | Type | Size | Owner | Status |
|---|---|---|---|---|---|
| TS-1 | Shortlist game ideas for the hackathon | Research | S | Claude | Done |
| TS-2 | Install uv so BMAD skills can run | Chore | S | Claude | Done |
| TS-3 | Opportunity, target-user and needs analysis (Mary) | Research | S | Claude | Done |
| TS-4 | [User-voice research on Sudoku players (5 research agents + quote check)](planning-artifacts/research/user-voice-sudoku-players-2026-10-05/research.md) | Research | M | Claude | Done |
| TS-5 | [Product brief: Traveller Sudoku](planning-artifacts/briefs/brief-Jess-BMAD-project-2026-10-05/brief.md) | Doc | M | Jessica + Claude | Done |
| TS-6 | [PRD: 24 FRs, three reviews, decisions D1-D3](planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md) | Doc | M | Jessica + Claude | Done |
| TS-7 | [Architecture spine: AD-1 to AD-12, four reviews](planning-artifacts/architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md) | Doc | M | Jessica + Claude | Done |

---
Tickets and status: [backlog.md](implementation-artifacts/backlog.md) · visual board: [board.html](implementation-artifacts/board.html)
