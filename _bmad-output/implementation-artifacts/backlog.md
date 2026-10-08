---
title: 'Traveller Sudoku: backlog and sprint board'
updated: '2026-10-08'
sprint_length: 1 day
sprints: 5
---

# Traveller Sudoku: backlog and sprint board

Five one-day sprints. Visual board: [board.html](board.html). Stories link to their acceptance criteria in `epics.md`.

Sizes: S (under 2 hours), M (half a day), L (most of a day) of focused work; story work is done with `bmad-build`.

## Sprint 1: Discover and plan (Mon 5 Oct 2026)

**Goal:** Pick the idea, research players, write the brief, PRD and architecture.  
**Progress:** 7 / 7 done

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-1 | Shortlist game ideas for the hackathon | Research | S | Claude | Done | - |
| TS-2 | Install uv so BMAD skills can run | Chore | S | Claude | Done | - |
| TS-3 | Opportunity, target-user and needs analysis (Mary) | Research | S | Claude | Done | - |
| TS-4 | [User-voice research on Sudoku players (5 research agents + quote check)](../planning-artifacts/research/user-voice-sudoku-players-2026-10-05/research.md) | Research | M | Claude | Done | - |
| TS-5 | [Product brief: Traveller Sudoku](../planning-artifacts/briefs/brief-Jess-BMAD-project-2026-10-05/brief.md) | Doc | M | Jessica + Claude | Done | - |
| TS-6 | [PRD: 24 FRs, three reviews, decisions D1-D3](../planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md) | Doc | M | Jessica + Claude | Done | - |
| TS-7 | [Architecture spine: AD-1 to AD-12, four reviews](../planning-artifacts/architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md) | Doc | M | Jessica + Claude | Done | - |

## Sprint 2: Design and backlog (Tue 6 Oct 2026)

**Goal:** Design the experience, align the documents, write epics and stories, set up the board.  
**Progress:** 7 / 7 done

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-8 | [UX exploration: 4 design directions, Airmail palette chosen](../planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/mockups/color-themes-1.html) | Design | M | Jessica + Claude | Done | - |
| TS-9 | [UX spines DESIGN.md + EXPERIENCE.md and 4 key-screen mockups](../planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/EXPERIENCE.md) | Design | L | Jessica + Claude | Done | - |
| TS-10 | [UX reviews (accessibility, input reconciliation) and fixes](../planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/review-accessibility.md) | Review | M | Claude | Done | - |
| TS-11 | Align PRD and architecture with UX and stories (FR-9, AD-1/5/6/10/11/12) | Doc | S | Claude | Done | - |
| TS-12 | [Epics and stories: 4 epics, 21 stories, 202 acceptance criteria](../planning-artifacts/epics.md) | Doc | L | Jessica + Claude | Done | - |
| TS-13 | [Final validation of epics and fixes (incl. placeholder deploy gate)](../planning-artifacts/epics-validation.md) | Review | S | Claude | Done | - |
| TS-14 | [Backlog and sprint board](board.html) | Chore | S | Claude | Done | - |

## Sprint 3: Play a calm Sudoku (Wed 7 Oct 2026)

**Goal:** Readiness check, Epic 1 (playable Free Play Sudoku, live on GitHub Pages), and the City content.  
**Progress:** 9 / 10 done (Stories 1.1–1.4 built early, on Tue 6 Oct; Epic 1 code complete; City list approved)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-15 | Implementation readiness check (bmad-sprint-planning) | Chore | S | Claude | To do | - |
| TS-16 | [Story 1.1: Publish the Traveller Sudoku shell](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | - |
| TS-17 | [Story 1.2: Solve a puzzle with the mouse](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 1.1 |
| TS-18 | [Story 1.3: Notes and number-first entry](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 1.2 |
| TS-19 | [Story 1.4: Undo and Restart](../planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Story 1.3 |
| TS-20 | [Story 1.5: Play with the keyboard and a screen reader](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Story 1.4 |
| TS-21 | [Story 1.6: Assists and Lamplight](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 1.5 |
| TS-22 | [Story 1.7: Fair puzzles: Technique solver and grader](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Story 1.2 |
| TS-23 | [Story 1.8: Start a Free Play Puzzle](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Story 1.7 |
| TS-24 | Choose the 30 Cities (name, country, Region, Tier) | Content | S | Jessica + Claude | Done | Needed before Story 3.1; Postcard lines split out to TS-40 |

## Sprint 4: Hints and Postcards (Thu 8 Oct 2026)

**Goal:** Epic 2 (Hints that teach) and Epic 3 (travel and collect Postcards).  
**Progress:** 8 / 9 done (Epic 2 and Stories 3.1–3.3 built early on Wed 7 Oct)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-25 | [Story 2.1: Get a nudge and an explanation for the next move](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Story 1.8 |
| TS-26 | [Story 2.2: Show me the move](../planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Story 2.1 |
| TS-27 | [Story 2.3: What's a [Technique]?](../planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Story 2.1 |
| TS-28 | [Story 2.4: Hints that find Mistakes, and "Something doesn't fit yet"](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 2.2 |
| TS-29 | [Story 3.1: City catalogue and pre-built City Puzzles](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 1.7 + City content |
| TS-30 | [Story 3.2: Choose a destination from the Album](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Story 3.1 |
| TS-31 | [Story 3.3: Receive a Postcard](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 3.2 |
| TS-32 | [Story 3.4: Revisit Postcards and replay Cities](../planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Story 3.3 |
| TS-33 | [Story 3.5: Pick up where you left off](../planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | To do | Story 3.2 |

## Sprint 5: Never lose your journey, release v1 (Fri 9 Oct 2026)

**Goal:** Epic 4 (saving, offline, updates), release v1 and a retrospective.  
**Progress:** 0 / 6 done

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-34 | [Story 4.1: Autosave and restore](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | To do | Story 3.5 |
| TS-35 | [Story 4.2: Safe across versions and tabs](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | To do | Story 4.1 |
| TS-36 | [Story 4.3: Play offline and update gently](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | To do | Story 4.1 |
| TS-37 | [Story 4.4: Storage notice and keeping your data](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | To do | Story 4.2 |
| TS-38 | Release v1: no placeholders, deploy gate green, offline + Safari smoke test | Chore | S | Jessica + Claude | To do | All stories |
| TS-39 | Retrospective (bmad-retrospective) | Chore | S | Jessica + Claude | To do | Release v1 |

## Backlog (unscheduled)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-40 | Write the 30 Postcard lines and settle their tone | Content | M | Jessica | To do | TS-24 (City list); Epic 3 can run on placeholder lines, but deploys stay blocked until every line is real |

## Notes

- **Sprint 3 to 5 load is heavy** (8, 9 and 4 stories). If a sprint overruns, unfinished stories move to the next sprint in order; Story 4.2 is the first candidate to split.
- **City content (Jessica) blocks deploys from Sprint 4**: Story 3.1 makes CI refuse to deploy while any City is a placeholder.
- Story dependencies follow the epic order; within Sprint 4, Epic 2 and Epic 3 can run in parallel after Story 1.8.
