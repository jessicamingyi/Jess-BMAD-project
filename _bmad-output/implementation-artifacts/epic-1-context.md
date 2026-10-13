# Epic 1 Context: Play a calm Sudoku in the browser

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the playable foundation of Traveller Sudoku: a static, private site where a player plays Free Play Puzzles at Easy, Medium or Hard with mouse or keyboard, in Daylight or Lamplight, with Notes, both input modes, Undo, Restart and Assists, and never a game over. This epic also stands up everything later epics build on: the starter scaffold, the pure engine (Technique pipeline, grader, generator), the reducer-driven state model, CI/CD to GitHub Pages, the design tokens, and the accessibility floor. Hints, Cities/Postcards and saving are out of scope (Epics 2–4).

## Stories

- Story 1.1: Publish the Traveller Sudoku shell
- Story 1.2: Solve a puzzle with the mouse
- Story 1.3: Notes and number-first entry
- Story 1.4: Undo and Restart
- Story 1.5: Play with the keyboard and a screen reader
- Story 1.6: Assists and Lamplight
- Story 1.7: Fair puzzles: Technique solver and grader
- Story 1.8: Start a Free Play Puzzle

## Requirements & Constraints

- **Fair puzzles:** every Puzzle has exactly one solution and is solvable using only naked single, hidden single, naked pair, pointing, claiming. Difficulty = hardest Technique needed: Easy = singles; Medium = naked pair; Hard = pointing/claiming. Minimum Givens per Difficulty: Easy ≥ 61, Medium ≥ 40, Hard ≥ 32 (TS-62).
- **Input:** cell-first and number-first, mouse or keyboard. Givens never change (silently refused). Same digit into a cell clears it. Notes toggle per digit in empty cells; placing a digit hides (not deletes) Notes. Current mode always visible.
- **Undo:** unlimited, covers digits, Notes and Restart (snapshot before restart); no redo; no-op actions record nothing; solved Puzzles stay solved.
- **Restart:** inline confirm, clears all but Givens, undoable.
- **Assists:** Mistake highlighting (default Off), same-digit (On), row/column/box (On). Settings reset on reload in this epic (saving is Epic 4).
- **Forgiving:** no game over, lives, counters, timers, "Wrong!", red Mistakes, modals, toasts, confetti, flashing, sound. Full-but-wrong grid stays `inProgress` with input live. Solve shows a calm italic line only.
- **Calm UI:** nothing ever overlays the grid; nothing animates while solving; honour `prefers-reduced-motion`.
- **Accessibility (WCAG AA):** text ≥ 4.5:1, non-text marks ≥ 3:1 in both themes; full keyboard play; visible focus on every control; no state by colour alone; targets ≥ 24×24px; grid semantics and live-region announcements.
- **Privacy/platform:** no analytics, tracking, accounts or network calls; zero cross-origin requests; system serif fonts only. Desktop Chrome/Edge/Firefox/Safari; no "unsupported" message. No service worker or browser storage writes yet.
- **Responsiveness:** Free Play generation never runs on the main thread.

## Technical Decisions

- **Stack:** `create-vite` 9.2 `react-ts`; Vite 8.3, React/React DOM 19.3, TypeScript 6.0, `@vitejs/plugin-react` 6.1, oxlint 1.85, Vitest 5.0; Node 24 in `.nvmrc`. Do **not** add `vite-plugin-pwa` or `idb-keyval` yet.
- **Functional core / imperative shell.** Layout: `src/engine/`, `src/game/`, `src/content/`, `src/persistence/`, `src/workers/`, `src/ui/`, `scripts/`, `tests/architecture/`, `public/`, `.github/workflows/`.
- **Dependency direction (enforced by a Vitest architecture test):** `engine` → `engine` only; `game` → `engine`, `content`; `persistence` → `game`; `workers` → `engine`; `ui` → `game`, `content`, `persistence`, `workers`; `scripts` → `engine`, `content`, `game/journey`. `engine/` and `game/` must not use React, DOM, `window`, `document`, storage, `Date` or `Math.random`. Test failures name the file and import/global. The same test also enforces a single keyboard handler.
- **Technique pipeline:** one ordered registry (naked single, hidden single, naked pair, pointing, claiming); each module: grid + candidates → next `Step` or nothing; solver always applies the first Technique that finds a Step. Grader = highest Technique rank used, or "not gradeable" (no throw). `engine/brute.ts` (solution counter, limit 2) is used only by the generator/build verification, never by solver, grader or Hints.
- **`Step`** = `{ technique, placements[], eliminations[], focusCells[], unit }`, no display text (UI renders text from `content/techniques`).
- **Candidates/Mistakes** are computed in `engine/` from digits (and solution) only, never from Notes.
- **Generator:** `engine/generator(seed, difficulty)` accepts only unique (brute = 1) puzzles graded to target; deterministic per seed. Seed created in the shell and posted to a Web Worker in `src/workers/` with a request id; reducer ignores replies whose id isn't the latest. Worker errors become a calm inline line.
- **State:** `AppState = { album, sessions, settings, meta, ui }`, changed only by pure `game/reducer(state, action)`; UI dispatches past-tense actions (`cellSelected`, `digitEntered`, `noteToggled`, `undoRequested`, `restartConfirmed`, …). Undo history lives in `ui.undo` only. Solve detection happens inside the reducer step (`digits === solution` → `status: 'solved'`); no dispatchable `puzzleSolved`. Free Play solve never touches `album`.
- **Session shape:** `{ key, givens, solution, digits, notes, status, difficulty, hintsUsed }`; key `free` for the single Free Play Puzzle (`city:<id>` later). `givens`/`solution`/`digits` are 81-char digit strings, cells 0–80 row-major, 0 = empty; `notes` = 81 nine-bit masks (bit d−1 = Note d); `status` `inProgress | solved`. `settings` holds preferences (Assists, Lamplight, last Free Play Difficulty).
- **Conventions:** glossary names in code (`Technique`, `Step`, `Mistake`, `Given`, `Session`, `FreePlay`, …); kebab-case files, PascalCase types; Difficulty `easy|medium|hard`. Core returns results, never throws for game outcomes; shell errors become `ui` flags, never alerts. One keyboard handler in `ui/keyboard`; components add no key listeners.
- **CI/CD:** `.github/workflows/ci-deploy` on push to `main`: `npm ci` → `npm test` → `npm run build` → deploy to GitHub Pages only if all pass. Vite `base` = `/<repo>/`. CSP via `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`.
- **Left to the code:** styling approach; no routing library (screens switched by state).
- **Sample Puzzle fixture** in `src/content/` (givens, solution, difficulty) loads at startup until Story 1.8, then remains a test fixture only.

