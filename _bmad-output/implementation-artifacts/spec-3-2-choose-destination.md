---
title: 'Story 3.2: Choose a destination from the Album'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '9263fdb9c19478b2026f26db161314b10607f975'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The 30 Cities and their Puzzles exist, but the player can't reach them. There is no Album, no reachability, no City session, and every reducer path is hard-wired to `sessions.free`.

**Approach:** Add the Album screen (Region tabs, 10 slots per Region) as the destination chooser and add "Album" to the nav. Reachability lives in `game/journey` and is computed from `album` + catalogue. `cityChosen` creates or reopens `sessions['city:<id>']`. The reducer, announcer and Puzzle screen act on an active session key instead of `free`. A City Puzzle shows the destination title, meta line, Stamp and Postmark.

## Boundaries & Constraints

**Always:** Every story AC (epics.md, Story 3.2) holds. `album` is `readonly Postcard[]`, with `Postcard = { cityId, collectedOn, revealed }`. This story only reads it. Reachability, counts and slot states are never stored. A City's `line` never reaches the DOM, accessible names or the live region unless that City has a Postcard. Opening a session never records Undo and never changes `meta.lastPlayedKey`. Tokens only, with `-lamplight` twins. Copy lives in `copy.ts`. No new key handlers: slots and tabs are native buttons. The core never reads the clock; the shell passes in today's date.

**Never:** `award`, `postcardAdded`, the reveal, the Collected slot styling or "just arrived" (3.3). The Postcard viewer and replay (3.4). The launch rule, the "No rush" line or `lastPlayedKey` changes (3.5). Persistence or the storage notice (Epic 4). A map. Confirmation when leaving a Puzzle. Showing placeholder status anywhere.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Travel | reachable City, no session | fresh `city:<id>` from `cityPuzzle`, `activeKey` set, screen `puzzle`, `undo` [], selection/currentDigit cleared, hint cleared if it belongs to that key | N/A |
| Carry on | `city:<id>` `inProgress` | `activeKey` set, screen `puzzle`; session is the same reference | N/A |
| Re-travel solved | `city:<id>` solved, no Postcard (possible until 3.3) | replaced by a fresh session | N/A |
| Forged | locked id, unknown id, or no puzzle entry | same state reference | ignored |
| Other sessions | `free` + another City in progress | untouched (same references) | N/A |
| Free Play reply | arrives while `activeKey` is a City | only `sessions.free` is replaced; `activeKey`, `undo` and the City hint stay | N/A |

**Decisions (planner, 2026-10-07):** These follow from the docs. Revisit them if they look wrong.
- With nothing in progress, the app now starts on the Album: UX launch rule, empty-Album state.
- Placeholder Cities play normally and show no placeholder marker. Names are real, and the only placeholder content is the line, which 3.2 never shows.

**Decisions (human, 2026-10-07):**
- **Undo on a switch:** Undo history clears when the active Puzzle changes (City A to City B, or a City to or from Free Play). Returning to the same Puzzle keeps it.
- **Free Play arriving during a City:** a Free Play Puzzle that finishes generating while a City is active replaces only `sessions.free`. The City stays the current Puzzle under "Puzzle", and the new Free Play Puzzle waits under Free Play → "Carry on". This refines the 1.8 "waits under Puzzle" decision now that more than one Puzzle exists.
- **Size:** the spec is kept whole, at about 2,200 tokens.

</frozen-after-approval>


## Code Map

- `src/game/types.ts` -- `Album` is a `Record<string, never>` stub; `Screen`; `UiState`; `Action`.
- `src/game/session.ts` -- `createSession`, `FREE_PLAY_KEY`, and `createInitialState` (starts on `freePlay`, `album: {}`).
- `src/game/reducer.ts` -- `applyDigit`, `clearCell`, `record`, `undo`, `restart`, `setRestartConfirming`, `requestHint`, `applyHint`, `setDefinitionOpen` and `chooseScreen` all read `FREE_PLAY_KEY`. The solve is detected in `applyDigit`/`applyHint`.
- `src/game/announce.ts` -- reads `FREE_PLAY_KEY`.
- `src/game/hint.ts` -- `activeHint(state, key)` already filters by `sessionKey`.
- `src/game/journey.ts` -- `TIER_DIFFICULTY`. Node runs it from `scripts/`, so imports keep `.ts`.
- `src/content/cities.ts`, `city-puzzles.ts` -- `CITIES` (in catalogue order, which is already Near → Mid → Far per Region), `cityById` and `cityPuzzle`.
- `src/ui/app.tsx` -- owns the reducer, the header, screen switching and focus on screen change (grid or `headingRef`).
- `src/ui/app-nav.tsx`, `puzzle-title.tsx`, `puzzle-screen.tsx`, `free-play-screen.tsx`, `sudoku-grid.tsx` (`.grid-card`), `theme.css`, `puzzle.css`.
- `tests/ui/contrast.test.ts` -- `PAIRS` list; `tests/architecture/check-architecture.ts` -- `game` is pure (no `Date`).

