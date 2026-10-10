---
title: 'Traveller Sudoku: Sprint 6: Test, harden and release v1 (Mon 12 Oct 2026)'
sprint: 6
status: planned
updated: '2026-10-09'
---

# Traveller Sudoku: Sprint 6: Test, harden and release v1 (Mon 12 Oct 2026)

**Goal:** prove the MVP works everywhere it should, fix the open retro defects, then go live.
**Tickets:** 10 (TS-41 to TS-48, plus TS-38 and TS-39 moved from Sprint 5). **Progress:** 0 / 10 done.

Added on Fri 9 Oct. All four epics finished early and the Postcard lines are approved, so this sprint is for testing and hardening before v1 goes live.

**Done when:**
- The site is live on GitHub Pages.
- The automated smoke suite passes.
- Edge, Firefox and Safari have each been checked by hand.
- The Epic 4 retro's two medium defects are fixed.

**Risks:**
- Safari needs a Mac (TS-46).
- TS-43 needs Jessica's decision first.
- Going live (TS-38) needs Jessica to make the repo public.

## Plan, in order

1. **Merge (TS-41):** the 9 Oct branches go into `main`: the retro fixes, the Epic 4 retro, the Postcard lines and this plan. CI must be green.
2. **Harden (TS-42, TS-43, TS-44):**
   - **TS-42:** a slow start-up can no longer leave an empty-looking Album. Tests cover every boot timeout branch.
   - **TS-43:** if the browser's storage is unavailable, the game is still playable, with a clear line that progress won't be saved.
   - **TS-44:** close the small test gaps the retro found.
3. **Test (TS-45, TS-46, TS-47):**
   - **TS-45:** an automated smoke suite, `npm run smoke`, drives installed Chrome through the core and Epic 4 journeys. It uses no new dependencies and reuses the approach from the retro behavior checks.
   - **TS-46:** a manual smoke test in Edge, Firefox and Safari.
   - **TS-47:** a keyboard-only and screen-reader pass.
4. **Docs (TS-48):** `epics.md`, EXPERIENCE.md, AD-7 and the README match what was built.
5. **Release (TS-38):** the deploy gate is green and the smoke tests pass. Jessica makes the repo public, sets Pages to GitHub Actions and sets `PAGES_ENABLED=true`. Then a live check, including offline play.
6. **Retrospective (TS-39):** a final MVP retrospective.

## Tickets

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-41 | Merge the 9 Oct branches into `main`; CI green | Chore | S | Claude | To do | - |
| TS-42 | Fix the start-up timeout race; test the boot timeout branches (E1, E4) | Bug | S | Claude (bmad-build) | To do | TS-41 |
| TS-43 | Storage unavailable: play without saving, with accurate wording (E2) | Story | M | Claude (bmad-build) | To do | TS-42; Jessica's decision |
| TS-44 | Close test gaps (E5, R23) and tidy duplicates (A7) | Test | S | Claude | To do | TS-41 |
| TS-45 | Automated end-to-end smoke suite (`npm run smoke`) in installed Chrome | Test | M | Claude | To do | TS-41 |
| TS-46 | Cross-browser smoke test: Edge, Firefox, Safari on a Mac | Test | S | Jessica + Claude | To do | TS-45 |
| TS-47 | Accessibility pass: keyboard-only and NVDA; decide silent-action announcements | Test | S | Jessica + Claude | To do | TS-41 |
| TS-48 | Reconcile docs with as-built | Doc | S | Jessica (approve) + Claude | To do | TS-43 |
| TS-38 | Release v1: repo public, Pages on, live check | Chore | S | Jessica + Claude | To do | TS-42 to TS-47 |
| TS-39 | Final MVP retrospective | Chore | S | Jessica + Claude | To do | Release v1 |

## Decisions taken as defaults (Jessica can change them)

- [ASSUMPTION] Sprint 6 runs on Mon 12 Oct, the next working day after Sprint 5.
- [ASSUMPTION] TS-43 makes the game playable without saving when storage is unavailable (the Epic 4 retro's recommendation), instead of staying read-only.
- [ASSUMPTION] The smoke suite drives installed Chrome over the DevTools protocol (no Playwright), because downloads through the corporate network failed TLS checks.
- [ASSUMPTION] After MVP, the backlog holds TS-49 (`app.tsx` hooks and test split), TS-50 (install icons) and TS-51 (Free Play generation timeout).
- TS-15 (Sprint 3's readiness check) is left as is: it never ran and is now moot.
