---
title: 'Story 3.3: Receive a Postcard'
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

**Problem:** Solving a City Puzzle ends on an interim line ("Solved. Where to next?"). Nothing is awarded, `album` never grows and Mid/Far never open, so the journey has no payoff.

**Approach:** The step that completes a City's solution awards a Postcard through `journey.award` (date passed in by the shell). An unrevealed Postcard takes over the Puzzle screen: the solved grid stays visible but inert, and the Postcard slides onto it. "Add to Album" or Esc reveals it and opens the Album, where the slot is now Collected and marked "just arrived".

## Boundaries & Constraints

**Always:** Every story AC (epics.md, Story 3.3) holds. The core never reads the clock. `album` entries keep the 3.2 shape, at most one per City, in the order collected. A line reaches the DOM, accessible names or the live region only for a City in `album`. The only motion is the Postcard arrival and the "just arrived" entrance. Both run after the solve, with input already stopped, and neither moves under `prefers-reduced-motion`. No sound, flashing or confetti. Tokens only, with `-lamplight` twins. Copy lives in `copy.ts`. The Postcard component can be reused by 3.4: the action label and handler are props.

**Never:** The Postcard viewer, replay or "Solved again" (3.4). The launch rule, `lastPlayedKey` rules or "No rush" (3.5). Persistence (Epic 4). A dispatchable `puzzleSolved`. A scrim or overlay on an in-progress grid. Dismissing the Postcard by clicking outside it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First solve | `city:<id>` not in `album`; completing `digitEntered`/`cellClicked`/`currentDigitPlaced`/`hintApplied` with `date` | same step: `solved` + `{ cityId, collectedOn: date, revealed: false }` appended | N/A |
| Free Play / collected | `free` key, or City already in `album` | solved; `album` same reference | N/A |
| Bad date | completing step on uncollected City, `date` not `YYYY-MM-DD` | step refused (same state) | ignored |
| Reveal gate | any unrevealed Postcard with a known City | screen `puzzle`, `activeKey` = its key (Undo/selection cleared on key change), Session solved (built from content if missing or not solved) | unknown ids skipped |
| Blocked | while pending, any action except `postcardAdded`, `freePlayGenerated`, `freePlayFailed` | same state | N/A |
| Add | `postcardAdded { cityId }` for the first pending | `revealed: true`; next pending shows, else screen `album`, `albumRegion` = its Region, `albumSeen` = length, `justArrived` += id | other id → same state |
| Several | two unrevealed | shown one at a time, oldest first | N/A |

**Decisions (planner, 2026-10-07):** These cover choices the player wouldn't notice. Revisit them if they look wrong.
- `date: string` is required on all four solving actions, because `cellClicked` and `currentDigitPlaced` can complete a grid too. `keyToAction` returns an undated action, and `PuzzleScreen` stamps `today` onto every action before it dispatches.
- `award(state, key, collectedOn): AppState` returns `state` itself when it adds nothing. `pendingPostcard(album)` lives in `journey`. `showPendingPostcard(state)` is exported from the reducer, runs after every step and at `App` init, and becomes the first clause of 3.5's launch rule.
- `ui.justArrived: readonly string[]` is UI-only. Entering the Album through `screenChosen` clears it; Region tabs keep it.
- While the Postcard shows, the City solve line is hidden. After the reveal, a revisited first-solved City keeps "Solved. Where to next?".
- Arrival motion: rises 24px with a fade-in over about 500ms ease-out, `animation-fill-mode: both`. "just arrived": the outline and caption fade in over about 400ms. The global reduced-motion rule in `theme.css` makes both static.

**Decisions (human, 2026-10-07):**
- **Placeholder line:** a collected placeholder City's Postcard shows its line exactly as written ("PLACEHOLDER: Postcard line for {name} (TS-40).") until TS-40 replaces it; the deploy gate keeps it from players.
- **Header nav:** inert while the Postcard is showing, so "Add to Album" is the only way forward.
- **Postmark:** the Postcard's Postmark reuses 3.2's Postmark with the City name in mixed case.
- **Size:** the spec is kept whole, at about 2,000 tokens.

</frozen-after-approval>


## Code Map

- `src/game/types.ts` -- `Action` (the four solving actions), `UiState`.
- `src/game/reducer.ts` -- `settle` is the solve hook. `applyDigit`/`applyHint` and the `step`/`reduce` dispatch; `openSession`, `chooseScreen` (`albumSeen`), `freePlay`.
- `src/game/journey.ts` -- `cityKey`, `cityOfKey`, `isCollected`, `openingRegion`, `slotState`.
- `src/game/announce.ts` -- already says "Solved" (and "… Solved" on a Hint).
- `src/ui/keyboard.ts` -- `keyToAction`, `useKeyboard` (skips `defaultPrevented`), `useEscape`.
- `src/ui/app.tsx` -- reducer init, focus on screen change, header and nav.
- `src/ui/puzzle-screen.tsx`, `sudoku-grid.tsx`, `album-screen.tsx` (interim Collected), `stamp.tsx` (`Stamp size="postcard"`, `Postmark`), `theme.css` (reduced-motion rule at line ~304), `copy.ts`.
- Mockup: `_bmad-output/planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/mockups/key-postcard-reveal.html` (`.reveal`, `.pc`).