## Tasks & Acceptance

**Execution:**
- [x] `src/game/types.ts` -- `Postcard`, `Album = readonly Postcard[]`, `Screen` gains `'album'`, `UiState.activeKey: string | null` and `UiState.albumRegion: Region`. Actions: `cityChosen { cityId }`, `albumRegionChosen { region }` and `freePlayResumed`.
- [x] `src/game/journey.ts` -- `cityKey(id)` → `city:<id>`; `regionCities(region)`; `postcardCount(album, region, tier?)` (ignores unknown ids); `isReachable(album, city)`; `slotPosition(city)` (1–10); `openingRegion(album)` (Region of the last Postcard with a known id, else `europe`); `slotState(state, city)`: `collected | inProgress | reachable | locked`.
- [x] `src/game/session.ts` -- `activeSession(state)` returns `{ key, session } | null`. `createInitialState()` sets `album: []`, screen `album`, `activeKey: null` and `albumRegion: 'europe'`. With a fixture, `activeKey` is `'free'`.
- [x] `src/game/reducer.ts` -- swap every `FREE_PLAY_KEY` read for the active key. Put the session's solve status in one helper, the place where 3.3 hooks `award`. Add `cityChosen` per the matrix, outside `record`, guarded by `isReachable` and `cityPuzzle`. A shared `openSession(state, key)` clears `undo`, `selectedCell`, `currentDigit` and `restartConfirming` only when the key changes (OQ1). Add `albumRegionChosen`. Add `freePlayResumed` (the entry's "Carry on"). In `chooseScreen`, `'album'` sets `albumRegion = openingRegion(album)`, and `'puzzle'` needs an active session. In `freePlayGenerated`, switch `activeKey` to `free` unless a City is active (matrix).
- [x] `src/game/announce.ts` -- use the active key.
- [x] `src/content/copy.ts` -- add `navAlbum`, Region names ("Europe", "Asia", "The Americas"), Tier names, `regionTabCount` ("Europe 4 / 10"), "Where to first?" / "Where to next?", "Travel here", the locked lines, `cityTitle` ("Lisbon · Mid · Medium"), `cityMeta` ("Portugal — Europe, Postcard 5 of 10"), `postmarkDate('2026-10-06')` → "06 OCT 26", and the interim City solve line "Solved. Where to next?" with an "Album" link.
- [x] `src/ui/album-screen.tsx`, `album.css` -- an `h1` (`tabIndex -1`, `headingRef`); a tab row of buttons with `aria-pressed`; a 5-column slot grid labelled with the Region name. Slot states: Reachable/In progress are buttons that dispatch `cityChosen`. Locked is `aria-disabled` (focusable), with no name and no fill. Collected is an interim static card with name and caption, no line and no action; 3.3 restyles it.
- [x] `src/ui/stamp.tsx` -- `Stamp` (with a size prop: 74×88 now, 52×62 in 3.3) and `Postmark` (City name and date), both `aria-hidden`. Glyph font: `--font-family`, `font-variant-emoji: text`.
- [x] `src/ui/puzzle-title.tsx` -- for City sessions, the title, meta line and Stamp. Free Play is unchanged.
- [x] `src/ui/puzzle-screen.tsx`, `puzzle.css` -- read the active session. For City sessions, place the Postmark outside the top-right of `.grid-card` and show the City solve line.
- [x] `src/ui/app.tsx`, `app-nav.tsx`, `free-play-screen.tsx` -- nav "Puzzle · Album · Free Play · Settings", with "Puzzle" enabled when the active session exists. Render the Album. Add a `today?: string` prop for tests; by default the shell builds the local `YYYY-MM-DD`. Free Play "Carry on" dispatches `freePlayResumed`.
- [x] `src/ui/theme.css` -- add any missing tokens (stamp perforation, double rule) as variables with twins.
- [x] Tests:
  - `tests/game/journey.test.ts`: the AC reachability matrix, `openingRegion`, `slotPosition`, `slotState`.
  - `tests/game/city-session.test.ts`: every matrix row, plus the frozen state and the active-key switch for Undo.
  - `tests/ui/album.test.ts`: tabs, counts, empty-Album headings, slot states, focus, "Carry on" exactly as left, and line secrecy (container text, accessible names and live region against every `line`, with a Lisbon-collected fixture for contrast).
  - `tests/ui/puzzle-title.test.ts`: City header, Stamp, Postmark date, and none of them in Free Play.
  - `tests/ui/contrast.test.ts`: add `ink` on `card`, `ink-muted` on `card`, `card` on `airmail-red`, and `rule-thin` on `desk` (non-text).
  - Update `nav.test.ts`, `free-play.test.ts` and `reducer.test.ts` for the Album start and `activeKey`.

