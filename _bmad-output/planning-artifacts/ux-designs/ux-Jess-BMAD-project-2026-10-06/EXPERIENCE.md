---
name: 'Traveller Sudoku'
status: final
created: '2026-10-06'
updated: '2026-10-06'
sources:
  - _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/briefs/brief-Jess-BMAD-project-2026-10-05/addendum.md
---

# Traveller Sudoku — Experience Spine

## Foundation

Desktop web only: current Chrome, Edge, Firefox and Safari, mouse and keyboard. No touch. No UI library: custom React components, one keyboard handler (`ui/keyboard`, architecture Consistency Conventions › Input). `DESIGN.md` is the visual reference; this file covers behaviour. Glossary terms (Puzzle, Difficulty, Technique, City, Region, Tier, Reachable City, Postcard, Album, Hint, Assist, Notes, Given, Mistake, Free Play) are used as defined in the PRD. Mockups illustrate; this spine wins on conflict. Composition reference: [mockups/direction-vintage-postcard.html](mockups/direction-vintage-postcard.html). Cities other than Lisbon in the mockups are placeholders; the City list and Postcard lines are the creator's content task.

## Information Architecture

| Surface | Reached from | Purpose | Journey |
|---|---|---|---|
| Album (one page per Region) | Launch (no in-progress Puzzle) · nav "Album" · "Add to Album" | Collection and destination chooser: pick the next City from Reachable Cities. No separate map. Mockup: [mockups/key-album.html](mockups/key-album.html) | UJ-1, First launch |
| Postcard viewer | Collected Album slot | Look at a collected Postcard; opens over the Album page, non-blocking; closes with Esc or one click; offers "Play again" | UJ-1 |
| Puzzle screen | Album slot ("Travel here" / "Carry on") · Postcard viewer "Play again" · launch resume · Free Play start | Play one Puzzle; Hint panel in the side column. Mockup: [mockups/key-puzzle.html](mockups/key-puzzle.html) | UJ-1, UJ-2 |
| Postcard reveal | In place on the Puzzle screen, on first solve of a City; or on next load if a Postcard has `revealed=false` | Receive the Postcard. Mockup: [mockups/key-postcard-reveal.html](mockups/key-postcard-reveal.html) | UJ-1 |
| Free Play entry | nav "Free Play" | Pick a Difficulty, start or carry on the one Free Play Puzzle | Free Play |
| Settings | nav "Settings" | Assists (three switches) and Lamplight switch | UJ-1 (Assists) |
| Storage notice | First launch, inline on Album | Says progress lives in this browser only | First launch |

**Launch rule.** If any Puzzle is in progress, open the Puzzle screen on it; otherwise open the Album. With several in progress, resume the most recently played one (`meta.lastPlayedKey`, architecture AD-10); if that one is solved or missing, resume the first in-progress City in catalogue order, then Free Play.

**Navigation.** Header nav: Puzzle · Album · Free Play · Settings. "Puzzle" returns to the current Puzzle and is disabled when none exists [ASSUMPTION]. Leaving a Puzzle never asks for confirmation; progress is already saved (FR-17). No modals anywhere; the Restart confirm is inline in the side column and the Postcard viewer is non-blocking.

## Voice and Tone

Warm, brief, like a friend writing. No exclamation-mark celebrations, never "Wrong!", no urgency. Strings marked † are drafts in this voice, accepted by the creator as a starting point; reword freely.