## Tasks & Acceptance

**Execution:**
- [ ] `src/game/types.ts` -- add `date` to the four solving actions; add an `UndatedAction` helper type; add `postcardAdded { cityId }` and `UiState.justArrived`.
- [ ] `src/game/journey.ts` -- `award`, `pendingPostcard` (first `revealed: false` entry with a known City).
- [ ] `src/game/session.ts` -- initial `justArrived: []`.
- [ ] `src/game/reducer.ts` -- thread `date` through `applyDigit`/`applyHint` into `settle`. On an `inProgress → solved` transition, call `award`, refusing the step on a bad date. Add the reveal gate and the blocked-action rule. Add `postcardAdded` (outside `record`). `chooseScreen('album')` clears `justArrived`.
- [ ] `src/content/copy.ts` -- `postcardFrom(city)`, `addToAlbum`, `addressTo`, `addressAlbum(region)`, `addressCity(city, country)`, `justArrived`. Drop `slotCollected`.
- [ ] `src/ui/postcard.tsx`, `postcard.css` -- the Postcard: a `section` labelled "Postcard from {City}"; the line `p` with an id; a 1px `rule-thin` divider; the right half has the Postmark (`collectedOn`) over a 52×62 Stamp and three ruled address lines; one primary button with `aria-describedby` → the line. It focuses that button on mount and registers `useEscape` on itself. Stripe, shadow and rotation per DESIGN, via new `--airmail-stripe` and `--shadow-postcard` tokens (with twins) in `theme.css`.
- [ ] `src/ui/keyboard.ts` -- `keyToAction` returns `UndatedAction`.
- [ ] `src/ui/puzzle-screen.tsx`, `sudoku-grid.tsx`, `puzzle.css` -- stamp `date` onto every action. When `pendingPostcard` is this City, make `.grid-card` and `.side-column` `inert`, hide the solve line, and render `<Postcard key={cityId}>` absolutely over the grid with the `postcard-arrive` animation.
- [ ] `src/ui/app.tsx`, `app-nav.tsx` -- init through `showPendingPostcard`; apply OQ2 to the nav.
- [ ] `src/ui/album-screen.tsx`, `album.css` -- the Collected slot per the AC (stripe top edge, line in `meta` italic). For `justArrived` ids, add a 2px `airmail-red` outline, the "just arrived" caption and the entrance animation.
- [ ] Tests:
  - `tests/game/journey.test.ts` -- `award` (free, collected, unknown, append order) and `pendingPostcard`.
  - New `tests/game/postcard.test.ts` -- every matrix row, the date passed in with the action, and the gate letting a generator reply through.
  - New `tests/ui/postcard.test.ts` -- reveal DOM and ARIA, `inert`, focus, Esc, an outside click doing nothing, the Album after "Add to Album" (heading, Region, count +1, focus, "just arrived" gone on the next visit), the fixture reveal at launch (two, oldest first), the third Near Postcard opening Mid, the CSS (`prefers-reduced-motion`, stripe, −1°), and the UJ-1 Lisbon flow.
  - Update `album.test.ts` secrecy (Collected now shows its own line; uncollected lines stay hidden) and `contrast.test.ts` (`rule-thin` on `card`, non-text). Add `date` to existing dispatches.

**Acceptance Criteria:**
- Given `npm test`, then the existing suites pass with only setup changes, and the architecture test still finds `game` clock-free.
- Given a reveal, when any digit, N, M, H or arrow key is pressed on "Add to Album", then state is unchanged; when Esc is pressed, then `postcardAdded` is dispatched once.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

**Calm reconciliation:** the calm rules forbid motion and overlays *while solving*. The reveal starts only after `solved`, with input stopped and the grid `inert`, so it is the one sanctioned moment. Reduced motion is already handled globally in `theme.css`; the keyframes only need to end on the resting pose.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.
- `npm run build:cities` -- expected: no file changes.

**Manual checks:**
- In Chrome and Edge, in Daylight and Lamplight, with reduced motion off and on: play the UJ-1 Lisbon flow. Check the stripe, the tilt, the Postcard covering the grid without clipping at 900px, the Postmark over the Stamp, "just arrived", and that nothing moves while solving.
