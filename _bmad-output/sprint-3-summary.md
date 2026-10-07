---
title: 'Traveller Sudoku: Sprint 3: Play a calm Sudoku (Wed 7 Oct 2026)'
sprint: 3
status: in-progress
updated: '2026-10-07'
---

# Traveller Sudoku: Sprint 3: Play a calm Sudoku (Wed 7 Oct 2026)

**Goal:** a playable, live Free Play Sudoku.
**Tickets:** 10 (TS-15 to TS-24). **Progress:** 8 / 10 done. Epic 1 code is complete.

- Readiness check (`bmad-sprint-planning`).
- **Epic 1, Stories 1.1 to 1.8:** project shell live on GitHub Pages; mouse play; Notes and number-first entry; Undo and Restart; keyboard and screen-reader play; Assists and Lamplight; Technique solver and grader; Free Play at a chosen Difficulty.
- **Creator:** write the 30 Cities and Postcard lines and settle their tone.

**Done when:** you can open the live site and play a fair Easy, Medium or Hard Puzzle with mouse or keyboard, in either theme.
**Risks:** Going live needs the repo made public for GitHub Pages (and the City content before Epic 3 deploys).

## Progress so far

- **Stories 1.1–1.4 were built early, on Tue 6 Oct** (see the Sprint 2 summary).
- **Story 1.5, Keyboard and screen reader (Wed 7 Oct):**
  - **Keyboard:** full keyboard play: arrows, digits, Enter/Space in number-first, Backspace/Delete, N (Digit/Notes), M (input mode), Ctrl/Cmd+Z and Esc.
  - **Screen reader:** the board is a proper ARIA grid with a single tab stop, and a polite live region announces moves.
  - **Guard:** an architecture test keeps one keyboard handler.
  - **Tests:** DOM tests run in jsdom.
  - **Review:** 3 parallel reviews and 5 fixes. Lint, 163 tests and the build pass. Committed locally (`3a21b87`).
  - **Follow-ups:**
    - Real-browser check that Space places a digit once: verified in Chrome and Edge on 7 Oct; Firefox not checked.
    - Open question: should Undo, Restart, a refused Note and a deselected current digit be announced?
- **Story 1.6, Assists and Lamplight (Wed 7 Oct):**
  - **Assists:** Mistake highlighting (Off by default), same-digit (On) and row/column/box (On), each paired with a non-colour mark.
  - **Settings:** a screen with the Assists grouped and Lamplight below, plus "Puzzle · Settings" nav.
  - **Lamplight:** a dark theme twin, switched only from Settings.
  - **Contrast:** a WCAG contrast test checks both themes.
  - **Review:** 3 reviews, 8 fixes; committed `6ad0b3e`.
- **Story 1.7, Technique solver and grader (Wed 7 Oct):**
  - **Engine:** a pure engine with the five Techniques in one ordered registry, `solve`, and `grade` (Easy/Medium/Hard, or "not gradeable" for puzzles beyond them).
  - **Brute counter:** a solution counter only the generator may import.
  - **Header:** reads "Free Play · {Difficulty}".
  - **Review:** 3 reviews, 6 fixes, including 3 test gaps proved by mutation; committed `4e4abc9`.
- **Story 1.8, Start a Free Play Puzzle (Wed 7 Oct):**
  - **Generator:** seeded, deterministic, and keeps only unique puzzles graded to the chosen Difficulty. It runs in a Web Worker.
  - **Entry screen:** Difficulty picker, "Start a Puzzle", "Carry on" / "Start a new one" with an inline confirm, and a calm error line.
  - **Nav:** "Puzzle · Free Play · Settings".
  - **Startup:** the sample Puzzle no longer loads; it's a test fixture only.
  - **Review:** 3 reviews and 6 fixes, plus a real-browser smoke test in Chrome and Edge with no errors. Hard generates in under 0.1 s. Committed `e556c6f`.
- **Your decisions today:**
  - Same-digit marks follow the selected cell.
  - Settings are grouped.
  - "Puzzle" in the nav is shown but disabled until a Puzzle exists.
  - The start button reads "Start a Puzzle", with a warm error line.
  - A new Puzzle that arrives while you're on another screen waits under "Puzzle".
- Epic 1 was merged to `main` and pushed on 7 Oct. CI is green, and Pages publishing waits for the `PAGES_ENABLED` repository variable (the repo stays private for now).

## Pulled forward from Sprint 4 (built Wed 7 Oct; counted in Sprint 4)

- **TS-25 Story 2.1, Nudge and explanation:**
  - **Hint panel:** the first Hint step names an area to look at ("Look for a hidden single in row 3."). The second explains the move in one or two sentences, with the relevant cells ringed on the grid.
  - **Keys:** H steps through the Hint and Esc sets it aside. The Hint resets when digits change.
  - **"Show me the move":** shown but inactive until Story 2.2.
  - **Review:** 3 reviews and 7 fixes, plus a real-browser check in Chrome and Edge in both themes.
  - **Commit:** committed locally as `272835f`, on `story/2-1-nudge-and-explanation`. Not yet merged to `main`.
  - The ticket is counted in Sprint 4.
- **TS-26 Story 2.2, Show me the move:**
  - **The move:** the third Hint step places the explained digit. It always places a digit, even in Notes mode, as one Undo step. The live region says "7 placed, row 4, column 4", or "… Solved" when the move finishes the Puzzle.
  - **Your decisions:** the action-row Hint applies the move at step 2, and the solve message names both the move and "Solved".
  - **Review:** 3 reviews and 5 fixes; the browser check solved a whole Puzzle with H alone.
  - **Commit:** committed locally on `story/2-2-show-me-the-move`, stacked on 2.1; not yet on `main`.

## Tickets done (8 / 10)

| ID | Ticket | Type | Size | Owner | Status | Done on |
|---|---|---|---|---|---|---|
| TS-16 | [Story 1.1: Publish the Traveller Sudoku shell](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Tue 6 Oct (early); Pages deploy pending |
| TS-17 | [Story 1.2: Solve a puzzle with the mouse](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Tue 6 Oct (early) |
| TS-18 | [Story 1.3: Notes and number-first entry](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Tue 6 Oct (early) |
| TS-19 | [Story 1.4: Undo and Restart](planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Tue 6 Oct (early) |
| TS-20 | [Story 1.5: Play with the keyboard and a screen reader](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Wed 7 Oct |
| TS-21 | [Story 1.6: Assists and Lamplight](planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Wed 7 Oct |
| TS-22 | [Story 1.7: Fair puzzles: Technique solver and grader](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Wed 7 Oct |
| TS-23 | [Story 1.8: Start a Free Play Puzzle](planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Wed 7 Oct |

## Tickets not done yet (2)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-15 | Implementation readiness check (bmad-sprint-planning) | Chore | S | Claude | To do | - |
| TS-24 | Write the 30 Cities and Postcard lines, settle their tone | Content | M | Jessica | To do | Needed before Story 3.1; deploys are blocked while placeholders exist |

---
Tickets and status: [backlog.md](implementation-artifacts/backlog.md) · visual board: [board.html](implementation-artifacts/board.html)