## UX & Interaction Patterns

- **Tokens:** CSS custom properties for 16 colour roles in Daylight and Lamplight twins (exact hexes in DESIGN), typography (system serif stack; `cell-given` 30px bold upright, `cell-player` 30px italic, `cell-note` 12px), spacing (cell 58px, grid-pad 14px, gutters 44×26px, side column max 440px, min-target 24px), square corners. Components never use raw hex. Daylight is default; Lamplight only via Settings, never from system theme; swaps instantly. Automated Vitest contrast test over the measured token pairs, both themes.
- **Look:** paper-on-desk; `desk` with faint grain; grid frame shadow rotated −0.4°; header wordmark "Traveller Sudoku" + "correspondence by puzzle" tagline, 3px double `ink` rule. Free Play header "Free Play · {Difficulty}", no Stamp.
- **Layout:** grid left, side column right (top→bottom: notice slot, mode indicator, digit pad, action row Undo · Restart); below 1100px the side column stacks under the grid, cells keep 58px.
- **Grid marks:** selected = `fill-selected` + 3px inset `airmail-red` ring; row/col = `fill-highlight` + frame-edge triangle ticks; box = corner L-ticks; same digit = `fill-same-digit` + underline; Mistake = umber `mistake` + dotted underline + corner dot (only when Assist on). Every soft fill is paired with a mark; precedence: selected ring outermost; fill selected > same-digit > highlight; Mistake underline replaces same-digit underline.
- **Controls:** mode indicator "Digit | Notes (N)" segmented control + italic status line; digit pad 3×3 with "N left"/"Done" (struck through, still clickable, never below zero); Difficulty picker styled like mode indicator, disabled during "Finding a fair Puzzle…"; Settings toggles show the word On/Off; Restart confirm replaces the action row inline ("Keep going" primary).
- **Keyboard:** arrows move (no wrap); 1–9 digit/Note or choose digit; Enter/Space place (number-first); Backspace/Delete clear; N Digit/Notes; M input mode; Ctrl/Cmd+Z Undo; H reserved (no-op). Shortcuts active only with focus in grid or side column. Esc closes Restart/"Start a new one" confirms.
- **Screen reader:** `role="grid"`, 9 rows of `gridcell`s, roving tabindex; labels like "Row 4, column 6, 7, your digit" / "…, given" / "…, notes 6, 7" / "…, empty" (+ "mistake"); polite live region ("7", "note 7 added", "Given, can't change", mode names, "Solved"). 3px `focus` outline, 3px offset; grid frame carries focus ring. Focus moves: Restart confirm → "Keep going", closes → "Restart"; nav → grid or page heading; new Free Play → grid.
- **Copy:** "Solved." (sample), "Solved. Another one?" (Free Play), "Clear your digits and Notes? The Givens stay.", "This replaces your current Free Play Puzzle.", "Carry on", "Start a new one", "Keep going". Keep strings centralised.

## Cross-Story Dependencies

- 1.1 (scaffold, architecture test, tokens, CI) precedes everything.
- 1.2 establishes AppState, reducer, Session and the grid; 1.3–1.6 extend it. 1.4's Undo must cover Notes from 1.3; 1.5's keyboard handler drives the 1.2–1.4 actions; 1.6 adds the nav and Settings and the engine Mistake function.
- 1.7 (solver, grader, brute) is required by 1.8's generator; 1.8 replaces the startup sample Puzzle with Free Play entry and extends nav to "Puzzle · Free Play · Settings".
- Later epics depend on this: Epic 2 Hints reuse the solver/`Step` and the reserved H key; Epic 3 adds `city:<id>` sessions, Album and Postcard award in the same reducer solve step; Epic 4 adds saving of `sessions`/`settings`/`meta`, the PWA and notices.
