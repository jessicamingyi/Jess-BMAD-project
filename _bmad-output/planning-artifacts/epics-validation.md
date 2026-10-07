# Epics & Stories Validation: Traveller Sudoku (re-run)

- **Document:** `_bmad-output/planning-artifacts/epics.md` (4 epics, 21 stories, 202 Given/When/Then ACs)
- **Reference:** `architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md`
- **Date:** 2026-10-06 (re-run after fixes)
- **Mode:** validation only. No content was added or changed in `epics.md`.

## Summary

| # | Check | Result |
| --- | --- | --- |
| 1 | FR coverage (FR1–FR24) | PASS: 24/24 traced; FR13 and FR14 now fully covered |
| 2 | UX-DR coverage (UX-DR1–70) | PASS: 70/70 in at least one Covers line (scripted) |
| 3 | Starter template in Story 1.1 | PASS |
| 4 | Entities and state created only when needed | PASS |
| 5 | Story quality and sizing | PASS (notes: Story 1.1 Covers line has no FR; three stories at 14 ACs) |
| 6 | Forward dependencies | PASS: all five earlier violations fixed; two harmless soft references remain |
| 7 | Epic structure and file churn | PASS |
| 8 | Epic independence | PASS (note: Story 3.5 value needs Epic 4 reload, as the story says) |
| 9 | Template compliance | PASS: "Destinations" contradiction fixed |

Previous FAILs (1, 6, 8) and the line-72 note are all resolved.

---

## Check 1: FR coverage: PASS

Scripted count of FR mentions in `**Covers:**` lines (stories per FR):
FR1:7 FR2:5 FR3:3 FR4:3 FR5:4 FR6:3 FR7:6 FR8:4 FR9:6 FR10:4 FR11:5 FR12:3 FR13:5 FR14:3 FR15:6 FR16:1 FR17:3 FR18:1 FR19:1 FR20:1 FR21:1 FR22:1 FR23:1 FR24:2. None missing.

| FR | Stories | Full statement addressed? |
| --- | --- | --- |
| FR1 | 1.7, 1.8, 3.1 | Yes: registry, solver, grader, brute uniqueness, Tier match verified at build |
| FR2 | 1.2, 1.3, 1.5 | Yes |
| FR3 | 1.3, 1.5 | Yes |
| FR4 | 1.4, 2.2 | Yes |
| FR5 | 1.6, 4.1 | Yes |
| FR6 | 1.2, 2.4 | Yes |
| FR7 | 1.2, 1.8, 3.3, 3.4 | Yes |
| FR8 | 2.1, 2.2 | Yes |
| FR9 | 2.1, 2.2, 2.4 | Yes |
| FR10 | 2.3, 2.4 | Yes |
| FR11 | 2.1, 2.4 | Yes |
| FR12 | 3.2 | Yes |
| FR13 | 3.1, 3.2 | **Yes (fixed).** Story 3.1 AC 3: the deploy job fails while any City has `placeholder: true`, so the live site never ships placeholder content. |
| FR14 | 3.2, 3.3 | **Yes (fixed).** Story 3.2 adds an AC: the Postcard line is never shown on Reachable, in-progress or Locked slots, or on the City Puzzle screen, before collection (unit-tested). |
| FR15 | 3.2, 3.3 | Yes |
| FR16 | 3.4 | Yes |
| FR17 | 3.5, 4.1, 4.2 | Yes |
| FR18 | 4.2, 4.3 | Yes |
| FR19 | 4.4 | Yes |
| FR20 | 1.1, 1.6 | Yes |
| FR21 | 1.5 | Yes |
| FR22 | 1.4 | Yes |
| FR23 | 1.8 (+ Epic 2 on the `free` session) | Yes |
| FR24 | 4.2, 4.4 | Yes |

## Check 2: UX-DR coverage: PASS

Script: for i in 1..70, grep `UX-DR$i([^0-9]|$)` across all 21 `**Covers:**` lines. Result: 0 missing.

## Check 3: Starter template: PASS

Story 1.1 AC 1 scaffolds with `create-vite` 9.2 `react-ts`. It pins Vite 8.3, React/React DOM 19.3, TS 6.0, plugin-react 6.1, oxlint 1.85 and Vitest 5.0, and sets `.nvmrc` to 24. `vite-plugin-pwa` and `idb-keyval` are explicitly deferred (added in 4.3 and 4.1). This matches Architecture › Stack.

## Check 4: Entity/state creation only when needed: PASS

| Item | Introduced | First needed |
| --- | --- | --- |
| `sessions['free']`, Session shape | 1.2 | 1.2 |
| `notes` masks behaviour | 1.3 | 1.3 |
| `ui.undo` | 1.4 | 1.4 |
| `settings` (Assists, theme) | 1.6 | 1.6 |
| `settings` Free Play Difficulty | 1.8 | 1.8 |
| `ui.hint`, `content/techniques` | 2.1 (defs 2.3) | 2.1 |
| `cities.json`, `city-puzzles.json`, `game/journey` | 3.1 | 3.1 |
| `album` Postcard shape | **3.2 (fixed)** | 3.2 |
| `journey.award` | 3.3 | 3.3 |
| `meta.lastPlayedKey` | 3.5 | 3.5 |
| Persistence document, `idb-keyval` | 4.1 | 4.1 |
| migrations, `ui.readOnly`, `ui.saveFailed`, Web Lock | 4.2 | 4.2 |
| `vite-plugin-pwa`, `ui.updateReady` | 4.3 | 4.3 |
| `meta.seenStorageNotice`, `meta.persistGranted` | 4.4 | 4.4 |

