# Epic 2 Context: Hints that teach

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give a stuck player a Hint that teaches rather than tells: a three-step panel that goes "Show a nudge" → "Explain it" → "Show me the move", names the Technique and the cells involved, offers a short "What's a {technique}?" definition, and points out a Mistake gently instead of reasoning from it. A full but wrong grid gets the calm line "Something doesn't fit yet — want a hint?" and never a game over. Hints reuse the Epic 1 solver and `Step` model so they always agree with the Puzzle's grade. Cities/Postcards (Epic 3) and saving (Epic 4) are out of scope.

## Stories

- Story 2.1: Get a nudge and an explanation for the next move
- Story 2.2: Show me the move
- Story 2.3: What's a [Technique]?
- Story 2.4: Hints that find Mistakes, and "Something doesn't fit yet"

## Requirements & Constraints

- **Hint content:** names the Technique, highlights the cells involved, explains the move in one or two plain sentences. Covers the five Techniques only (naked single, hidden single, naked pair, pointing, claiming).
- **Three steps, one per request:** nudge (Technique + row/column/box to look at) → explanation of the whole chain → place the move. One H press or click never skips a step.
- **Respect the player's grid:** Hints use the current digits (and solution) only, computing candidates themselves; Notes never affect a Hint, and asking for a Hint never changes Notes.
- **Mistakes first:** if any player digit differs from the solution, the Hint reports the first Mistake in row-major order (never a Given) instead of a Technique chain, regardless of the Mistake Assist setting. Its "move" clears that digit.
- **Technique help:** every registry Technique has a short plain-language definition, a nudge template and an explanation template; a missing one fails `npm test`.
- **Forgiving and calm:** a full-but-wrong grid stays `inProgress` with input live, Mistake highlighting isn't forced on, nothing overlays or moves the grid. No "Wrong!", no exclamation marks. Using Hints never blocks solving.
- **Undo:** a Hint move is undoable like any digit; `hintsUsed` only ever goes up (Undo never lowers it).
- **Accessibility:** full keyboard use; visible focus; no state by colour alone; polite live-region announcements, each once.

## Technical Decisions

- **One pipeline:** Hints call the same ordered Technique solver used by the grader and generator. `engine/brute.ts` is never used for Hints.
- **`engine/hints`:** from the current digits, run the solver until the first `Step` that has a placement; return the chain of `Step`s in order (elimination-only Steps first, ending with the placement). This avoids Hints looping on Medium/Hard, where eliminations aren't stored in the grid. Returns a "no Hint" result (no throw) if no placement is found. A Mistake Hint is a separate result kind pointing to one cell. Pure engine code: no React, DOM, storage, `Date` or `Math.random`.
- **`Step` holds no display text.** The UI renders the nudge, explanation and definition from templates in `content/techniques`, keyed by `technique`. Nudge uses the first `Step`'s Technique and `unit`; the explanation covers the whole chain; the "What's a…" link and definition name the first `Step`'s Technique, the same one the nudge names (Story 2.3 decision, 2026-10-07).
- **State:** the Hint lives in `ui.hint` (never saved), keyed by session key, with the chain and current step. Another session's Hint is never shown. Actions: `hintRequested` (open/advance) and `hintApplied` (place or clear through the same Undo path as `digitEntered`, increment `sessions[key].hintsUsed`, clear `ui.hint`). Solve detection runs in the same reducer step as for `digitEntered`. A stale `hintApplied` (empty `ui.hint` or another session's) changes nothing.
- **Reset rule:** the reducer clears `ui.hint` in the same step as any change to the session's digits (digit entry, clear, Undo, Restart, Hint move). Changes to Notes, the selected cell or the input mode leave it alone.
- **Keyboard:** H (reserved in Epic 1) and Esc are handled only in the single `ui/keyboard` handler, and only with focus in the grid or side column. They do nothing from the header nav.
- **Conventions carry over:** glossary names (`Hint`, `Step`, `Technique`, `Mistake`), kebab-case files, past-tense actions, centralised strings, enforced dependency direction.

## UX & Interaction Patterns

- **Action row:** "Undo · Hint · Restart"; "Hint" is the one primary button on the surface (`ink` fill, `card` text, 3px double `card` border, 2px solid `ink` outline) with the `caption` "H" in `ink-muted`. It is disabled when the Puzzle is solved (`aria-disabled`, still focusable).
- **Hint panel:** top of the side column (below any notice banner, above the mode indicator), right of the grid, never over it, and the grid never moves. Styling: `card`, 1px `rule-thin` border, 1px `fill-highlight` inner frame inset 6px, hard `3px 4px 0` `fill-highlight` shadow, padding 16px 18px 14px. Small-caps `airmail-red` step label; text in `hint-text` (system serif 18px/1.45) `ink`; one step button; caption "Esc to set aside". Idle: label "Hint", button "Show a nudge".
- **Hint-focus mark:** 2px dashed `postmark` inset ring, drawn 3px inside the selected ring. Step 1 marks the nudge unit; step 2 marks all chain `focusCells`. Accessible name gains "hint".
- **Mistake Hint:** step 1 "One of your digits doesn't fit — look at row {r}." with the ring on that cell; step 2 is a calm explanation that the digit isn't on this Puzzle's solution path; no Technique link. When the Assist is Off, only that cell shows the Mistake mark (umber, dotted underline, corner dot, "mistake" in its name), and only while the Hint is open.
- **Technique definition:** link "What's a {technique}?" in `airmail-red` with a 3px underline offset. It opens inline inside the panel (no modal) and is closed with Esc or a close control. It closes with the Hint when the digits change.
- **"Something doesn't fit yet — want a hint?"** is an inline side-column line with a default-style "Hint" button that opens a Mistake Hint at step 1. It disappears when a cell is emptied or the grid is solved.
- **Focus:** side-column order is Hint panel → mode indicator → digit pad → Undo · Hint · Restart. When the panel resets, closes or applies a move, focus goes to the grid if it was inside the panel, otherwise it stays put. Definition open → definition; close → back to the link. Esc closes the Restart confirm first, then the definition, then the panel.
- **Announcements (once each):** nudge text, explanation text, placement ("7 placed, row 4, column 4"), Mistake clear ("row 4, column 6 cleared").

## Cross-Story Dependencies

- Depends on Epic 1: Technique registry/solver and `Step` (1.7), reducer/Session/Undo (1.2–1.4), the single keyboard handler with H reserved (1.5), and the engine Mistake function and Assists (1.6).
- 2.1 builds `engine/hints`, `ui.hint`, the panel, H/Esc handling and the templates; 2.2 adds `hintApplied`; 2.3 adds definitions inside the panel; 2.4 adds the Mistake branch to `engine/hints`/`hintApplied`, plus the full-grid line.
- Later: Epic 3 City sessions (`city:<id>`) rely on per-session `ui.hint` keying. Epic 4 saves `hintsUsed` with sessions but never `ui.hint`, and the read-only state makes Hint unavailable.
