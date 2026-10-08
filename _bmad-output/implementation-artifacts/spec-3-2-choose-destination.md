---
title: 'Story 3.2: Choose a destination from the Album'
type: 'feature'
created: '2026-10-07'
status: 'draft'
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
- [ ] `src/game/types.ts` -- `Postcard`, `Album = readonly Postcard[]`, `Screen` gains `'album'`, `UiState.activeKey: string | null` and `UiState.albumRegion: Region`. Actions: `cityChosen { cityId }`, `albumRegionChosen { region }` and `freePlayResumed`.
- [ ] `src/game/journey.ts` -- `cityKey(id)` → `city:<id>`; `regionCities(region)`; `postcardCount(album, region, tier?)` (ignores unknown ids); `isReachable(album, city)`; `slotPosition(city)` (1–10); `openingRegion(album)` (Region of the last Postcard with a known id, else `europe`); `slotState(state, city)`: `collected | inProgress | reachable | locked`.
- [ ] `src/game/session.ts` -- `activeSession(state)` returns `{ key, session } | null`. `createInitialState()` sets `album: []`, screen `album`, `activeKey: null` and `albumRegion: 'europe'`. With a fixture, `activeKey` is `'free'`.
- [ ] `src/game/reducer.ts` -- swap every `FREE_PLAY_KEY` read for the active key. Put the session's solve status in one helper, the place where 3.3 hooks `award`. Add `cityChosen` per the matrix, outside `record`, guarded by `isReachable` and `cityPuzzle`. A shared `openSession(state, key)` clears `undo`, `selectedCell`, `currentDigit` and `restartConfirming` only when the key changes (OQ1). Add `albumRegionChosen`. Add `freePlayResumed` (the entry's "Carry on"). In `chooseScreen`, `'album'` sets `albumRegion = openingRegion(album)`, and `'puzzle'` needs an active session. In `freePlayGenerated`, switch `activeKey` to `free` unless a City is active (matrix).
- [ ] `src/game/announce.ts` -- use the active key.
- [ ] `src/content/copy.ts` -- add `navAlbum`, Region names ("Europe", "Asia", "The Americas"), Tier names, `regionTabCount` ("Europe 4 / 10"), "Where to first?" / "Where to next?", "Travel here", the locked lines, `cityTitle` ("Lisbon · Mid · Medium"), `cityMeta` ("Portugal — Europe, Postcard 5 of 10"), `postmarkDate('2026-10-06')` → "06 OCT 26", and the interim City solve line "Solved. Where to next?" with an "Album" link.
- [ ] `src/ui/album-screen.tsx`, `album.css` -- an `h1` (`tabIndex -1`, `headingRef`); a tab row of buttons with `aria-pressed`; a 5-column slot grid labelled with the Region name. Slot states: Reachable/In progress are buttons that dispatch `cityChosen`. Locked is `aria-disabled` (focusable), with no name and no fill. Collected is an interim static card with name and caption, no line and no action; 3.3 restyles it.
- [ ] `src/ui/stamp.tsx` -- `Stamp` (with a size prop: 74×88 now, 52×62 in 3.3) and `Postmark` (City name and date), both `aria-hidden`. Glyph font: `--font-family`, `font-variant-emoji: text`.
- [ ] `src/ui/puzzle-title.tsx` -- for City sessions, the title, meta line and Stamp. Free Play is unchanged.
- [ ] `src/ui/puzzle-screen.tsx`, `puzzle.css` -- read the active session. For City sessions, place the Postmark outside the top-right of `.grid-card` and show the City solve line.
- [ ] `src/ui/app.tsx`, `app-nav.tsx`, `free-play-screen.tsx` -- nav "Puzzle · Album · Free Play · Settings", with "Puzzle" enabled when the active session exists. Render the Album. Add a `today?: string` prop for tests; by default the shell builds the local `YYYY-MM-DD`. Free Play "Carry on" dispatches `freePlayResumed`.
- [ ] `src/ui/theme.css` -- add any missing tokens (stamp perforation, double rule) as variables with twins.
- [ ] Tests:
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

## Spec Change Log

## Review Triage Log

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