| Where | String |
|---|---|
| Album heading after a Postcard | "Where to next?" |
| Album heading, empty Album † | "Where to first?" |
| Reachable slot | "Travel here" |
| Locked slot | "Opens after 3 Near Postcards" / "Opens after 3 Mid Postcards" |
| In-progress slot † | "Carry on" |
| Collected slot just added | "just arrived" |
| Postcard viewer | "Play again" |
| Region count | "Europe 4 / 10" |
| Leaving a Puzzle / resume reassurance | "No rush - your Puzzle will wait." |
| Hint, idle label | "Hint" |
| Hint steps | "Show a nudge" → "Explain it" → "Show me the move" |
| Hint, step 2 (hidden single in a row; one template per Technique in content) | "In row {r}, a {d} fits only in column {c}. Every other empty cell in the row already has a {d} in its column." |
| Hint, Technique link † | "What's a hidden single?" |
| Hint when a Mistake exists, step 1 | "One of your digits doesn't fit — look at row {r}." |
| Grid full, not solved | "Something doesn't fit yet — want a hint?" · "Hint" |
| Hint closed | "Esc to set aside" |
| Postcard button | "Add to Album" |
| Replay solved † | "Solved again. Lisbon is already in your Album." |
| Free Play solved † | "Solved. Another one?" |
| Free Play generating † | "Finding a fair Puzzle…" |
| Restart confirm † | "Clear your digits and Notes? The Givens stay." · "Restart" · "Keep going" |
| Storage notice (first launch) † | "Your Album lives in this browser only. Clearing browser data erases it." · "Got it" |
| Persistence not granted, Safari † | "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it." · "Got it" |
| Save failed † | "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here." · "Got it" |
| Read-only, other tab † | "Traveller Sudoku is open in another tab. Play there, or close it and reload this one." · "Got it" |
| Read-only, newer version † | "A newer version saved your progress. Reload to carry on." · "Got it" |
| Unreadable save † | "We couldn't read your saved progress. It's been kept safe, not overwritten." · "Got it" |
| Update ready † | "A new version is ready. It arrives next time you open the game." · "Got it" |

User-facing strings may use natural sentence case; spec prose uses the glossary terms exactly (Puzzle, Postcard, Album, Near / Mid / Far).

## Component Patterns

Visual specs: `DESIGN.md` › Components.

