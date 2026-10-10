---
title: 'Traveller Sudoku: backlog and sprint board'
updated: '2026-10-09'
sprint_length: 1 day
sprints: 6
---

# Traveller Sudoku: backlog and sprint board

Six one-day sprints (Sprint 6 added on 9 Oct to test and harden before release). Visual board: [board.html](board.html). Stories link to their acceptance criteria in `epics.md`.

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
**Progress:** 9 / 9 done (Epic 2 and Stories 3.1–3.3 built early on Wed 7 Oct; Epic 3 complete)

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
| TS-33 | [Story 3.5: Pick up where you left off](../planning-artifacts/epics.md) | Story | S | Claude (bmad-build) | Done | Story 3.2 |

## Sprint 5: Never lose your journey (Fri 9 Oct 2026)

**Goal:** Epic 4 (saving, offline, updates), Epic 4 retrospective, City content.  
**Progress:** 5 / 5 done (Epic 4 stories built early, on Thu 8 Oct). Release v1 (TS-38) and the final retrospective (TS-39) moved to Sprint 6.

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-34 | [Story 4.1: Autosave and restore](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 3.5 |
| TS-35 | [Story 4.2: Safe across versions and tabs](../planning-artifacts/epics.md) | Story | L | Claude (bmad-build) | Done | Story 4.1 |
| TS-36 | [Story 4.3: Play offline and update gently](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 4.1 |
| TS-37 | [Story 4.4: Storage notice and keeping your data](../planning-artifacts/epics.md) | Story | M | Claude (bmad-build) | Done | Story 4.2 |
| TS-40 | [Write the 30 Postcard lines and settle their tone](../planning-artifacts/cities.md) | Content | M | Jessica + Claude | Done (Claude draft approved by Jessica) | TS-24 |

## Sprint 6: Test, harden and release v1 (Mon 12 Oct 2026)

**Goal:** prove the MVP works everywhere it should, fix the open retro defects, then go live.  
**Progress:** 4 / 10 done

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-41 | Merge the 9 Oct branches (retro fixes, Epic 4 retro, Postcard lines, this plan) into `main`; CI green | Chore | S | Claude | Done | - |
| TS-42 | [Fix the start-up timeout race; test the boot timeout branches (E1, E4)](epic-4-retro-2026-10-09.md) | Bug | S | Claude (bmad-build) | Done | TS-41 |
| TS-43 | [Storage unavailable: play without saving, with accurate wording (E2)](epic-4-retro-2026-10-09.md) | Story | M | Claude (bmad-build) | Done | TS-42; Jessica's decision |
| TS-44 | [Close test gaps: read-only first Postcard never asks to persist (E5); restore resets Hint, viewer and "Solved again" (R23); one `isObject`, one lock fallback (A7)](epic-4-retro-2026-10-09.md) | Test | S | Claude | Done | TS-41 |
| TS-45 | Automated end-to-end smoke suite (`npm run smoke`): the core journeys (play, Notes, Undo, Hint, Postcard, replay, Free Play) and the Epic 4 journeys (reload, two tabs, offline, update, corrupt data) in installed Chrome | Test | M | Claude | To do | TS-41 |
| TS-46 | Cross-browser smoke test: Edge, Firefox (number-first Space), Safari on a Mac (Add to Dock tip) | Test | S | Jessica + Claude | To do | TS-45 |
| TS-47 | Accessibility pass: keyboard-only and NVDA run of the Lisbon journey; decide whether Undo, Restart, refused Notes and deselect are announced | Test | S | Jessica + Claude | To do | TS-41 |
| TS-48 | Reconcile docs with as-built: `epics.md` (Epics 1–4), EXPERIENCE.md, AD-7 and the unreadable wording, README deploy section | Doc | S | Jessica (approve) + Claude | To do | TS-43 |
| TS-38 | Release v1: deploy gate green, smoke tests pass, repo public, Pages on (`PAGES_ENABLED=true`), live check | Chore | S | Jessica + Claude | To do | TS-42 to TS-47 |
| TS-39 | Final MVP retrospective (bmad-retrospective) | Chore | S | Jessica + Claude | To do | Release v1 |

## Backlog (after MVP)

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-49 | Move the saving and banner effects out of `app.tsx` into hooks; split `autosave.test.ts` by concern (retro A5, A6) | Chore | M | Claude (bmad-build) | To do | Release v1 |
| TS-50 | Install metadata for Add to Dock: PNG and apple-touch icons, manifest `id`, `theme-color` | Chore | S | Claude | To do | Release v1 |
| TS-51 | Free Play generation timeout with a retry (retro V6) | Story | S | Claude (bmad-build) | To do | Release v1 |

## Notes

- **Sprint 6 (added 9 Oct):** Epic 4 finished early, so a testing and hardening sprint goes before release. TS-42 to TS-45 are Claude's; TS-46 needs a Mac for Safari; TS-38's last step (repo public, Pages on) is Jessica's.

- **Sprint 3 to 5 load is heavy** (8, 9 and 4 stories). If a sprint overruns, unfinished stories move to the next sprint in order; Story 4.2 is the first candidate to split.
- **City content (Jessica) blocks deploys from Sprint 4**: Story 3.1 makes CI refuse to deploy while any City is a placeholder.
- Story dependencies follow the epic order; within Sprint 4, Epic 2 and Epic 3 can run in parallel after Story 1.8.