**Acceptance Criteria:**
- Given the existing Epic 1–2 suites, when they run against `activeKey`, then they pass with only setup changes.
- Given `npm test`, then the architecture test passes: `game` stays clock-free and `scripts/build-cities` still runs with `journey` importing `CITIES`.

## Implementation Notes

- `journey` also exports `REGIONS`, `isRegion`, `UNLOCK_COUNT`, `isCollected` and `cityOfKey(key)` (the City of a `city:<id>` key; used by the header, Postmark and solve line). `slotState` precedence: collected > inProgress > reachable > locked.
- Reducer: `putSession` writes a Session back; `settle` is the single solve-status helper (3.3 hooks `award` there). `record` skips any step where `activeKey` changes. `cityChosen` with a solved (or missing) Session builds a fresh one and always clears Undo/selection/current digit, even if the key was already active; `openSession` only resets on a key change.
- `freePlayGenerated` while a City is current: if the player is still on the Free Play entry, the new Puzzle opens and becomes current (`activeKey` 'free', screen `puzzle`, Undo cleared), per the 1.8 decision. On any other screen it replaces only `sessions.free` (plus `settings.freePlayDifficulty` and the entry state), closes only a `free` Hint, and leaves `screen`, `activeKey`, `undo`, `selectedCell` and `meta` alone.
- The Album keeps its Region tab across visits. `ui.albumSeen` (the Album length at the last visit) is UI-only; when the Album has grown since then, opening it switches to `openingRegion(album)`.
- Slots carry explicit accessible names (`copy.slotLabel` / `copy.slotLockedLabel` with "n of 3" progress); Collected slots show a visible "Collected" caption. Unlock count and Region size come from `UNLOCK_COUNT` and `regionCities().length`, not copy literals.
- `announce` keys on `prev.ui.activeKey` and is silent when the active key changes (so `cityChosen`/`freePlayResumed` never speak).
- `SudokuGrid` gained a `decoration` prop; the Postmark renders inside `.grid-card` but outside `role="grid"`, positioned wholly above the frame's top-right corner (64px, half overhang), so neither cells nor the frame line cross its text. The date never wraps; names break only between words (no `overflow-wrap: anywhere`), with mixed-case Postmark names and tighter Stamp tracking. `.puzzle-screen--city` adds top padding for it.
- Stamp/Postmark styles live in `src/ui/stamp.css`. New size/type tokens in `theme.css`; no new colour roles (Stamp uses `airmail-red`/`card`/`desk`, Postmark uses `postmark`), so Lamplight twins come from the existing role swap.
- `src/ui/today.ts` (`localDate`) builds the local `YYYY-MM-DD`; `App` and `PuzzleScreen` accept `today?` for tests.
- Manual checks (glyph rendering across browsers, Daylight/Lamplight visual pass, Postmark overlap) were not run: no browser available to the implementing agent. No glyph was swapped.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | blind, smoke, impl | A Free Play reply while a City is current leaves the waiting player on the entry | medium | patch | This conflicts with the 1.8 human decision "if the entry is still showing, it opens". The 3.2 decision covers only "player moved to another screen". |
| 2 | VG | Puzzle actions in a City (Hint apply, definition, Notes, clear, Restart, announce) are untested | medium | patch | Every such test starts with Free Play active; leaving one site on `FREE_PLAY_KEY` passes everything. |
| 3 | VG | `localDate` is untested | medium | patch | Dropping `+1` or the padding blanks the Postmark date. |
| 4 | VG | The `freePlayGenerated` City branch leaves settings, `picked` and the free-owned Hint unpinned | low | patch | Dropping `settings` or the Hint guard passes. |
| 5 | blind | The Album forgets the chosen Region tab | low | patch | `chooseScreen` always resets to `openingRegion`. |
| 6 | blind | Slot names run together; locked slots sound identical; Collected has no cue | low | patch | Accessible name "ParisFrance · NearTravel here"; no collected styling or text. |
| 7 | blind | Copy literals "3" and "10" duplicate journey constants | low | patch | Changing the rule would leave the copy stale. |
| 8 | blind | Contrast pairs missing: `airmail-red` on `card`, `ink-muted` on `desk` | low | patch | Both are real text in the Album. |
| 9 | smoke | The Postmark date wraps, the grid frame strikes the date, and names break mid-word | low | patch | Screenshots `zoom-rio.png` and `zoom-luang.png`; "NETHERLAND / S" on the Stamp. |
| 10 | blind, edge | The Postmark date isn't tied to the Puzzle (midnight; viewing date vs solve date) | low | reject | 3.2 shows today's travel date; 3.3 owns the Postcard's `collectedOn`. The midnight edge is negligible. |
| 11 | blind | Initial `albumRegion` is hard-coded | low | reject | No saved Album exists until Epic 4, which loads through the same reducer path. |
| 12 | blind, edge | `cityChosen` for a collected City creates a fresh Session | low | reject | The UI offers no action; replay semantics belong to 3.4. |
| 13 | edge | Forged `freePlayResumed` on a solved Free Play; unknown `city:` key; bad date strings; heading with unknown ids | low | reject | Unreachable from the UI and the typed data. |
| 14 | edge | Test setup changes beyond "setup only" | low | reject | The first-load assertions changed because the start screen intentionally changed (UX launch rule). |
| 15 | blind | Spec bookkeeping and the skipped manual checks | — | reject | The manual browser check has now run (below). |

