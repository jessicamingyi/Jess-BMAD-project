---
title: 'Traveller Sudoku: Sprint 6: Test and harden the MVP (Mon 12 Oct 2026)'
sprint: 6
status: done
updated: '2026-10-13'
---

# Traveller Sudoku: Sprint 6: Test and harden the MVP (Mon 12 Oct 2026)

**Goal:** prove the MVP works in Chrome and Edge, fix the open retro defects, and close the MVP. Going live (TS-38) moved to the product backlog on 9 Oct (Jessica).
**Tickets:** 10 (TS-41 to TS-48, TS-62 added 13 Oct, plus TS-39 moved from Sprint 5; TS-38 moved after MVP). **Progress:** 10 / 10 done; MVP closed 13 Oct (started early, Fri 9 Oct).

Added on Fri 9 Oct. All four epics finished early and the Postcard lines are approved, so this sprint is for testing and hardening before v1 goes live.

**Done when:**
- The deploy gate is green, so going live is a settings change whenever Jessica chooses (TS-38, after MVP).
- The automated smoke suite passes.
- Chrome and Edge pass the smoke suite (Firefox and Safari are after MVP: TS-52, TS-53).
- The Epic 4 retro's two medium defects are fixed.

**Risks:**
- Safari needed a Mac (TS-46); moved after MVP as TS-53 on 9 Oct.
- TS-43 needs Jessica's decision first.

## Plan, in order

1. **Merge (TS-41):** the 9 Oct branches go into `main`: the retro fixes, the Epic 4 retro, the Postcard lines and this plan. CI must be green.
2. **Harden (TS-42, TS-43, TS-44):**
   - **TS-42:** a slow start-up can no longer leave an empty-looking Album. Tests cover every boot timeout branch.
   - **TS-43:** if the browser's storage is unavailable, the game is still playable, with a clear line that progress won't be saved.
   - **TS-44:** close the small test gaps the retro found.
3. **Test (TS-45, TS-46, TS-47):**
   - **TS-45:** an automated smoke suite, `npm run smoke`, drives installed Chrome through the core and Epic 4 journeys. It uses no new dependencies and reuses the approach from the retro behavior checks.
   - **TS-46:** Chrome and Edge through the smoke suite (Firefox and Safari moved after MVP: TS-52, TS-53).
   - **TS-62 (added 13 Oct, before TS-47):** Easy was too hard. Each Difficulty now has a minimum number of Givens (Easy 61, Medium 40, Hard 32); the 30 City Puzzles were regenerated once, before release.
   - **TS-47:** time two or three Easy Cities (about one minute each). Depends on TS-62. The NVDA screen-reader pass moved after MVP (TS-63, 13 Oct).
4. **Docs (TS-48):** `epics.md`, EXPERIENCE.md, AD-7 and the README match what was built.
5. **Going live (TS-38):** moved after MVP on 9 Oct; the deploy gate and smoke tests are already green.
6. **Retrospective (TS-39):** a final MVP retrospective.

## Progress (Fri 9 Oct, started early)

- **TS-41 Done:** the 9 Oct branches were fast-forwarded into `main` and pushed (d0d96cc); CI green.
- **TS-42 + TS-44 Done** (ef66598, spec-ts-42-44):
  - **TS-42:** a slow start-up can no longer leave an empty-looking Album. Once start-up gives up, nothing is written to the save.
  - **TS-44:** new tests for every timeout branch, the read-only first-Postcard guard and restore normalisation.
  - **Review:** 25 findings, 7 fixes.
- **TS-43 Done** (74683dc, spec-ts-43):
  - **What changed:** when storage can't be reached, the game is playable without saving, and says: "We can't save your progress in this browser right now. Anything saved before is left untouched. You can keep playing, but this session won't be kept - reload to try again."
  - **Second tabs:** a second tab stays read-only, even when its storage is also slow.
  - **Review:** 28 findings, 9 fixes.