| Component | Behavioural rules |
|---|---|
| Header | Puzzle screen: destination title and Stamp show the current City (Free Play: "Free Play · Medium", no Stamp). Album: wordmark and nav only. Nav items are links; current surface marked. |
| Grid | `role="grid"` (9 rows of `gridcell`s) with roving `tabindex`: one tab stop; arrows move the selected cell (no wrap [ASSUMPTION]). Becomes `inert` while a Postcard is shown. Click selects (cell-first) or places (number-first). Givens can be selected but never changed. Highlights per Assists ({components.grid-cell-highlight}, {components.grid-cell-same-digit}, {components.grid-cell-mistake}): row/column/box and same digit on by default, Mistake off by default (FR-5). |
| Digit pad | Click a key: cell-first enters into the selected cell; number-first makes it the current digit. Count shows remaining placements; a done key stays clickable. |
| Mode indicator | Always visible (FR-3). Click a segment or press N to switch Digit / Notes; press M to switch cell-first / number-first. Status line names input mode, Digit/Notes, and the selected digit or cell. |
| Button | Undo, Hint, Restart in the side column, each with its key caption. Primary style only for the one main action per surface. |
| Hint panel | Idle label "Hint", with "Show a nudge" as the first step. Steps per Interaction Primitives. Mockup: [mockups/key-puzzle.html](mockups/key-puzzle.html). Cleared (back to idle) when the Puzzle's digits change, including Undo (AD-11). Never covers the grid. |
| Postcard | Appears only on first solve of a City (AD-6), or on the next load if its Postcard still has `revealed=false` (architecture AD-6 amended). One button, "Add to Album"; focus moves to it; the line sits in a labelled region ("Postcard from Lisbon") tied to the button by `aria-describedby`. Esc does the same; there is no other way to dismiss it [ASSUMPTION]. |
| Stamp / Postmark | Decorative, hidden from assistive tech; content repeated in text nearby. |
| Album slot | Collected → opens the Postcard viewer. Collected with a replay in progress → "Carry on" resumes it. Reachable → starts or resumes that City's Puzzle. Locked → shows no City name, only the unlock line; not clickable, focusable for its label. |
| Postcard viewer | Opens over the Album page, non-blocking; same Postcard component. Closes with Esc or one click outside it. "Play again" always starts a fresh grid (AD-10); if a replay of that City is in progress it first asks inline ("Start fresh" / "Keep going"). The collected Postcard is unchanged. |
| Region tabs | Europe · Asia · The Americas; Album opens on the Region of the last Postcard, else Europe [ASSUMPTION]. |
| Notice banner | {components.notice-banner}. Non-modal, never over the grid (AD-12). Album and other screens: under the header. Puzzle screen: in the side column, so the grid never moves [ASSUMPTION: at the top of the side column]. Every banner has a text button that dismisses it. Stays until resolved or dismissed; at most one visible, priority: read-only > save failed > storage notice > persistence > update ready [ASSUMPTION]. |
| Settings toggle | Click or Space toggles; takes effect immediately and is saved. Lamplight swaps every `{colors.x}` for `{colors.x-lamplight}` instantly, no system-theme following. |
| Restart confirm | Replaces the action row inline; "Restart" clears all entries except Givens (FR-22), undoable [ASSUMPTION]; "Keep going" or Esc cancels. |
| Difficulty picker | Easy · Medium · Hard on Free Play entry; preselects the last Difficulty used (`settings`, AD-10). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Empty Album (first launch) | Album | Europe page, 4 Near slots "Travel here", Mid/Far locked; heading "Where to first?"; storage notice above. |
| In progress | Album / Puzzle | Slot shows "Carry on"; Puzzle opens exactly as left (digits and Notes; Undo history not kept across reload). |
| Full, not solved | Puzzle | Every cell filled but the grid is not the solution. Calm inline line in the side column "Something doesn't fit yet — want a hint?" with a Hint button; that Hint points to a Mistake (Interaction Primitives › Hint). Nothing else changes: no Mistake highlighting forced on, input stays live, no game over. |
| Solved, first time | Puzzle | Grid stays visible, input stops; Postcard reveal slides onto the finished grid (mockup: [mockups/key-postcard-reveal.html](mockups/key-postcard-reveal.html)). Grid and side column keep their states but are `inert` while the Postcard is shown. "Add to Album" → Album with the new slot marked "just arrived". Survives reload: a Postcard with `revealed=false` is shown on the next load. |
| Solved, replay | Puzzle | No Postcard; inline line "Solved again. Lisbon is already in your Album." with link to Album. |
| Collected, replay in progress | Album | {components.album-slot-collected} plus "Carry on"; resumes the replay. |
| Locked | Album | {components.album-slot-locked}, text says what unlocks it, no City name. Unlock computed live, so a newly opened Tier simply shows "Travel here" next visit. |
| Read-only (other tab / newer version) | All | Banner; grid, pad and Settings visible but inert; Hint unavailable. |
| Save failed | All | Banner with {components.notice-banner.accent-edge-save-failed}; play continues; the next change tries saving again, and the banner clears on the next successful save or when dismissed. |
| Unreadable save | Album | Banner; starts from an empty Album while the old data stays in its backup key (AD-7). |
| Update ready | All | Banner, informational only; never reloads (AD-8). |
| Persistence not granted (Safari) | Album | The Add to Dock banner appears after the storage notice is dismissed, and again after the first Postcard. Other browsers: nothing shown. |
| Free Play generating | Free Play entry | Start button replaced by "Finding a fair Puzzle…"; Difficulty picker disabled; on reply, the Puzzle screen opens. Stale replies ignored (AD-10). |
| Free Play in progress | Free Play entry | "Carry on" (primary) and "Start a new one"; new one asks inline "This replaces your current Free Play Puzzle." [ASSUMPTION] |
| Free Play solved | Puzzle | No Postcard; "Solved. Another one?" with link to Free Play entry. |
| Focus | All | {components.focus-ring} on the focused control; grid frame ringed while grid is focused. |

## Interaction Primitives

**Input modes (FR-2).** Cell-first: select a cell, then type or click a digit. Number-first: select a digit (pad or key), then click cells; keyboard places it in the cursor cell with Enter or Space. Entering the same digit into a cell that already holds it clears it [ASSUMPTION].

**Notes (FR-3).** N toggles Digit / Notes. In Notes mode a digit toggles that Note in an empty cell. Placing a digit hides the cell's Notes.

