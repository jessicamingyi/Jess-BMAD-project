---
title: 'Story 1.4: Undo and Restart'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: '34e6792eed7a59025f243d47e01810d7d341cfca'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Players can't take back a move or start a Puzzle over, so trying an idea can cost them their progress.

**Approach:** Record a `{ digits, notes }` snapshot in `ui.undo` before every change to the grid. "Undo" pops one snapshot at a time. "Restart" asks for confirmation inline in the action row, then clears to the Givens; it stores a snapshot first, so a single Undo brings everything back.

## Boundaries & Constraints

**Always:** Undo history lives only in `ui.undo` (never in `sessions`, `settings`, `album` or `meta`), with no limit. Only actions that change a session's `digits` or `notes` record an entry; no-ops, selection and mode switches record nothing and return the same state object. A solved Puzzle stays solved: Undo and Restart do nothing after the solve. The Restart confirm replaces the action row inline: no overlay, and the grid neither moves nor is covered. Restart keeps `status: 'inProgress'`. Copy goes in `src/content/copy.ts`, styling uses tokens only, and actions are named `undoRequested`, `restartRequested`, `restartCancelled`, `restartConfirmed`.

**Never:** redo, a confirm dialog or modal, Undo across reload, Hint button (Epic 2), keyboard shortcut handling (Ctrl/Cmd+Z and Esc are wired in 1.5; only the captions show now).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Undo chain | place 5, place 8, Note 3 elsewhere, clear 8; Undo ×4 | each Undo reverts exactly one change, in reverse; the grid ends at the Givens with Notes 0 | N/A |
| No-op records nothing | digit on a Given, `cellSelected`, mode switch | `ui.undo` unchanged; same state object | N/A |
| Empty history | `undoRequested` with `ui.undo` empty | same state object | silent |
| Confirm open / keep going | `restartRequested`, then `restartCancelled` | `ui.restartConfirming` true, then false; `sessions` untouched | N/A |
| Restart | `restartConfirmed` with digits and Notes on the grid | `digits = givens`, every mask 0, `inProgress`; confirm closed; one snapshot pushed | N/A |
| Undo restart | `undoRequested` right after a restart | the full pre-restart digits and Notes come back | N/A |
| Restart on a clean grid | `restartConfirmed` when digits = givens and Notes are all 0 | confirm closes; no undo entry | N/A |
| Solved | `undoRequested` / `restartRequested` / `restartConfirmed` after the solve | same state object; stays `solved` | silent |

</frozen-after-approval>

## Code Map

- `src/game/types.ts` -- `UiState` (`selectedCell`, `entryMode`, `inputMode`, `currentDigit`) and the `Action` union. Add `undo: readonly UndoEntry[]` (`UndoEntry = { digits: string; notes: readonly number[] }`) and `restartConfirming: boolean`. Defaults (`[]`, `false`) go in `src/game/session.ts` `createInitialState`.
- `src/game/reducer.ts` -- all grid changes go through `applyDigit(state, cell, digit)`, which already returns the same object on a no-op. Wrap the existing switch: compute `next`; if `next.sessions.free.digits/notes` differ from `state`'s, push the previous `{ digits, notes }` onto `next.ui.undo`. Handle `undoRequested` and `restart*` before the wrapper so they aren't recorded twice.
- `src/ui/puzzle-screen.tsx` -- side column: `ModeIndicator`, `DigitPad`, "Solved." line. Add the action row after the pad.
- `src/ui/puzzle.css`, `src/ui/theme.css` -- tokens: `--rule-frame`, `--color-ink`, `--color-card`, `--color-rule-box`, `--type-button-*`, `--type-caption-*`.
- `tests/ui/puzzle-screen.test.ts` -- the `renderToStaticMarkup(PuzzleScreen)` pattern; `tests/game/reducer.test.ts` -- `run(state, ...actions)` helpers.

## Tasks & Acceptance

**Execution:**
- [x] `src/game/types.ts`, `src/game/session.ts` -- new ui fields and the four actions.
- [x] `src/game/reducer.ts` -- the undo-recording wrapper. `undoRequested` pops the last entry and restores it (status `inProgress`, sets `meta.lastPlayedKey`). `restartRequested` / `restartCancelled` toggle `restartConfirming` (no-op when solved or already in that state). `restartConfirmed` closes the confirm, resets `digits` and `notes` when they differ from the start, and pushes a snapshot.
- [x] `tests/game/reducer.test.ts` -- one test per matrix row; Undo never touches `ui.selectedCell` or the modes.
- [x] `src/ui/action-row.tsx` -- default state: "Undo" and "Restart" default buttons, each with a `caption` key line ("Ctrl+Z" / "⌘Z" on macOS, from `keyCaption(platform)`; Restart has no caption). Confirm state: the text "Clear your digits and Notes? The Givens stay.", a "Restart" default button and a "Keep going" primary button. Focus moves to "Keep going" when the confirm opens and back to "Restart" when it closes.
- [x] `src/ui/puzzle.css` -- UX-DR13 default button (transparent, `ink` text, 3px double `rule-box`, `button` small-caps, square corners) and primary button (`ink` fill, `card` text, 3px double `card` border, 2px solid `ink` outline). The confirm keeps the row's height steady enough that the grid never moves.
- [x] `src/content/copy.ts` -- the button labels, captions and confirm text.
- [x] `src/ui/puzzle-screen.tsx` -- render `ActionRow` after the pad and wire the four actions.
- [x] `tests/ui/` -- static render of both row states (labels, caption, primary class on "Keep going"); `keyCaption` for Mac and non-Mac platform strings.