- **TS-45 Done** (4609c98): `npm run smoke` drives Chrome or Edge through 10 journeys in about 40 s. It passes 10/10 in Chrome 155 and Edge 154.
- **TS-46 Done:** Chrome 155 and Edge 154 pass `npm run smoke` 10/10. Firefox (TS-52) and Safari (TS-53) are out of MVP scope.
- **TS-62 Done (13 Oct):** the generator tops up Givens after an exact grade until the Difficulty's minimum (`MIN_GIVENS`: 61 / 40 / 32). All 30 City Puzzles regenerated (12 Easy at 61, 9 Medium at 40, 9 Hard at 32). `npm test` (1294), lint, build and `npm run smoke` (10/10 in Chrome) pass. Review: 19 findings, 7 fixes (test hardening and doc touch-ups). Jessica still times two or three Easy Cities in TS-47.
- **TS-47 Done (13 Oct):** Jessica timed the Easy Cities: pass. Keyboard play is covered by the unit tests and `npm run smoke`. The NVDA run and the decision on announcing silent actions moved to the product backlog as TS-63 (Jessica, 13 Oct); TS-59 now depends on TS-63.
- **TS-39 Done (13 Oct):** final MVP retrospective ([mvp-retro-2026-10-13.md](implementation-artifacts/mvp-retro-2026-10-13.md)), accepted with open items by Jessica. All criteria met: CI green, `npm test` 1294 passed, `npm run smoke` 10/10 in Chrome 155 and Edge 155, the Epic 4 medium defects fixed. Four low findings: R1 (the save lock can stay held when storage is wedged) is TS-64; R2 (saving-off wording race) accepted in `deferred-work.md`; R3 and R4 folded into TS-58 and TS-51.
- **TS-48 Done:** 91 doc changes (1e0aa5e), listed in `implementation-artifacts/ts-48-reconciliation-log.md`, approved by Jessica. README deploy section corrected. S7 leftovers fixed.
- **Product backlog (after MVP):** one prioritised list in `backlog.md` (TS-49 to TS-61, 13 tickets). Every open deferral and retro action now has a ticket. Six retro action items that were already done are closed (Postcard lines, the Story 4.1 coverage, both doc reconciliations, deferrals mirrored, Firefox smoke superseded by TS-52).
- **Open for Jessica:**
  - **Unreadable wording (decided):** Jessica chose "We couldn't read your saved progress, so we've kept a copy safe and started fresh." It replaces the inaccurate "kept safe, not overwritten".
  - **Firefox and Safari:** out of MVP scope, moved to TS-52 and TS-53 (after MVP). The Safari Add to Dock tip stays in the code but is unverified on a real Mac.
  - **Going live:** moved after MVP (TS-38 at the top of the product backlog).

## Tickets

| ID | Ticket | Type | Size | Owner | Status | Depends on |
|---|---|---|---|---|---|---|
| TS-41 | Merge the 9 Oct branches into `main`; CI green | Chore | S | Claude | To do | - |
| TS-42 | Fix the start-up timeout race; test the boot timeout branches (E1, E4) | Bug | S | Claude (bmad-build) | To do | TS-41 |
| TS-43 | Storage unavailable: play without saving, with accurate wording (E2) | Story | M | Claude (bmad-build) | To do | TS-42; Jessica's decision |
| TS-44 | Close test gaps (E5, R23) and tidy duplicates (A7) | Test | S | Claude | To do | TS-41 |
| TS-45 | Automated end-to-end smoke suite (`npm run smoke`) in installed Chrome | Test | M | Claude | To do | TS-41 |
| TS-46 | Cross-browser smoke test: Edge, Firefox, Safari on a Mac | Test | S | Jessica + Claude | To do | TS-45 |
| TS-62 | Lower the Difficulty levels: minimum Givens per Difficulty; regenerate the City Puzzles once | Story | S | Claude (bmad-build) | Done | - |
| TS-47 | Time Easy Cities (NVDA pass moved to TS-63) | Test | S | Jessica + Claude | Done | TS-41, TS-62 |
| TS-48 | Reconcile docs with as-built | Doc | S | Jessica (approve) + Claude | To do | TS-43 |
| TS-39 | Final MVP retrospective | Chore | S | Jessica + Claude | Done | TS-47 |

## Decisions taken as defaults (Jessica can change them)

- [ASSUMPTION] Sprint 6 runs on Mon 12 Oct, the next working day after Sprint 5.
- [ASSUMPTION] TS-43 makes the game playable without saving when storage is unavailable (the Epic 4 retro's recommendation), instead of staying read-only.
- [ASSUMPTION] The smoke suite drives installed Chrome over the DevTools protocol (no Playwright), because downloads through the corporate network failed TLS checks.
- [ASSUMPTION] After MVP, the backlog holds TS-49 (`app.tsx` hooks and test split), TS-50 (install icons) and TS-51 (Free Play generation timeout).
- TS-15 (Sprint 3's readiness check) is left as is: it never ran and is now moot.