Real-browser check (Chrome 155, Edge 154; 1280 and 900px; both themes): all 30 Stamp glyphs render as single-colour text glyphs (Segoe UI Symbol or Book Antiqua), with no colour emoji and no tofu. The Album, reachability, City round trip, per-Puzzle Undo and Lamplight all pass with no console, CSP or network errors. No Postcard line is visible anywhere.

Recheck after the fixes (Chrome 155, Edge 154; 1280 and 900px; both themes): the Postmark date stays on one line, the frame line clears the Postmark text, no names break mid-word (Luang Prabang, Ulaanbaatar, Netherlands), and nothing overlaps or scrolls. A Free Play Puzzle that finishes while the player waits on the entry now opens. In Lamplight the Postmark is faint against the dark background; it is decorative by design (75% opacity).

## Design Notes

- **`activeKey`:** this is the seam for 3.5's "current Puzzle" and for 3.4's replay, which reuses `cityChosen`'s builder. It is UI state and is never saved.
- **Interim states:** until 3.3 ships, a solved City shows "Solved. Where to next?" and the Collected slot is plain. Both are replaced in 3.3.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.
- `npm run build:cities` -- expected: no file changes (journey import still works under Node).

**Manual checks:**
- **Glyphs (first real render):** In Chrome, Edge, Firefox and Safari (if available), view a 74×88 `<Stamp>` for all 30 `CITIES`. To do this, temporarily edit `src/main.tsx` to render them in a grid, run `npm run dev`, and do not commit the edit. Also travel to one City per Tier through the real Album. Each glyph must render single-colour `card` on the red face, with no colour emoji and no tofu box; check ⛵︎ and ⚓︎ especially. If a glyph fails, swap it in `cities.json` (ids unchanged, no repeats) and record it in Implementation Notes.
- In Daylight and Lamplight, check the Album, slots, Stamp and Postmark. The Postmark never overlaps cells. Nav current marker; Album focus lands on the heading.