**Acceptance Criteria:**
- Given the side column, when it renders, then Undo and Restart appear as default buttons with the key caption in `caption` `ink-muted`.
- Given the Restart confirm is showing, then it replaces the action row inline and nothing overlays or shifts the grid.

## Implementation Notes

- `reducer` handles `undoRequested` / `restart*` directly and routes every other action through `record(state, step(state, action))`, which compares the session's `digits`/`notes` before and after.
- Any grid change (a recorded entry, or an Undo) closes an open Restart confirm in the reducer, so a solve can never leave it open. Opening is refused once solved.
- Focus goes back to "Restart" on close only if focus was in the action row. `ActionRow` tracks this with focus/blur on its container: once the focused "Keep going" unmounts, `document.activeElement` is `<body>`, and the lint rules forbid reading refs during render. A blur with no `relatedTarget` doesn't count as leaving the row.
- The confirm group is labelled "Restart the Puzzle?". Both confirm buttons point `aria-describedby` at the question.
- Undo stays enabled when history is empty (it does nothing); the spec doesn't ask for a disabled state.
- `tsconfig.node.json` now includes the `DOM` lib: the tests type-check `src/ui/action-row.tsx`, and that file calls `HTMLButtonElement.focus()`.
- The Undo caption is `aria-hidden`, so the button's accessible name stays "Undo". `aria-keyshortcuts` waits for 1.5, when the shortcut actually works.

## Spec Change Log

## Review Triage Log

Pass 1 (blind = B, edge-case = E, verification-gap = V).

| Finding | Verdict | Evidence | Route |
|---|---|---|---|
| B1/B2/E1/E2/B3/V2 confirm left open across a solve or grid change; focus jumps from the grid to an inert Restart | medium | `restartConfirming` is never cleared on solve; the `PuzzleScreen` mask flips the prop, and the effect focuses Restart. Shared root cause: grid changes don't close the confirm. | patch |
| B5 confirm question not tied to its buttons for screen readers | low | Focus lands on "Keep going" with no description; adding `aria-describedby` is direct. | patch |
| B8 Restart on a Notes-only grid (`clean` notes branch) untested | low | Only digits-and-Notes and fully clean grids are tested. | patch |
| V1/V2 focus hand-off and click wiring have no DOM test | medium | Pre-verified: `renderToStaticMarkup` doesn't run effects; no jsdom in the repo. Adopting a DOM test setup is a cross-story decision. | defer |
| B4/E3 Undo/Restart not disabled when solved or history is empty | low | The forgiving rules make refusal silent; the spec asks for no disabled state (same as the pad, 1.2 E9). | reject |
| B6/E4 iPhone/iPad get "Ctrl+Z" | low | Platform is desktop browsers only (epic context). | reject |
| B7 the confirm may grow past the shared min-height on narrow widths | low | Measured equal at 1280px; narrow layouts are outside the desktop scope. | reject |
| B9 `DOM` lib in `tsconfig.node.json` | low | Only `vite.config.ts` and tests compile there; no harm path named beyond hypothetical misuse; the fix needs a new tsconfig. | reject |
| B10 `record()` hard-codes `sessions.free` and reads `prev.ui.undo` | low | Only one session exists until Epic 3; no `step` case touches `ui.undo`. | reject |
| B extra: no `:hover`/`:active` button styles | low | Not in UX-DR13; cosmetic. | reject |
| E5 confirm opens on a clean grid | low | The spec decided this: confirming on a clean grid just closes. | reject |
| E6 `restartCancelled` after solve returns a new state | low | Documented deviation; moot once grid changes close the confirm. | reject |

## Design Notes

- **Recording in one place:** the wrapper compares the session's `digits`/`notes` before and after, so every current and future grid-changing action (including 1.5's keyboard clear) is undoable for free. `ui`-only changes never record.
- **Platform detection** stays in `ui/` (`navigator` is banned in `game/`): `keyCaption(navigator.platform)` returns "⌘Z" when it contains "Mac", otherwise "Ctrl+Z".

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0

**Manual checks (if no CLI):**
- `npm run preview` in headless Chrome: place digits and Notes, Undo step by step back to the start, Restart → Keep going, then Restart → Restart → Undo. Screenshot the confirm state and check the grid hasn't moved.