**Keyboard map (FR-21).** Single-key shortcuts (1–9, N, M, H) and Ctrl/Cmd+Z are active only while focus is in the grid or the side column; on the header nav, Album and Settings they do nothing.

| Key | Action |
|---|---|
| Arrows | Move selected cell |
| 1–9 | Enter digit or Note (cell-first) / choose digit (number-first) |
| Enter / Space | Place the current digit in the selected cell (number-first); activate the focused button or toggle |
| Backspace / Delete | Clear the selected cell |
| N | Toggle Digit / Notes |
| M | Toggle cell-first / number-first |
| Ctrl+Z (Cmd+Z on macOS) | Undo [ASSUMPTION: Cmd on macOS] |
| H | Hint: open the panel at "Show a nudge", then advance one step per press [ASSUMPTION: H advances] |
| Esc | Close the Hint panel / Technique definition / Restart confirm / Postcard viewer |

**Undo (FR-4).** Unlimited, covers digits, Notes, Hint moves and Restart. No redo [ASSUMPTION].

**Restart (FR-22).** Always via the inline confirm.

**Hint, 3 steps (FR-8–FR-11, AD-11).**
1. "Show a nudge": names the Technique and the area (row, column or box) to look at; area cells get {components.grid-cell-hint-focus}.
2. "Explain it": one or two plain sentences for the whole chain, cells involved marked. Wording comes from one template per Technique (Voice and Tone › Hint, step 2).
3. "Show me the move": places the digit through the Undo path; counts as a Hint used.

**Mistake branch (AD-9).** If the grid holds a Mistake, the Hint reports it instead, regardless of the Mistake Assist. With several Mistakes, the first in row-major order. Step 1 points to the Mistake cell ("One of your digits doesn't fit — look at row {r}."); step 2 explains that the digit differs from the solution path; step 3 clears that digit through the normal Undo path. When the Mistake Assist is off, the Mistake mark shows only while that Hint is open.

"What's a [Technique]?" opens the definition inside the panel.

**Motion.** Only the Postcard slide-in and the "just arrived" mark move. Nothing moves while the player is solving. Under reduced motion both are static. No audio.

## Accessibility Floor

- Full keyboard play per the map above; every control reachable by Tab.
- Focus order: header nav → notice banner (if any; Album and other screens) → grid → side column (notice banner on the Puzzle screen, Hint panel → mode indicator → digit pad → Undo · Hint · Restart).
- Focus after change:

| Change | Focus goes to |
|---|---|
| Hint panel resets to idle (digits changed) | The grid, if focus was inside the panel; otherwise unchanged |
| Restart confirm opens | "Keep going" |
| Restart confirm closes (either button or Esc) | "Restart" in the restored action row |
| Notice banner dismissed | The grid on the Puzzle screen; the page heading elsewhere |
| Route change (nav, Album slot, Free Play start) | The grid on the Puzzle screen; the page heading elsewhere |
| Technique definition opens / closes | The definition / back to the "What's a [Technique]?" link |
| Postcard reveal | "Add to Album" (grid and side column `inert`); after it, the Album heading |
| Postcard viewer opens / closes | "Play again" / back to the slot that opened it |

- Cell labels: "Row 4, column 6, 1" plus role: "given", "your digit", "notes 6, 7", "empty"; "mistake" appended when shown; "hint" appended when hint-focused.
- Polite live region, 1–2 words where possible: digit entered ("7"), Note added / removed ("note 7 added"), Given refusal ("Given, can't change"), mode switch, Hint text, solved. Saves are not announced; a save failure is announced once.
- Pad key with all nine placed: struck through, "Done", accessible name "7, all placed".
- Mouse targets at least 24×24px for every interactive control, including nav, tabs, segments, toggles and banner buttons (`DESIGN.md` › Layout & Spacing).
- No state carried by colour alone: every highlight has a mark (`DESIGN.md` › Colors › Highlight approach); Settings states are words.
- Reduced motion: the Postcard appears in place without sliding; the "just arrived" mark is static.
- Contrast: WCAG AA in Daylight and Lamplight (`DESIGN.md` › Colors).

