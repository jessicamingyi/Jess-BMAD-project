---
title: 'Story 3.4: Revisit Postcards and replay Cities'
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

**Problem:** A Collected Album slot is a static `div`. The player can't look at a Postcard again or replay a City. `cityChosen` on a collected, solved City quietly builds a fresh Session with no confirm (3.2 triage #12). A replay solve shows the first-solve line.

**Approach:** A Collected slot opens a non-blocking Postcard viewer over the Album. The viewer reuses 3.3's `Postcard` component with "Play again", which builds a fresh Session from content. If a replay is already in progress, it first asks inline ("Start fresh" / "Keep going"). A Collected slot with a replay in progress adds "Carry on". A replay solve awards nothing and shows "Solved again. {City} is already in your Album." with an Album link.

## Boundaries & Constraints

**Always:** Every story AC (epics.md, Story 3.4) holds. `album` is never changed by viewing, replaying or solving again (same reference). The Session keeps the AD-10 shape, with no new fields. A fresh replay = `createSession(key, cityPuzzle(id))` with Undo, selection, current digit, Restart confirm and that Session's Hint cleared. Opening or replaying never sets `meta.lastPlayedKey` (3.5). Other Sessions are never touched. The viewer is open only for a revealed Postcard of a known City. Copy lives in `copy.ts`. Tokens only, with `-lamplight` twins.