Story 1.2's up-front five-slice `AppState` is the fixed AD-5 contract, so it is acceptable.

## Check 5: Story quality: PASS (notes)

- 21/21 stories have As a / I want / So that (two "As a creator": 1.1, 3.1).
- 202 ACs, all complete Given/When/Then triples (scripted: 202 Given, 202 When, 202 Then).
- AC counts: 1.1=9, 1.2=11, 1.3=11, 1.4=9, 1.5=14, 1.6=12, 1.7=9, 1.8=12, 2.1=14, 2.2=7, 2.3=5, 2.4=10, 3.1=9, 3.2=14, 3.3=9, 3.4=6, 3.5=8, 4.1=8, 4.2=10, 4.3=7, 4.4=8. None goes over 14.
- 20/21 Covers lines name an FR. **Note:** the Story 1.1 Covers line (line 289) lists only NFRs, ADs, UX-DRs and the starter. This is normal for a foundation story. (The previous report said every Covers line names an FR; that was wrong, because it matched the "FR" inside "NFR".)
- Watch list (not a failure): 1.5, 2.1 and 3.2 are at 14 ACs. 1.8 (generator + worker + entry UI) and 4.2 (banner + migrations + version guard + backup + Web Lock + save failure) are the broadest.

## Check 6: Forward dependencies: PASS

All earlier violations are fixed:
1. 2.3 → 2.4: the Mistake "no link" AC now lives in Story 2.4 (line 881). Fixed.
2. 1.5 → 1.6: 1.5 now says "header (wordmark)" (lines 494, 505); nav targets and focus moved to 1.6 (line 543). Fixed.
3. 3.2 → 3.3: 3.2 defines the `album` shape and uses fixtures (lines 991–994); 3.3 refers back to it. Fixed.
4. 2.1 → Epic 3: now a reducer unit test with a two-session fixture (line 767). Fixed.
5. 4.3 banner priority: the full order is now spelled out (line 1314), and 4.2 states the partial order explicitly (line 1242). Fixed.

Remaining soft references (harmless, conditional, not blocking):
- Story 2.1, line 736: "below any notice banner". Banners first exist in 4.2. The wording is conditional, so this does not block implementation.
- Story 4.3, line 1314: the order names "storage notice > persistence", which are built in 4.4. Update-ready is lowest either way, so this is implementable in 4.3.

All other cross-story references are backward (1.5 → 2.1; 3.3 → 3.5; 3.3/3.5 → 4.1; 1.6 → 4.1) or explicit deferrals ("Epic 4" in 1.1, 1.6, 3.5; "Story 4.4 completes the order" in 4.2).

## Check 7: Epic structure: PASS

- All four epics deliver user value. There is no standalone technical epic. Setup, engine and CI are inside Epic 1.
- Dependencies run 1 → 2 → 3 → 4.
- File churn is additive and justified: header/nav (1.1 → 1.6 → 1.8 → 3.2 → 3.5), side column (1.2 → 1.3 → 1.4 → 2.1 → 2.4 → 4.2/4.4), `tests/architecture` (1.1 → 1.5 → 3.1 → 4.1), contrast test (1.6 → 3.2), banner (4.2 → 4.3 → 4.4). Startup seeding changes once, by design (1.2 sample → 1.8 retired). Settings persistence changes once, by design (1.6 reset-on-reload → 4.1 saved).

## Check 8: Epic independence: PASS (note)

- Epic 2 without 3/4: works on `sessions['free']`. The only multi-session AC is a fixture-based unit test.
- Epic 3 without 4: works in-page. Story 3.5's player value appears only after a reload, which needs Story 4.1. The story says so (line 1176), so this is acceptable.
- **Sample-Puzzle startup seeding (fixed):** Story 1.8, line 660, retires the sample at startup (test fixture only; `sessions` starts empty; the app shows Free Play entry). Story 3.5, line 1157, and Story 4.1, line 1226, are consistent with this.
- Minor observation (not a fail): from Story 1.8 to Story 3.5, the header "Puzzle" link (added in 1.6) has no defined behaviour when `sessions` is empty. The disabled state arrives in 3.5 (line 1164).

## Check 9: Template compliance: PASS

- Present: frontmatter, Overview, Requirements Inventory (FR, NFR, Additional, UX-DR), FR Coverage Map, Epic List, Epics 1–4 with stories. Story count 8 + 4 + 5 + 4 = 21.
- `grep -nE '\{\{|<!--|TODO|TBD'` returns nothing.
- "Destinations" now appears only at line 48 ("no separate Destinations screen"). Line 72 reads "Album (also the destination chooser), Puzzle, FreePlay, Settings". Fixed.
- No other contradictions found. 1.2 "Solved." is refined by 1.8 "Solved. Another one?" for Free Play, which is an intended progression.
- Informational: the FR Coverage Map is epic-level and leaves out some secondary touches (e.g. FR4/FR6/FR10 in Epic 2 stories, FR5/FR17 in Epic 4/3).