## Key Flows

### UJ-1. Jess picks her next stop.

1. Jess opens Traveller Sudoku on her laptop in the evening. Nothing is in progress, so the Album opens on Europe: 4 collected slots, Mid slots now showing "Travel here".
2. She clicks Lisbon (Mid). The Puzzle screen opens: "Lisbon · Mid · Medium", Stamp in the header.
3. She plays cell-first, switching to Notes with N.
4. She gets stuck and presses H: "Show a nudge" points at row 4 and names *hidden single*.
5. She clicks "Explain it", reads why 7 can only go in one cell of row 4, then places it herself. The Hint panel returns to idle.
6. She fills the last cell. **Climax:** the grid stays, the Postcard from Lisbon slides onto it with Stamp and Postmark, the line revealed ([mockups/key-postcard-reveal.html](mockups/key-postcard-reveal.html)).
7. She clicks "Add to Album". The Album opens on Europe, the Lisbon slot marked "just arrived", heading "Where to next?". She closes the tab.

Failure: a save fails mid-Puzzle → red-edged banner in the side column, she keeps playing, banner clears on the next successful save. With a Mistake in the grid, step 4 points to the Mistake instead. If she fills the grid with a Mistake in it, the side column offers "Something doesn't fit yet — want a hint?".

### UJ-2. Jess comes back after a break.

1. Two days later Jess reopens the game, offline on a train.
2. The service worker serves the app; saved data loads.
3. **Climax:** her half-finished Puzzle opens directly, digits and Notes exactly as she left them.
4. She carries on.

Failure: the game is also open in another tab → this tab is read-only with the banner. A newer version left data she can't read → read-only "Reload to carry on" banner. On Safari without persistent storage after 7 days away, the Album may be gone; prevention is the Add to Dock notice.

### First launch

Mockup: [mockups/key-first-launch.html](mockups/key-first-launch.html).

1. A new player opens the game. No saved data: the Album opens on Europe, heading "Where to first?".
2. The storage notice banner sits above the slots; play is not blocked.
3. She clicks "Got it". The game requests persistent storage.
4. If refused on Safari, the Add to Dock banner appears; otherwise nothing more.
5. **Climax:** she picks a Near City with "Travel here" and the first Puzzle opens.

## Inspiration & Anti-patterns

- **Lifted:** physical correspondence: stamps, postmarks, airmail envelopes; the Album as a postcard rack.
- **Rejected, from research:** mid-Puzzle interruptions of any kind (no pop-ups, modals or toasts over the grid); overstimulating rewards (confetti, sound, flashing); game over and "three mistakes and you're out"; streaks, timers and re-engagement pressure; Mistake flagging forced on.

## Responsive & Platform

Desktop only. Layout is designed at 1280px wide. Below 1100px viewport width the side column stacks under the grid (one breakpoint): vertical scroll only, focus order unchanged. The 9×9 grid keeps its fixed size under the WCAG 1.4.10 two-dimensional-layout exception. Full 320px reflow is out of scope. No blocking "unsupported" message. Tablets and phones are out of scope. Safari: Add to Dock is the route to persistent storage (AD-7).

## Resolved Questions (2026-10-06)

1. Launch resumes the most recently played Puzzle, tracked as `meta.lastPlayedKey` (architecture AD-10 amended).
2. The box highlight gets its own ≥3:1 mark: small `airmail-red` corner ticks on the active box (FR-20). Replaces the earlier shading-only answer.
3. "Tidy notes after a placement" is left out of the MVP Assist set.
4. No signature line on Postcards for now; revisit when the Postcard lines are written.
5. Below 1100px the side column stacks under the grid (one breakpoint); the grid uses the 2D-layout exception; full 320px reflow is out of scope. Replaces the earlier horizontal-scroll answer.
6. † microcopy drafts accepted as a starting point.
7. A full grid that isn't solved gets the calm "Full, not solved" state; no game over.
8. The City list and Postcard lines are the creator's content task; mockup Cities other than Lisbon are placeholders.