**Never:** The launch rule, `lastPlayedKey` changes or "No rush" (3.5). Persistence (Epic 4). A scrim, `inert` or `aria-modal` on the viewer. "Play again" anywhere except the viewer. A second Postcard or a new `collectedOn`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| View | `postcardViewed { cityId }` for a revealed Postcard | `ui.viewer = { cityId, confirming: false }` | uncollected, unrevealed, unknown → same state |
| Close | `postcardViewerClosed` | `ui.viewer = null` | already closed → same state |
| Play again, none in progress | `replayRequested` with the viewer open; Session missing or solved | fresh Session, `activeKey` = key, screen `puzzle`, viewer null, key removed from `solvedAgain` | no viewer → same state |
| Play again, replay in progress | same, Session `inProgress` | `viewer.confirming = true` | N/A |
| Start fresh | `replayConfirmed` while confirming | as "none in progress" | not confirming → same state |
| Keep going / Carry on | `replayKept` while confirming, or `cityChosen` on a collected City in progress | the same Session opens on `puzzle` (Undo kept only if it was already current) | N/A |
| Collected, not in progress | `cityChosen` | same state (closes 3.2 #12) | N/A |
| Solve again | the completing step on a collected City | `solved`; `album` same reference; key added to `ui.solvedAgain` | N/A |
| Leave | `screenChosen`, `albumRegionChosen`, `cityChosen` | viewer null | N/A |

**Decisions (planner, 2026-10-07):** These cover choices the player wouldn't notice. Revisit them if they look wrong.
- Viewer state lives in the reducer: `ui.viewer: { cityId; confirming } | null`. New actions: `postcardViewed`, `postcardViewerClosed`, `replayRequested`, `replayConfirmed`, `replayKept`. None is recorded in Undo, and all are blocked while a Postcard is pending (the 3.3 gate).
- "Solved again" comes from `ui.solvedAgain: readonly string[]` (UI only), set by `settle` when a collected City goes `inProgress → solved`. This keeps the AD-10 Session shape. A first-solved City revisited through "Puzzle" keeps "Solved. Where to next?". After an Epic 4 reload, a solved replay shows that first-solve line. That is acceptable.
- `SlotState` gains `'collectedReplay'` (collected and Session `inProgress`).
- The Collected slot becomes a native `button` (the face), labelled `slotLabel(name, country, tier, 'See Postcard')`. With a replay in progress, a sibling "Carry on" button sits in the same `li`.
- Esc closes the viewer through the Postcard's `useEscape` and a `useDocumentEscape` registered by the Album while the viewer is open. The viewer's Postcard is `role="dialog"` without `aria-modal`.
- On close, focus returns to the opener's face button. A click outside that lands on a focusable control keeps focus there.

**Decisions (human, 2026-10-07):**
- **Replay confirm:** the group label reads "Start {City} again?", with the sentence "This replaces your replay in progress." and the buttons "Start fresh" / "Keep going".
- **Outside click:** a click outside the Postcard viewer closes it, and the click also does its own action (non-blocking).
- **Esc during the confirm:** Esc while "Start fresh / Keep going" is showing closes the whole viewer.
- **Viewer placement:** the viewer appears in place, centred over the slot grid, the same width as the reveal, with no scrim and no motion.
- **Size:** the spec is kept whole, at about 1,900 tokens.

</frozen-after-approval>


## Code Map

- `src/game/types.ts` -- `UiState`, `Action`.
- `src/game/session.ts` -- initial `ui`.
- `src/game/reducer.ts` -- `settle`; `chooseCity` (fresh/resume branch to share); `openSession`, `showPuzzle`, `chooseScreen`; `UNBLOCKED`.
- `src/game/journey.ts` -- `slotState`, `isCollected`, `cityKey`.
- `src/ui/postcard.tsx` -- `actionLabel`/`onAction`/`onEscape`/`modal`; focuses its button on mount.
- `src/ui/album-screen.tsx`, `album.css` -- Collected `div` (to become a button), `.album-slot-action` (small-caps `airmail-red`).
- `src/ui/free-play-screen.tsx` -- the replace-confirm markup to mirror (`action-row--confirm`, `keepGoingRef`).
- `src/ui/puzzle-screen.tsx` -- solved lines; `src/ui/puzzle.css` `.postcard-reveal` sizing.
- `src/ui/keyboard.ts` -- `useEscape`, `useDocumentEscape`.
- `tests/ui/postcard.test.ts` -- the `nearly()` fixture helper (nearly-solved state).

## Tasks & Acceptance

**Execution:**
- [ ] `src/game/types.ts`, `src/game/session.ts` -- add `ui.viewer` and `ui.solvedAgain` (initially `null` / `[]`) and the five actions with doc comments.
- [ ] `src/game/journey.ts` -- add `'collectedReplay'` to `slotState`.
- [ ] `src/game/reducer.ts` -- factor `freshCitySession(state, key, puzzle)` out of `chooseCity`. Add the viewer and replay actions per the matrix. `chooseCity` on a collected City: resume if `inProgress`, else same state. `settle` marks `solvedAgain`. `chooseScreen`, `albumRegionChosen` and `showPuzzle` clear `viewer`.
- [ ] `src/content/copy.ts` -- `playAgain`, `startFresh`, `slotSeePostcard`, `solvedAgain(city)`, plus the confirm label and text (OQ1). Reuse `keepGoing` and `slotCarryOn`.
- [ ] `src/ui/postcard.tsx` -- optional `confirm?: ReactNode` rendered in place of the primary button. Non-modal `role="dialog"`.
- [ ] `src/ui/album-screen.tsx`, `album.css` -- the Collected face button and the "Carry on" button. Render the viewer (OQ4) with `<Postcard actionLabel={copy.playAgain}>`. The inline confirm mirrors Free Play's markup, with focus on "Keep going" when it opens. Add outside-click handling (OQ2), Esc (OQ3) and focus return to the slot. Add a forced-colors edge.
- [ ] `src/ui/app.tsx` -- wire the Album callbacks to the new actions.
- [ ] `src/ui/puzzle-screen.tsx` -- for a solved City in `ui.solvedAgain`, show `copy.solvedAgain(city.name)` plus the Album link instead of `solvedCity`.
- [ ] Tests:
  - New `tests/game/replay.test.ts`: every matrix row, the gate blocking the new actions, other Sessions untouched, and `lastPlayedKey` unchanged by opening.
  - `tests/game/journey.test.ts`: `collectedReplay`.
  - Move `nearly()` into `tests/ui/city-fixtures.ts` (shared with `postcard.test.ts`).
  - New `tests/ui/replay.test.ts` (fixture states only, no whole-Puzzle solves): viewer DOM (Postmark = `collectedOn`, "Play again", focus), Enter on a slot, Esc and an outside click returning focus, the confirm and its focus, "Carry on", the fresh grid, and "Solved again" after one keyed digit, with the slot back to plain Collected.
  - Update `album.test.ts` (Collected is now a button; secrecy unchanged). Add `contrast.test.ts` pairs only if new ones appear.

**Acceptance Criteria:**
- Given `npm test`, then existing suites pass with only setup changes, and the suite stays at about 15s.
- Given a replay solved through `hintApplied`, then `album` is the same reference and "Solved again" shows.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.

**Manual checks:**
- In Chrome, in Daylight and Lamplight: open Lisbon's Postcard from the Album and check the viewer over the slots, the Postmark date, Esc and an outside click. Play again, leave midway and check "Carry on". Play again → confirm → Start fresh / Keep going. Solve and check "Solved again" and that the Album count is unchanged.
