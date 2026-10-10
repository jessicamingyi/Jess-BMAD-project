---
status: final
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/EXPERIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-Jess-BMAD-project-2026-10-05/addendum.md
---

# Traveller Sudoku - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Traveller Sudoku, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Fair Puzzles. Every City's Puzzle has exactly one solution and can be solved using only the MVP Techniques (naked single, hidden single, naked pair, pointing, claiming) without guessing. A test solver using only those Techniques solves 100% of Puzzles, and the hardest Technique it needs matches the Puzzle's Difficulty (Easy = singles only; Medium = also naked pair; Hard = also pointing or claiming), which matches the City's Tier (Near = Easy, Mid = Medium, Far = Hard).
- FR2: Two input modes. The player can enter digits cell-first (select a cell, then a digit) or number-first (select a digit, then click cells), with mouse or keyboard. Givens can never be changed.
- FR3: Notes. The player can switch between digit entry and Notes entry, and add or remove Notes in any empty cell. The current mode (Digit or Notes, and the selected digit in number-first mode) is always visible.
- FR4: Undo. The player can undo any number of moves, including Note changes.
- FR5: Assists. The player can switch each Assist on or off independently: mistake highlighting (off by default), same-digit highlighting (on by default), and the selected cell's row/column/box highlighting (on by default).
- FR6: No game over. Mistakes never end, reset or fail a Puzzle; a Puzzle is only ever solved or in progress.
- FR7: Completion. When every cell matches the solution the Puzzle is marked solved. The first solve of a City's Puzzle awards its Postcard (FR14); replays and Free Play award no Postcard.
- FR8: Hint content. A Hint names its Technique, highlights the cells involved, and explains in one or two plain sentences why the move is true (e.g. "7 can only go in this cell of row 4").
- FR9: Three-step Hint. Request 1 gives a nudge (the Technique and the area of the grid to look at); request 2 explains the reasoning; request 3 shows the move ("Show me the move"). (Updated 2026-10-06 to match UX.)
- FR10: Technique help. From any Hint the player can open a short definition of that Hint's Technique.
- FR11: Hints respect the player's grid. A Hint reasons from the digits currently in the grid and computes candidates itself, never from the player's Notes. If the grid contains a Mistake, the Hint points out the Mistake instead of reasoning from it.
- FR12: Choose a destination. The player chooses the next City from the Reachable Cities. In each Region all Near Cities are reachable from the start; Mid Cities become reachable after 3 Near Postcards in that Region; Far Cities after 3 Mid Postcards in that Region.
- FR13: Cities. The MVP ships 30 Cities: 10 per Region (Europe, Asia, the Americas), split 4 Near / 3 Mid / 3 Far, each City with exactly one Puzzle.
- FR14: Receive a Postcard. A Postcard's line stays hidden until its City's Puzzle is solved. Solving adds the Postcard to the Album and reveals it in a short, warm moment (no flashing, no sound) that is closed with one click.
- FR15: Album. The player can browse the Album by Region and see which Cities are collected, reachable or locked, with a per-Region count such as "7 / 10 Europe".
- FR16: Replay. The player can replay the Puzzle of an already-collected City; a replay starts from a fresh grid and never creates a duplicate Postcard.
- FR17: Autosave. Progress on every started City Puzzle and the current Free Play Puzzle (digits and Notes), Assist settings and the Album save automatically after every change and survive a page reload or browser restart. Switching City keeps each half-finished Puzzle. Undo history need not survive a reload.
- FR18: Offline play. After the first visit the whole game, including all 30 Cities, works with no network connection and keeps working after a new version is released. Progress saved by an earlier version is carried forward, never discarded.
- FR19: Storage notice. On first launch the game explains once that progress is stored in this browser only and that clearing browser data erases the Album.
- FR20: Readable grid. Digits and Notes are large and clear. Text meets WCAG AA contrast (>= 4.5:1), and box borders and highlights meet >= 3:1, in both the light and dark themes.
- FR21: Keyboard play. A Puzzle can be played entirely by keyboard: arrow keys move, digits enter, and a key toggles Notes.
- FR22: Restart. After a confirmation, the player can restart the current Puzzle; restarting clears all entries except the Givens.
- FR23: Free Play. At any time the player can start a Free Play Puzzle at a chosen Difficulty. It follows FR1-FR11 and FR22, earns no Postcard, and is never needed to unlock Cities.
- FR24: Durable storage. The game asks the browser to keep its stored data permanently (so it isn't evicted automatically, e.g. after a period without visits). If saving fails, the game tells the player.

Resolved document inconsistencies (2026-10-06): PRD §7 now says three-step Hints; storage is IndexedDB (AD-7); AD-11 `hintApplied` also clears a Mistake digit; AD-6 Postcards store `collectedOn` from the shell; AD-12 CSP via `<meta>` tag; AD-5 lists `settings` (Assists, theme, Free Play Difficulty) and `meta` (`seenStorageNotice`, `persistGranted`, `lastPlayedKey`); no separate Destinations screen; Restart is undoable because the undo history stores a snapshot before a restart. Story writing (2026-10-06): `scripts/` may also import `game/journey` (AD-1); launch falls back to any in-progress Puzzle (AD-10, EXPERIENCE); "Play again" on an in-progress replay asks an inline confirm.

### NonFunctional Requirements

- NFR1: Calm, no interruptions. No ads, no pop-ups/modals/toasts during a Puzzle, no countdown timers, no streak prompts, no lives (PRD §5, §6; brief addendum guardrails). Verifiable by UI audit: no element ever overlays an in-progress grid.
- NFR2: Calm, no flashing and no audio. No flashing effects, confetti, sparkles or badges; no audio of any kind in the MVP (PRD §5, FR14; DESIGN › Do's and Don'ts).
- NFR3: Reduced motion. All animation honours `prefers-reduced-motion`; under reduced motion the Postcard appears in place without sliding and the "just arrived" mark is static. Nothing animates while the player is solving (PRD §5; EXPERIENCE › Motion).
- NFR4: Platform. Supports current desktop Chrome, Edge, Firefox and Safari with mouse and keyboard. Tablets, phones and touch input are not supported; no blocking "unsupported" message is shown (PRD §5, addendum D3; EXPERIENCE › Responsive & Platform).
- NFR5: Responsiveness. Opening a City's Puzzle takes under 1 second from click to interactive grid (PRD §5 [ASSUMPTION]). Free Play generation runs off the main thread in a Web Worker so the UI stays responsive (AD-4).
- NFR6: Privacy. No accounts, no tracking or analytics, no telemetry, and no data leaves the browser (PRD §5).
- NFR7: No third-party requests. All assets, including fonts (system serif stack only), are self-hosted and bundled; the page enforces a content security policy of `default-src 'self'` (AD-12). Verifiable: zero cross-origin requests in a network log.
- NFR8: Accessibility, contrast. Text >= 4.5:1 and non-text marks (box borders, highlight marks, focus ring) >= 3:1, in both Daylight and Lamplight themes (FR20; WCAG AA).
- NFR9: Accessibility, WCAG AA conformance. Full keyboard operability, visible focus on every control, no state conveyed by colour alone, minimum 24x24px pointer targets, programmatic names/roles for grid cells and controls (FR20, FR21; EXPERIENCE › Accessibility Floor).
- NFR10: Offline. After the first visit the app shell and all content (30 City Puzzles, Postcard lines, Technique texts) work with no network, including after a new version is deployed (FR18, AD-8).
- NFR11: Durability, never lose progress. Saved data survives reload, browser restart and version updates; forward migrations carry older data forward; unreadable or newer-version data is never overwritten (FR17, FR18, AD-7; brief addendum "never lose progress").
- NFR12: Durability, storage persistence and failure visibility. The app requests persistent storage (`navigator.storage.persist()`) and surfaces every save failure calmly as a non-modal notice while play continues (FR24, AD-7).
- NFR13: Forgiving play. Mistakes never end or reset a Puzzle; mistake highlighting is off by default; no "Wrong!" messaging and no red for Mistakes (FR5, FR6; brief addendum; DESIGN › Do's and Don'ts).
- NFR14: No competitive, social or monetised features. No leaderboards, sharing, friends, payments or ads (PRD §6).
- NFR15: Determinism and testability. The pure core (`engine/`, `game/`) uses no `Date`, `Math.random`, DOM or storage; randomness enters only via an explicit seed so generation and tests are repeatable (AD-1, Conventions › Randomness).

### Additional Requirements

- **STARTER TEMPLATE: `create-vite` react-ts template (create-vite 9.2; Vite 8.3, React / React DOM 19.3, TypeScript 6.0 starter pin, `@vitejs/plugin-react` 6.1, oxlint 1.85 from the starter) → Epic 1 Story 1 scaffolds the project from it.** (Architecture › Stack)
- Stack pins added to the starter: `vite-plugin-pwa` 2.0 (fallback 1.3) using `generateSW` with `registerType: 'prompt'`; `idb-keyval` 6.3; Vitest 5.0; oxlint as the linter; Node.js 24 LTS pinned in `.nvmrc` (move to 26 LTS after 2026-10-28). (Stack, AD-7, AD-8)
- Paradigm and folder layout (Design Paradigm, Structural Seed): functional core / imperative shell. `src/engine/` (grid, candidates, techniques/*, solver, grader, generator, brute, hints), `src/game/` (AppState, reducer, actions, journey: reachability, award, Tier map), `src/content/` (cities.json, city-puzzles.json, techniques.ts), `src/persistence/` (document, migrations/, save-lock, storage-persist), `src/workers/` (Free Play generator worker), `src/ui/` (screens Album (also the destination chooser), Puzzle, FreePlay, Settings; keyboard; components), `scripts/` (build-cities), `tests/architecture/`, `public/` (icons, manifest assets), `.github/workflows/` (ci-deploy).
- AD-1 dependency direction: `engine/` imports only `engine/`; `game/` imports only `engine/` and `content/`; `persistence` → `game`; `workers` → `engine`; `ui` → `game`, `content`, `persistence`, `workers`; `scripts` → `engine`, `content`. Never the other way. Core bans React, DOM, `window`, storage, `Date`, `Math.random` (time and randomness are parameters). A Vitest architecture test in `tests/architecture/` enforces import direction and banned globals.
- AD-2 one Technique pipeline: a single ordered registry (naked single, hidden single, naked pair, pointing, claiming); each Technique module has the same signature (grid + candidates → next `Step` or nothing); the solver always takes the first Technique that finds a `Step`. Grading (highest Technique rank used), generator acceptance and Hints all use this solver. `engine/brute.ts` is the only other solving code: a brute-force solution counter for uniqueness checks in the generator and build verification only, never for grading or Hints.
- AD-3 `Step` is structured data `{ technique, placements[], eliminations[], focusCells[], unit }`; the engine never produces display text. The UI renders Hint text from templates in `content/techniques` keyed by `technique`; Technique definitions (FR10) live in the same file.
- AD-4 City Puzzles are released once and never change: `content/city-puzzles.json` holds `{ cityId, givens, solution, difficulty }`; `scripts/build-cities` generates entries only for City ids that lack one and verifies all; a snapshot test fails the build if a released entry changes, if any City Puzzle has more than one solution, or if its grade doesn't match its City's Tier. Free Play Puzzles are generated in `workers/` with the same engine from a passed-in random seed.
- AD-5 state: `AppState = { album, sessions, settings, meta, ui }`, changed only by `game/reducer(state, action)`; UI dispatches actions and never mutates. `album`, `sessions`, `settings`, `meta` (`seenStorageNotice`, `persistGranted`, plus `lastPlayedKey` per AD-10) are saved; `ui` (`hint`, `undo`, `saveFailed`, `readOnly`, `updateReady`) is never saved. Persistence saves only after an action changes a saved slice; `ui`-only actions trigger no save.
- AD-6 solve detection and award: after any digit-changing action the reducer checks `digits === solution`; if so, in the same step it marks the session `solved` and calls `journey.award(state, key)`. `award` adds a Postcard only for `city:<id>` keys whose City isn't already in the Album, with `revealed: false`; "Add to Album" sets `revealed: true`; any Postcard with `revealed: false` is re-shown (e.g. after reload during the reveal). There is no UI-dispatchable `puzzleSolved` action. Reachable/locked Cities and Region counts are always computed from `album` + catalogue, never stored. The Tier→Difficulty map lives only in `game/journey`.
- AD-7 persistence: `persistence/` alone touches storage and owns `toDocument`/`fromDocument`; it writes the whole document `{ schemaVersion, album, sessions, settings, meta }` to IndexedDB via `idb-keyval`. On load, migrations run forward in order; stored `schemaVersion` newer than the code's → tab goes read-only (`ui.readOnly`) and asks for a reload; unreadable data → kept under a backup key, player told, never overwritten. Single writer: only the tab holding Web Lock `traveller-save` writes; other tabs are read-only and say the game is open elsewhere. `navigator.storage.persist()` is requested when the FR19 notice is dismissed and again after the first Postcard if not granted; result stored in `meta.persistGranted`; not granted on Safari → notice suggests Add to Dock. Failed saves set `ui.saveFailed`.
- AD-8 updates never interrupt a Puzzle: the PWA pre-caches the app shell and all content; the app never calls `updateSW()` during a session; it may set `ui.updateReady`; the new version takes over once all game tabs are closed; the service worker never reads or writes IndexedDB.
- AD-9 Hints and Mistake checks read digits, not Notes: engine Hint and Mistake functions take only the session's current digits + solution and compute candidates themselves. A Mistake = a player digit that differs from the solution. If any Mistake exists, the next Hint reports it instead of a Hint chain.
- AD-10 one `Session` shape for City and Free Play: `sessions[key] = { key, givens, solution, digits, notes, status, difficulty, hintsUsed }`; keys `city:<id>` or `free` (the single current Free Play Puzzle); every session carries its own `givens` and `solution`; `notes` = 81 numbers, each a 9-bit mask; `status` = `inProgress` | `solved`. Replay replaces a solved City's session with a fresh one built from content; Restart resets `digits` and `notes` to the givens. Each Free Play worker request carries a request id; the reducer ignores replies whose id isn't the latest. `settings` holds preferences only (e.g. last Free Play Difficulty). `meta.lastPlayedKey` is updated on any action changing a session's digits or Notes; launch resumes that session if `inProgress`.
- AD-11 Hint chain lives in `ui`: a Hint runs the solver from the current digits until the first `Step` with a placement and returns the chain (eliminations first, ending with that placement). Nudge = first Step's Technique + `unit`; full Hint = whole chain. `ui.hint` is cleared by the reducer on any change to the session's digits (including Undo). "Show me the move" dispatches `hintApplied`, which uses the same Undo path as `digitEntered` and increments `hintsUsed`.
- AD-12 no third-party requests, nothing covers a Puzzle: all assets self-hosted and bundled; content security policy `default-src 'self'`; notices (storage, save failure, read-only, update ready) are non-modal and never cover the grid of an in-progress Puzzle; save failure is an inline banner.
- Conventions (Consistency Conventions): glossary names in code (`City`, `Region`, `Tier`, `Postcard`, `Album`, `Technique`, `Step`, `Hint`, `Mistake`, `Given`, `Session`, `FreePlay`); kebab-case files, PascalCase types. Code values: Tier `near|mid|far`; Difficulty `easy|medium|hard`; Region `europe|asia|americas`. City id = stable, never-reused kebab-case slug (e.g. `lisbon`); session key `city:<id>` or `free`. Cells 0–80 row-major; digits 1–9, 0 = empty; `givens`/`solution`/`digits` stored as 81-character digit strings in content and saved data. Actions are past-tense events (`digitEntered`, `noteToggled`, `undoRequested`, `hintRequested`, `hintApplied`, `cityChosen`, `restartConfirmed`). The core never throws for game outcomes (returns results); shell errors become calm `ui` flags, never browser alerts. Randomness only via an explicit seed. One keyboard handler in `ui/keyboard` owns all shortcuts; components add no key listeners. No audio; animations respect `prefers-reduced-motion`; colour tokens meet WCAG AA in both themes.
- CI/CD and hosting: GitHub Actions workflow `ci-deploy` on push to `main` runs `npm ci`, tests (including the City Puzzle snapshot and architecture tests), build, and deploys to GitHub Pages. Vite `base` is set to the repository path (`/repo/`) so the manifest and service-worker scope match. Environments: local dev + one production static site; no backend, accounts or telemetry.
- Known limitation: desktop Safari usually refuses persistent storage unless the game is added to the Dock, so Safari may erase the Album after 7 days without a visit; the AD-7 notice tells the player; backup/export is out of MVP scope.
- Deferred by architecture (do not build as requirements): styling approach (code decides), routing library (screens switched by state), end-to-end browser tests, Free Play generation-speed tuning, Postcard pictures / touch / accounts / backup.

### UX Design Requirements

**Design tokens and foundations**

- UX-DR1: Colour tokens, Daylight (default). Implement the 16 colour roles as theme tokens with these exact hexes: `desk #F5EFDF`, `card #FFFAF0`, `ink #1F2A44`, `ink-muted #4E5670`, `given #1A2036`, `player-ink #24418A`, `note #535A70`, `rule-thin #73799A`, `rule-box #1F2A44`, `fill-selected #F6D3D0`, `fill-highlight #E6EAF5`, `fill-same-digit #DFE4F4`, `mistake #8A4B16`, `airmail-red #B3262F`, `postmark #3C4A6E`, `focus #1F3A7A`. Each role used only per its "Used for / Never for" column (e.g. `airmail-red` never for Mistakes or large fills; `mistake` never for errors outside the grid; soft fills never alone as a state cue). (DESIGN › Colors)
- UX-DR2: Colour tokens, Lamplight (dark). Each role has a `-lamplight` twin: `desk #1B1A21`, `card #25242C`, `ink #F4ECD8`, `ink-muted #C8C0AD`, `given #F6EFDC`, `player-ink #A9C0F5`, `note #B8B4C4`, `rule-thin #8E8CA0`, `rule-box #D8D2C0`, `fill-selected #5A2A30`, `fill-highlight #2E3348`, `fill-same-digit #343A55`, `mistake #E8B07A`, `airmail-red #F08A8F`, `postmark #A8B6E0`, `focus #FFD27A`. In Lamplight every `{colors.x}` resolves to `{colors.x-lamplight}`; shadows use black at the same alpha. Daylight is always the default; Lamplight is a Settings switch and never follows the system theme. (DESIGN › Brand & Style, Colors, Elevation)
- UX-DR3: Measured contrast gate. The token pairs listed in DESIGN › Colors › Measured contrast pass in both themes (text >= 4.5:1, e.g. `note` on `fill-selected` 4.9 / 5.7; non-text >= 3:1, e.g. `rule-thin` on `fill-selected` 3.1 / 3.5, `airmail-red` box ticks on `fill-highlight` 5.4 / 5.2). Any new colour requires a measured Lamplight twin. An automated contrast test over the token pairs is recommended. (DESIGN › Colors; FR20)
- UX-DR4: Typography tokens. One family everywhere: system serif stack `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif`; no downloaded fonts. Tokens: `brand` 24px italic; `city-title` 30px lh 1; `body` 15px lh 1.5; `hint-text` 18px lh 1.45; `postcard-line` 20px italic lh 1.55; `label` 15px small-caps letter-spacing 0.12em; `button` 16px small-caps 0.08em; `meta` 14px lh 1.4; `caption` 12px italic; `cell-given` 30px bold upright; `cell-player` 30px italic; `cell-note` 12px upright. Rules: no all-caps body text (stamp/postmark excepted), no exclamation-mark display type, italic means handwritten only (player digits, Postcard line, status lines), never emphasis. (DESIGN › Typography)
- UX-DR5: Spacing, sizing and shape tokens. Scale `1`–`7` = 4/8/12/16/24/32/44px; `cell` 58px; `grid-pad` 14px; `app-gutter-x` 44px; `app-gutter-y` 26px; `side-column-max` 440px; rules 1px thin / 2px box / 3px frame; `min-target` 24px. Rounded: `none` 0 everywhere (cards, buttons, cells, slots, banners), `sm` 2px only on the outer theme panel, `full` only for the Mistake corner dot and postmark circles. (DESIGN › spacing, rounded, Shapes)
- UX-DR6: Surface, elevation and texture. Paper-on-desk look: grid frame shadow `0 6px 18px rgba(31,42,68,.18)` rotated −0.4°; Postcard shadow `0 10px 26px rgba(31,42,68,.30)` rotated −1°; Stamp +3°; Hint panel flat with a hard 3px/4px `fill-highlight` offset shadow and inner hairline frame; notices, Album slots and buttons have no shadow; no blur, glass or gradient fills. Paper grain on `desk`: faint diagonal `ink` hatch at ~3% opacity plus a soft top-left glow, never behind grid cells. (DESIGN › Elevation & Depth, Colors)

**Components**

- UX-DR7: Grid frame and structure. `card` background, 3px `rule-box` frame, 14px padding, 58px square cells, 1px `rule-thin` cell rules, 2px `rule-box` 3×3 box rules. A decorative Postmark sits outside the top-right corner of the frame, `aria-hidden`, never over cells. (DESIGN › Components › Grid)
- UX-DR8: Grid cell content states. Empty = `card`, no content; Given = `cell-given` in `given` (bold upright); Player digit = `cell-player` in `player-ink` (italic); Notes = 3×3 mini-grid in `cell-note` / `note`, digit n always in position n. Placing a digit hides that cell's Notes. (DESIGN › Grid; EXPERIENCE › Notes)
- UX-DR9: Grid cell highlight states. Selected = `fill-selected` + 3px inset `airmail-red` ring. Row/column highlight = `fill-highlight` + `airmail-red` 12×7px triangle ticks on the grid frame edge for the active row and column. Box highlight = `fill-highlight` + `airmail-red` 2px L-shaped corner ticks 8px long inside the four corners of the active box. Same digit = `fill-same-digit` + 2px `airmail-red` underline offset 4px on Givens and player digits alike. Mistake = digit in `mistake` + 2px dotted underline offset 4px + 6px round corner dot top-right, shown only when the Mistake Assist is on or a Hint points to it. Hint focus = 2px dashed `postmark` inset ring on cells a Hint names. Each soft fill is paired with its >= 3:1 mark; the mark is the state. (DESIGN › Grid, Colors › Highlight approach)
- UX-DR10: Stacked-mark precedence. When states combine: selected ring outermost; hint-focus ring drawn 3px inside the selected ring; Mistake corner dot top-right; underline slot below the digit, where Mistake's dotted underline replaces the same-digit underline when both apply (corner dot still distinguishes). Fill precedence: selected over same digit over highlight. (DESIGN › Grid › Stacked marks)
- UX-DR11: Digit pad. 3×3 keys, `card` with 2px dashed `rule-thin` border, 10px gap; digit upright `ink` at cell-player size; caption count below ("3 left") in `caption` `ink-muted`. Current digit (number-first): 2px solid `airmail-red` border + `fill-highlight`. Done state (all nine placed): digit `ink-muted` struck through, count reads "Done", accessible name "7, all placed"; done keys stay clickable. Clicking a key: cell-first enters into the selected cell; number-first makes it the current digit. (DESIGN › Digit pad; EXPERIENCE › Component Patterns)
- UX-DR12: Mode indicator. Always-visible two-part segmented control "Digit | Notes (N)", 1px `ink` border, active segment inverted (`ink` fill, `card` text), each segment >= 24×24px. Italic `meta` `ink-muted` status line beside it naming input mode (cell-first / number-first), Digit/Notes, and the selected digit or cell. Click a segment or press N to switch Digit/Notes; M switches cell-first/number-first. (DESIGN › Mode indicator; EXPERIENCE › Component Patterns; FR3)
- UX-DR13: Buttons and links. Default button: transparent, `ink` text, 3px double `rule-box` border, `button` small-caps, square corners, optional `kbd` caption in `caption` `ink-muted`. Primary button (Hint, "Add to Album", "Travel here" when a button): `ink` fill, `card` text, 3px double `card` border, 2px solid `ink` outline; only one primary per surface. Links: `airmail-red`, underline offset 3px. Side-column action row: Undo · Hint · Restart, each with its key caption. (DESIGN › Button; EXPERIENCE › Button)
- UX-DR14: Header. Wordmark "Traveller Sudoku" (`brand`, `ink`) + small-caps tagline "correspondence by puzzle" in `airmail-red`; on the Puzzle screen the destination title in `city-title` ("Lisbon · Mid · Medium") with meta in `body` `ink-muted` ("Portugal — Europe, Postcard 5 of 10") and the Stamp; Free Play shows "Free Play · Medium" and no Stamp; Album header shows wordmark and nav only. Nav: Puzzle · Album · Free Play · Settings as links in `label`, current surface `airmail-red` with 1px underline, each >= 24×24px; "Puzzle" disabled when no current Puzzle exists. Header closed by a 3px double `ink` rule. (DESIGN › Header, nav-link; EXPERIENCE › Navigation, Header)
- UX-DR15: Region tabs. Europe · Asia · The Americas in small-caps `label` with count in `meta` `ink-muted` ("Europe 4 / 10"); active tab underlined with a 3px double `ink` rule; targets >= 24×24px. Album opens on the Region of the last Postcard, else Europe. (DESIGN › Region tabs; EXPERIENCE › Region tabs)
- UX-DR16: Album page layout. One Region per page; 10 slots in a 5-column grid with 12px gap, ordered Near → Mid → Far; heading in `city-title` ("Where to next?" / "Where to first?"). (DESIGN › Layout & Spacing)
- UX-DR17: Album slot, Collected. Miniature Postcard face: `card`, 1px `rule-thin` border, 4px airmail-stripe top edge, City (`body` `ink`), country · Tier (`caption` `ink-muted`), the line in `meta` italic `ink`. Click opens the Postcard viewer. (DESIGN › Album slot; EXPERIENCE › Album slot)
- UX-DR18: Album slot, Collected just arrived. Collected layout + 2px `airmail-red` outline + caption "just arrived" in `airmail-red`; static under reduced motion. (DESIGN › Album slot; EXPERIENCE › Motion)
- UX-DR19: Album slot, Reachable. Blank `card`, hairline border, City + country · Tier, call to action "Travel here" in small-caps `airmail-red`; click starts that City's Puzzle. (DESIGN › Album slot)
- UX-DR20: Album slot, Reachable in progress. Reachable layout with "Carry on" instead of "Travel here"; click resumes the session exactly as left. (DESIGN › Album slot; EXPERIENCE › State Patterns › In progress)
- UX-DR21: Album slot, Collected with replay in progress. Collected layout plus "Carry on" in small-caps `airmail-red`; "Carry on" resumes the replay session. (DESIGN › Album slot; EXPERIENCE › Album slot)
- UX-DR22: Album slot, Locked. No fill, 1px dashed `rule-thin` border, `ink-muted` caption "Opens after 3 Near Postcards" (Mid) or "Opens after 3 Mid Postcards" (Far); no City name shown; not clickable but focusable for its label; text keeps >= 4.5:1 (fading by fill and border only). Unlock computed live (AD-6). (DESIGN › Album slot; EXPERIENCE › Album slot, State Patterns › Locked)
- UX-DR23: Postcard component. `card` with 8px airmail-stripe border (repeating −45° `airmail-red` 12px / `desk` 8px / `rule-box` 12px / `desk` 8px), rotated −1°, square corners. Two halves split by 1px `rule-thin`: left = the line in `postcard-line` `ink`; right = Postmark overlapping the Stamp and three ruled address lines ("To: the Traveller" · "Album · Europe" · "Lisbon, Portugal", `body` with 1px `rule-thin` baseline rule). "Add to Album" primary button below. The line sits in a labelled region ("Postcard from Lisbon") tied to the button by `aria-describedby`. (DESIGN › Postcard, airmail-stripe; EXPERIENCE › Postcard)
- UX-DR24: Stamp. `airmail-red` face, `card` 9px caps text: country top, glyph centre, Tier bottom; perforated edge = 5px dotted `desk` border + 2px `card` outline; rotated +3°; 74×88px in the header, 52×62px on the Postcard; decorative (`aria-hidden`) with content repeated in nearby text. Not shown in Free Play. (DESIGN › Stamp; EXPERIENCE › Stamp / Postmark)
- UX-DR25: Postmark. Double circle (2px outer + 1px inner) in `postmark` at 75% opacity, City name in caps and date as DD MMM YY caps ("06 OCT 26"); decorative only (`aria-hidden`), not the deferred clean-solve reward. (DESIGN › Postmark)
- UX-DR26: Postcard viewer. Opens over the Album page from a Collected slot, non-blocking; reuses the Postcard component with "Play again" in place of "Add to Album"; closes with Esc or one click outside it; focus moves to "Play again" on open and back to the originating slot on close. "Play again" always starts a fresh grid (AD-10); the collected Postcard is unchanged. (DESIGN › Postcard; EXPERIENCE › IA, Postcard viewer)
- UX-DR27: Hint panel. In the side column right of the grid, never over it: `card`, 1px `rule-thin` border, 1px `fill-highlight` inner frame inset 6px, hard 3px 4px `fill-highlight` shadow, padding 16px 18px 14px. Small-caps `airmail-red` step label, explanation in `hint-text` `ink`, step buttons, and a "What's a [Technique]?" link that opens the definition inside the panel. Idle label "Hint" with first step "Show a nudge"; returns to idle whenever the Puzzle's digits change, including Undo (AD-11); closes with Esc ("Esc to set aside"). (DESIGN › Hint panel; EXPERIENCE › Hint panel)
- UX-DR28: Hint step 1, "Show a nudge". Names the Technique and the area (row, column or box) to look at, rendered from the first `Step`'s technique and `unit`; area cells get the hint-focus dashed ring. (EXPERIENCE › Interaction Primitives › Hint; AD-11)
- UX-DR29: Hint step 2, "Explain it". One or two plain sentences covering the whole chain, involved cells marked; wording from one template per Technique in `content/techniques` (e.g. hidden single in a row: "In row {r}, a {d} fits only in column {c}. Every other empty cell in the row already has a {d} in its column."). (EXPERIENCE › Hint, Voice and Tone; AD-3)
- UX-DR30: Hint step 3, "Show me the move". Places the digit via `hintApplied` through the normal Undo path and increments `hintsUsed`. (EXPERIENCE › Hint; AD-11)
- UX-DR31: Hint Mistake branch. If the grid holds any Mistake (regardless of the Mistake Assist), the Hint reports the first Mistake in row-major order instead: step 1 "One of your digits doesn't fit — look at row {r}." pointing to the Mistake cell; step 2 explains the digit differs from the solution path; step 3 clears that digit through the normal Undo path. With the Mistake Assist off, the Mistake mark shows only while that Hint is open. (EXPERIENCE › Mistake branch; AD-9)
- UX-DR32: Notice banner. Inline, non-modal: `card`, 1px `rule-thin` border, 4px left edge in `postmark` (info) or `airmail-red` (save failed), `body` `ink` text plus exactly one text button that dismisses it; no icons and no bare "×". On Album and other non-Puzzle screens it spans content width in a band directly under the header and pushes content down; on the Puzzle screen it sits at the top of the side column at side-column width so the grid never moves; never overlays the grid. At most one visible; priority read-only > save failed > storage notice > persistence > update ready. Stays until resolved or dismissed. (DESIGN › Notice banner, Layout; EXPERIENCE › Notice banner; AD-12)
- UX-DR33: Restart confirm. Replaces the Undo · Hint · Restart row inline in the side column (no overlay): `body` question "Clear your digits and Notes? The Givens stay.", then "Restart" (default button) and "Keep going" (primary). Focus moves to "Keep going" on open; "Keep going" or Esc cancels; "Restart" clears all entries except Givens and is undoable; on close focus returns to "Restart" in the restored row. (DESIGN › Restart confirm; EXPERIENCE › Restart confirm, Focus after change; FR22)
- UX-DR34: Difficulty picker. Segmented control "Easy | Medium | Hard" styled like the Mode indicator (1px `ink` border, active inverted, each segment >= 24×24px); preselects the last Free Play Difficulty from `settings`; disabled in `ink-muted` while generating with status "Finding a fair Puzzle…". (DESIGN › Difficulty picker; EXPERIENCE › Difficulty picker)
- UX-DR35: Focus ring. Every focusable control shows a 3px solid `focus` outline with 3px offset. Inside the grid the selected-cell ring is the cursor; the grid frame itself carries the focus ring while the grid has focus. (DESIGN › Focus ring)
- UX-DR36: Settings screen and toggles. Settings holds three Assist switches (Mistake highlighting default Off; same-digit highlighting default On; row/column/box highlighting default On) and the Lamplight switch. Toggle: label left (`body`), state word right ("On" / "Off", small-caps `label`), On in `ink`, Off in `ink-muted`; state carried by the word, not colour; >= 24×24px. Click or Space toggles; takes effect immediately and is saved; Lamplight swaps all colour tokens instantly. "Tidy notes after a placement" is not included. (DESIGN › Settings toggle; EXPERIENCE › Settings toggle, Resolved Questions 3; FR5)

**Information architecture and layout**

- UX-DR37: Puzzle screen layout. Two columns on `desk`: grid card left; side column right (max 440px), 44px apart; page gutters 44px × 26px; header across the top. Side column order top to bottom: notice banner (when showing), Hint panel, mode indicator, digit pad, action row (Undo · Hint · Restart); the "Full, not solved" line also appears in the side column. (DESIGN › Layout & Spacing; EXPERIENCE › IA)
- UX-DR38: Responsive breakpoint. Designed at 1280px. Below 1100px viewport width the side column stacks under the grid (single breakpoint): vertical scroll only, focus order unchanged, grid keeps its fixed size (WCAG 1.4.10 2D-layout exception); full 320px reflow out of scope; no blocking "unsupported" message. (EXPERIENCE › Responsive & Platform; DESIGN › Layout)
- UX-DR39: Navigation and launch rule. Header nav Puzzle · Album · Free Play · Settings; "Puzzle" returns to the current Puzzle and is disabled when none exists. On launch, if any Puzzle is `inProgress` open the Puzzle screen on `meta.lastPlayedKey` (or, if that one is solved or missing, the first `inProgress` City in catalogue order, then Free Play); otherwise open the Album. Leaving a Puzzle never asks for confirmation. No modals anywhere. (EXPERIENCE › IA › Launch rule, Navigation; AD-10)
- UX-DR40: Album surface. The Album is the collection and destination chooser (no separate map): Region tabs, slots, heading; reached from launch, nav "Album", and "Add to Album". (EXPERIENCE › IA)
- UX-DR41: Free Play entry surface. Reached via nav "Free Play": Difficulty picker + start; with no Free Play in progress shows the start button; when one is in progress shows "Carry on" (primary) and "Start a new one", where starting new asks inline "This replaces your current Free Play Puzzle." On start, the Puzzle screen opens with header "Free Play · {Difficulty}". (EXPERIENCE › IA, State Patterns › Free Play in progress)

**State patterns**

- UX-DR42: Empty Album (first launch). Album opens on Europe: 4 Near slots "Travel here", Mid and Far slots locked; heading "Where to first?"; storage notice banner above the slots; play is not blocked. (EXPERIENCE › State Patterns, First launch)
- UX-DR43: In progress. Album slot shows "Carry on"; the Puzzle opens exactly as left (digits and Notes); Undo history not kept across reload. (EXPERIENCE › State Patterns; FR17)
- UX-DR44: Full, not solved. When every cell is filled but the grid isn't the solution: calm inline side-column line "Something doesn't fit yet — want a hint?" with a Hint button whose Hint points to a Mistake; nothing else changes (Mistake highlighting not forced on, input stays live, no game over). (EXPERIENCE › State Patterns)
- UX-DR45: Solved, first time (Postcard reveal). Grid stays visible, input stops; Postcard slides onto the finished grid (in place, no slide, under reduced motion); grid and side column become `inert`; focus moves to "Add to Album"; "Add to Album" or Esc (the only ways to dismiss) sets `revealed: true` and opens the Album on that Region with the new slot "just arrived", heading "Where to next?", focus on the Album heading. A Postcard with `revealed=false` is shown again on next load. (EXPERIENCE › State Patterns, Postcard; AD-6; FR14)
- UX-DR46: Solved, replay. No Postcard; inline line "Solved again. Lisbon is already in your Album." with a link to the Album. (EXPERIENCE › State Patterns; FR16)
- UX-DR47: Free Play solved. No Postcard; inline "Solved. Another one?" with a link to Free Play entry. (EXPERIENCE › State Patterns; FR23)
- UX-DR48: Read-only tab. When another tab holds the save lock ("Traveller Sudoku is open in another tab. Play there, or close it and reload this one.") or stored data is from a newer version ("A newer version saved your progress. Reload to carry on."): banner shown; grid, pad and Settings visible but inert; Hint unavailable. (EXPERIENCE › State Patterns, Voice and Tone; AD-7)
- UX-DR49: Save failed. Banner with `airmail-red` accent edge: "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here." · "Got it"; play continues; next change retries; banner clears on next successful save or dismissal; announced once in the live region. (EXPERIENCE › State Patterns; AD-7; FR24)
- UX-DR50: Unreadable save. Album banner "We couldn't read your saved progress. It's been kept safe, not overwritten." · "Got it"; starts from an empty Album while the old data stays under its backup key. (EXPERIENCE › State Patterns; AD-7)
- UX-DR51: Update ready. Informational banner "A new version is ready. It arrives next time you open the game." · "Got it"; never reloads. (EXPERIENCE › State Patterns; AD-8)
- UX-DR52: Persistence not granted (Safari / Add to Dock). When `persist()` is refused on Safari, the Album shows "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it." · "Got it" after the storage notice is dismissed, and again after the first Postcard; other browsers show nothing. (EXPERIENCE › State Patterns; AD-7)
- UX-DR53: Free Play generating. Start button replaced by "Finding a fair Puzzle…"; Difficulty picker disabled; on worker reply the Puzzle screen opens; stale replies (non-latest request id) ignored. (EXPERIENCE › State Patterns; AD-10)

**Interaction primitives**

- UX-DR54: Cell-first input. Select a cell (click or arrows), then type 1–9 or click a pad key to enter. Givens can be selected but never changed (live region "Given, can't change"). Entering the same digit into a cell that already holds it clears it. Backspace/Delete clears the selected cell. (EXPERIENCE › Input modes, Keyboard map; FR2)
- UX-DR55: Number-first input. Select a digit (pad or 1–9), then click cells to place it; via keyboard, Enter or Space places the current digit in the cursor cell. M toggles cell-first / number-first. (EXPERIENCE › Input modes; FR2)
- UX-DR56: Notes input. N toggles Digit / Notes; in Notes mode a digit toggles that Note in an empty cell; placing a digit hides the cell's Notes. (EXPERIENCE › Notes; FR3)
- UX-DR57: Keyboard map and scoping. Arrows move selected cell (no wrap); 1–9 digit/Note (cell-first) or choose digit (number-first); Enter/Space place (number-first) or activate focused control; Backspace/Delete clear; N Digit/Notes; M input mode; Ctrl+Z (Cmd+Z on macOS) Undo; H opens Hint at "Show a nudge" then advances one step per press; Esc closes Hint panel / Technique definition / Restart confirm / Postcard viewer. Single-key shortcuts (1–9, N, M, H) and Ctrl/Cmd+Z are active only while focus is in the grid or side column; they do nothing on header nav, Album and Settings. All handled by the single `ui/keyboard` handler. (EXPERIENCE › Keyboard map; FR21; Conventions › Input)
- UX-DR58: Undo. Unlimited; covers digits, Notes, Hint moves and Restart; no redo; Ctrl/Cmd+Z or the Undo button. (EXPERIENCE › Undo; FR4)
- UX-DR59: Calm motion. Only the Postcard slide-in and the "just arrived" mark move; nothing moves while solving; both static under reduced motion; no audio anywhere. (EXPERIENCE › Motion; DESIGN › Do's and Don'ts)

**Accessibility floor**

- UX-DR60: Grid semantics. `role="grid"` with 9 rows of `gridcell`s and roving `tabindex` (single tab stop); arrows move the selected cell; grid becomes `inert` while a Postcard is shown. (EXPERIENCE › Grid, Accessibility Floor)
- UX-DR61: Cell accessible labels. Format "Row 4, column 6, 1" plus role: "given", "your digit", "notes 6, 7", or "empty"; "mistake" appended when shown; "hint" appended when hint-focused. (EXPERIENCE › Accessibility Floor)
- UX-DR62: Live-region announcements. Polite live region with 1–2 word messages where possible: digit entered ("7"), Note added/removed ("note 7 added"), Given refusal ("Given, can't change"), mode switch, Hint text, solved; saves are not announced; a save failure is announced once. (EXPERIENCE › Accessibility Floor)
- UX-DR63: Focus order. Header nav → notice banner (Album and other screens) → grid → side column (notice banner on Puzzle screen, Hint panel → mode indicator → digit pad → Undo · Hint · Restart); every control reachable by Tab. (EXPERIENCE › Accessibility Floor)
- UX-DR64: Focus after change. Hint resets to idle → grid if focus was in the panel, else unchanged; Restart confirm opens → "Keep going"; closes → "Restart"; banner dismissed → grid (Puzzle screen) or page heading elsewhere; route change → grid (Puzzle screen) or page heading; Technique definition opens → definition, closes → "What's a [Technique]?" link; Postcard reveal → "Add to Album", then Album heading; Postcard viewer opens → "Play again", closes → originating slot. (EXPERIENCE › Focus after change)
- UX-DR65: Targets and non-colour cues. Every interactive control (nav, tabs, segments, toggles, banner buttons) has a >= 24×24px mouse target; no state is carried by colour alone (every highlight has a mark; Settings states are words; Mistakes use umber + dotted underline + dot, never red, "✗" or shaking). (EXPERIENCE › Accessibility Floor; DESIGN › Do's and Don'ts)
- UX-DR66: Reduced motion and contrast in both themes. Postcard appears without sliding and "just arrived" is static under `prefers-reduced-motion`; WCAG AA contrast holds in Daylight and Lamplight. (EXPERIENCE › Accessibility Floor)

**Voice and tone**

- UX-DR67: Microcopy set. All user-facing strings come from the EXPERIENCE › Voice and Tone table (warm, brief, no exclamation celebrations, never "Wrong!", no urgency): "Where to next?", "Where to first?", "Travel here", "Opens after 3 Near/Mid Postcards", "Carry on", "just arrived", "Play again", "Europe 4 / 10", "No rush - your Puzzle will wait.", "Hint", "Show a nudge" → "Explain it" → "Show me the move", per-Technique step-2 templates, "What's a {Technique}?", Mistake nudge, "Something doesn't fit yet — want a hint?", "Esc to set aside", "Add to Album", replay/Free Play solved lines, "Finding a fair Puzzle…", Restart confirm, storage notice ("Your Album lives in this browser only. Clearing browser data erases it." · "Got it"), Safari, save failed, read-only (two variants), unreadable save, update ready. Strings are centralised so the creator can reword († drafts). (EXPERIENCE › Voice and Tone)

**Key flows**

- UX-DR68: UJ-1 flow (pick next stop). Launch with nothing in progress → Album on Europe with Mid slots now "Travel here" → click Lisbon → Puzzle screen "Lisbon · Mid · Medium" with Stamp → play cell-first with N for Notes → H nudge names hidden single in row 4 → "Explain it" → player places 7, panel returns to idle → last cell solves → Postcard slides onto grid → "Add to Album" → Album on Europe, Lisbon "just arrived", heading "Where to next?". Failure branches: save failure banner in side column; Mistake redirects Hint; full-with-Mistake shows "Something doesn't fit yet". (EXPERIENCE › Key Flows › UJ-1)
- UX-DR69: UJ-2 flow (return after a break, offline). Reopen offline → service worker serves the app → saved data loads → half-finished Puzzle opens directly with digits and Notes exactly as left → carry on. Failure branches: other tab → read-only banner; newer-version data → read-only "Reload to carry on". (EXPERIENCE › Key Flows › UJ-2)
- UX-DR70: First-launch flow. No saved data → Album on Europe, "Where to first?" → storage notice banner above slots, play not blocked → "Got it" sets `seenStorageNotice` and requests persistent storage → if refused on Safari, Add to Dock banner; otherwise nothing more → player picks a Near City "Travel here" and the first Puzzle opens. (EXPERIENCE › Key Flows › First launch)

### FR Coverage Map

FR1: Epic 1 - Graded, uniquely solvable Free Play Puzzles; Epic 3 - City Puzzles match their Tier
FR2: Epic 1 - Cell-first and number-first input
FR3: Epic 1 - Notes and visible mode
FR4: Epic 1 - Undo
FR5: Epic 1 - Assists and their defaults
FR6: Epic 1 - No game over
FR7: Epic 1 - Completion detection (Postcard award added in Epic 3)
FR8: Epic 2 - Hint content
FR9: Epic 2 - Three-step Hint
FR10: Epic 2 - Technique help
FR11: Epic 2 - Hints read digits and report Mistakes
FR12: Epic 3 - Choose a destination, unlock rules
FR13: Epic 3 - 30 Cities, 4/3/3 per Region
FR14: Epic 3 - Postcard reveal
FR15: Epic 3 - Album
FR16: Epic 3 - Replay without duplicates
FR17: Epic 4 - Autosave
FR18: Epic 4 - Offline play that survives updates
FR19: Epic 4 - Storage notice
FR20: Epic 1 - Readable grid, WCAG AA, Daylight and Lamplight
FR21: Epic 1 - Keyboard play
FR22: Epic 1 - Restart
FR23: Epic 1 - Free Play
FR24: Epic 4 - Durable storage

## Epic List

### Epic 1: Play a calm Sudoku in the browser
The player can open the site and play Free Play Puzzles at Easy, Medium or Hard with mouse or keyboard, in Daylight or Lamplight, with Notes, both input modes, Undo, Restart and Assists, and never a game over. Includes the starter-template setup, the engine (Technique pipeline, grader, generator), CI and deployment to GitHub Pages, and the accessibility floor.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR20, FR21, FR22, FR23

### Epic 2: Hints that teach
When stuck, the player can ask for a Hint that goes "Show a nudge" -> "Explain it" -> "Show me the move", read Technique definitions, have Mistakes pointed out, and see "Something doesn't fit yet" on a full but wrong grid.
**FRs covered:** FR8, FR9, FR10, FR11

### Epic 3: Travel and collect Postcards
The player can choose Cities from the Album, solve their pre-built Puzzles, receive Postcards in a warm reveal, unlock Mid and Far Cities, replay collected Cities, and resume the last-played Puzzle. Runs on placeholder City content until the creator supplies the 30 Cities and Postcard lines.
**FRs covered:** FR1, FR12, FR13, FR14, FR15, FR16

### Epic 4: Never lose your journey
The player's Album and Puzzles survive reloads, going offline, new versions and a second tab, with the storage notice, persistent-storage request (and Safari "Add to Dock" tip), save-failed and update-ready notices.
**FRs covered:** FR17, FR18, FR19, FR24

## Epic 1: Play a calm Sudoku in the browser

The player can open the site and play Free Play Puzzles at Easy, Medium or Hard with mouse or keyboard, in Daylight or Lamplight, with Notes, both input modes, Undo, Restart and Assists, and never a game over. Includes the starter-template setup, the engine (Technique pipeline, grader, generator), CI and deployment to GitHub Pages, and the accessibility floor.

### Story 1.1: Publish the Traveller Sudoku shell

As a creator,
I want the project scaffolded from the agreed starter, guarded by architecture tests and deployed automatically from `main`,
So that every change reaches players as a calm, private, static site and the pure core stays pure from day one.

**Acceptance Criteria:**

**Given** an empty repository
**When** the project is scaffolded with `create-vite` 9.2 using the `react-ts` template
**Then** `package.json` pins Vite 8.3, React and React DOM 19.3, TypeScript 6.0, `@vitejs/plugin-react` 6.1, oxlint 1.85 and Vitest 5.0
**And** `.nvmrc` contains Node.js `24`
**And** `npm ci`, `npm test`, `npm run lint` (oxlint) and `npm run build` all succeed locally with zero errors
**And** `vite-plugin-pwa` and `idb-keyval` are not yet added (Epic 4)

**Given** the scaffolded project
**When** the source tree is inspected
**Then** the AD-1 layout exists: `src/engine/`, `src/game/`, `src/content/`, `src/persistence/`, `src/workers/`, `src/ui/`, `scripts/`, `tests/architecture/`, `public/`, `.github/workflows/`
**And** file names are kebab-case and type names PascalCase

**Given** the Vitest architecture test in `tests/architecture/`
**When** a file in `src/engine/` imports anything outside `src/engine/`, or a file in `src/game/` imports anything other than `src/engine/` or `src/content/`, or any other AD-1 direction (`persistence` → `game`; `workers` → `engine`; `ui` → `game`, `content`, `persistence`, `workers`; `scripts` → `engine`, `content`) is broken
**Then** `npm test` fails and names the offending file and import
**And** the clean tree passes

**Given** the same architecture test
**When** a file in `src/engine/` or `src/game/` references `Math.random`, `Date`, `window`, `document`, `localStorage`, `indexedDB`, or imports `react` / `react-dom`
**Then** `npm test` fails and names the offending file and global

**Given** the GitHub Actions workflow `.github/workflows/ci-deploy`
**When** a commit is pushed to `main` (or a pull request targets `main`)
**Then** it runs `npm ci`, then `npm run lint`, then `npm test`, then `npm run build`
**And** publishing is opt-in: only when the repository variable `PAGES_ENABLED` is `true` does a push to `main` deploy the build output to GitHub Pages, and only if every step succeeds; until then nothing is published
**And** when any step fails, nothing is deployed and the previously published site (if any) stays live
*(Reconciled 2026-10-09: the repo is private, so deploy was made opt-in behind `vars.PAGES_ENABLED` in commit 322efeb; the site has not gone live yet; going live belongs to TS-38. Retro 1–3 S1; `.github/workflows/ci-deploy.yml:30-44`.)*

**Given** the site is published at `https://<owner>.github.io/<repo>/` (once `PAGES_ENABLED` is set)
**When** a visitor opens it
**Then** every asset loads from the `/<repo>/` path with no 404s (Vite `base` = repository path)

**Given** the built `index.html`
**When** it is inspected
**Then** it contains `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`
**And** loading the deployed page in Chrome shows zero cross-origin requests in the network log and no CSP violations in the console
**And** no font file is downloaded; text renders in the system serif stack `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif`

**Given** the theme stylesheet
**When** it is inspected
**Then** the 16 Airmail Daylight colour roles exist as CSS custom properties with the exact hexes of UX-DR1, plus the typography tokens of UX-DR4 and the spacing, sizing and shape tokens of UX-DR5
**And** components reference the tokens, never raw hex values

**Given** a visitor opens the site
**When** the page renders
**Then** they see the `desk` background with its faint paper grain, and a header with the wordmark "Traveller Sudoku" (`brand`, italic, `ink`) and the small-caps tagline "correspondence by puzzle" in `airmail-red`, closed by a 3px double `ink` rule
**And** there are no pop-ups, no sound, no animation, no analytics or tracking scripts, no service worker, and nothing is written to browser storage

**Covers:** NFR2, NFR6, NFR7, NFR14, NFR15, AD-1, AD-12, UX-DR1, UX-DR4, UX-DR5, UX-DR6, UX-DR14, Starter template, CI/CD and hosting, Conventions (naming)

### Story 1.2: Solve a puzzle with the mouse

As a player,
I want to open a Puzzle and fill it in by clicking a cell and then a digit,
So that I can solve a calm Sudoku with no pressure and no way to lose.

**Acceptance Criteria:**

**Given** the site loads
**When** the app starts
**Then** the Puzzle screen shows the built-in sample Puzzle, read from a fixture in `src/content/` holding `givens`, `solution` and `difficulty` as 81-character digit strings (cells 0–80 row-major, 0 = empty)
**And** `AppState` = `{ album, sessions, settings, meta, ui }` holds it as `sessions['free']` with the AD-10 Session shape `{ key: 'free', givens, solution, digits (= givens), notes (81 zeros), status: 'inProgress', difficulty, hintsUsed: 0 }`

**Given** the Puzzle screen
**When** it renders at 1280px wide
**Then** the grid card sits left and the side column (max 440px) right, 44px apart, with page gutters 44px × 26px
**And** the grid has a `card` background, 3px `rule-box` frame, 14px padding, 58px square cells, 1px `rule-thin` cell rules, 2px `rule-box` box rules and the frame shadow rotated −0.4°
**And** each Given shows in `cell-given` (bold upright, `given`), each player digit in `cell-player` (italic, `player-ink`), and empty cells show `card` only

**Given** any player input
**When** the UI handles it
**Then** it dispatches a past-tense action (e.g. `cellSelected`, `digitEntered`) to `game/reducer(state, action)` and never mutates state
**And** a unit test shows the reducer returns a new state and leaves the input state unchanged

**Given** an empty cell
**When** the player clicks it
**Then** it becomes the selected cell, shown with `fill-selected` and a 3px inset `airmail-red` ring

**Given** a selected empty cell
**When** the player clicks digit-pad key 5
**Then** the cell shows 5 as a player digit
**And** clicking key 8 next replaces it with 8

**Given** a selected cell holding the player digit 5
**When** the player clicks key 5 again
**Then** the cell is cleared

**Given** a selected Given
**When** the player clicks any digit-pad key
**Then** the Given is unchanged, no dialog or error message appears, and the reducer returns the same `digits`

**Given** no cell is selected
**When** the player clicks a digit-pad key
**Then** nothing changes

**Given** the player enters a digit that differs from the solution (a Mistake)
**When** the grid updates
**Then** the digit looks exactly like any other player digit: no red, no "Wrong!", no shake, no sound
**And** the Puzzle stays `inProgress`; there are no lives, no counters and no game over

**Given** every cell is filled but `digits` ≠ `solution`
**When** the last cell is filled
**Then** the status stays `inProgress`, input stays live, and nothing overlays or covers the grid

**Given** one empty cell remains and the player enters the correct digit
**When** `digitEntered` is reduced
**Then** in that same reducer step `digits === solution` is detected and the session's `status` becomes `solved` (unit-tested; there is no UI-dispatchable `puzzleSolved` action)
**And** the grid stays visible, further pad clicks change nothing, and a calm italic solved line appears in the side column with no confetti, flashing or sound; a Free Play solve shows no Postcard and nothing animates, while the first solve of a City shows Story 3.3's Postcard reveal, which slides onto the finished grid
*(Reconciled 2026-10-09: Epic 3's Postcard reveal superseded "no Postcard, no animation" for City solves; the Free Play line became "Solved. Another one?" in Story 1.8. Retro 1–3 S5; `src/ui/puzzle.css` Postcard motion.)*

**Covers:** FR2, FR6, FR7, NFR1, NFR2, NFR13, AD-5, AD-6, AD-10, UX-DR7, UX-DR8, UX-DR9, UX-DR37, UX-DR54, Conventions (cells, digit strings, past-tense actions)

### Story 1.3: Notes and number-first entry

As a player,
I want to pencil in Notes and to choose a digit first and then click the cells it goes in,
So that I can solve the way I like and always know which mode I'm in.

**Acceptance Criteria:**

**Given** the Puzzle screen
**When** it renders
**Then** the mode indicator is always visible as a two-part segmented control "Digit | Notes (N)" with a 1px `ink` border, the active segment inverted (`ink` fill, `card` text), each segment at least 24×24px
**And** beside it an italic `meta` `ink-muted` status line names the input mode (cell-first / number-first), Digit or Notes, and the selected cell or current digit (e.g. "cell-first · Notes · row 4, column 6")

**Given** Digit mode and a selected empty cell
**When** the player clicks the "Notes" segment, then clicks pad key 7
**Then** Note 7 is added to the cell, shown in a 3×3 mini-grid in `cell-note` / `note` with 7 in position 7
**And** clicking key 7 again removes that Note

**Given** the session state
**When** Notes change
**Then** `notes` stays an array of 81 numbers, each a 9-bit mask from 0 to 511 where bit (d−1) means Note d (unit-tested)

**Given** Notes mode and a selected Given or a cell holding a player digit
**When** the player clicks a pad key
**Then** no Note is added and the cell is unchanged

**Given** a cell with Notes 3 and 7
**When** the player places a digit in it (Digit mode)
**Then** the cell's Notes are hidden while the digit is there
**And** clearing the digit shows Notes 3 and 7 again

**Given** cell-first mode
**When** the player clicks the input-mode control in the mode indicator area
**Then** the mode becomes number-first and the status line says so

**Given** number-first mode
**When** the player clicks pad key 7
**Then** 7 becomes the current digit, its key shows a 2px solid `airmail-red` border and `fill-highlight`, and the status line names it
**And** clicking empty cells places 7 in each one while 7 stays locked until another digit is chosen
**And** clicking a cell already holding the player digit 7 clears it; clicking a Given changes nothing

**Given** number-first mode with no current digit
**When** the player clicks a cell
**Then** the cell is only selected and nothing is placed

**Given** number-first mode, Notes on and current digit 4
**When** the player clicks an empty cell
**Then** Note 4 toggles in that cell

**Given** the digit pad
**When** the grid changes
**Then** each key's caption shows how many of that digit remain ("3 left"), counting Givens and every player digit including Mistakes

**Given** nine (or more, because of Mistakes) 7s are on the grid
**When** the pad renders
**Then** key 7 shows its digit in `ink-muted` struck through, its count reads "Done", its accessible name is "7, all placed", and it stays clickable
**And** the count never goes below zero

**Covers:** FR2, FR3, AD-10, UX-DR8, UX-DR11, UX-DR12, UX-DR55, UX-DR56

### Story 1.4: Undo and Restart

As a player,
I want to take back any move and to start the Puzzle over after a quick check,
So that trying an idea never costs me anything.

**Acceptance Criteria:**

**Given** the side column
**When** it renders
**Then** the action row shows "Undo" and "Restart" as default buttons (transparent, `ink` text, 3px double `rule-box` border, small-caps, square corners); "Undo" carries the key caption ("Ctrl+Z", or "⌘Z" on macOS) in `caption` `ink-muted`, and "Restart" has no key caption (it has no shortcut)
**And** from Story 2.1 the row reads "Undo · Hint · Restart", with "Hint" between them
*(Reconciled 2026-10-09: Restart never had a shortcut, so it shows no caption; Story 2.1 inserted Hint. Retro 1–3 S2; `src/ui/action-row.tsx:82-105`.)*

**Given** the player has made several digit entries, clears and Note changes
**When** they click "Undo" repeatedly
**Then** each click reverts exactly one change in reverse order, all the way back to the Puzzle's starting grid (no limit)
**And** the undo history lives only in `ui.undo` and is never part of `sessions`, `settings`, `album` or `meta`

**Given** an action that changes nothing (a digit on a Given, a cell selection, a mode switch)
**When** it is reduced
**Then** no undo entry is recorded

**Given** the undo history is empty
**When** the player clicks "Undo"
**Then** nothing changes and no error is shown

**Given** an in-progress Puzzle
**When** the player clicks "Restart"
**Then** the action row is replaced inline (no overlay; the grid neither moves nor is covered) by "Clear your digits and Notes? The Givens stay." with "Restart" (default button) and "Keep going" (primary)

**Given** the Restart confirm is showing
**When** the player clicks "Keep going"
**Then** the action row returns and the grid is unchanged

**Given** the Restart confirm is showing
**When** the player clicks "Restart"
**Then** `restartConfirmed` resets `digits` to the Givens and every `notes` mask to 0, status stays `inProgress`, and the action row returns

**Given** the player has just restarted
**When** they click "Undo"
**Then** the full pre-restart grid, digits and Notes, comes back from the snapshot stored before the restart

**Given** the Puzzle is solved
**When** the player clicks "Undo"
**Then** nothing changes; a solved Puzzle stays solved

**Covers:** FR4, FR22, AD-5, AD-10, UX-DR13, UX-DR33, UX-DR58, Conventions (`undoRequested`, `restartConfirmed`)

### Story 1.5: Play with the keyboard and a screen reader

As a player,
I want to play the whole Puzzle by keyboard and hear what changes,
So that I can solve without a mouse or without seeing the screen.

**Acceptance Criteria:**

**Given** the codebase
**When** the architecture test runs
**Then** all shortcuts are handled by the single handler in `src/ui/keyboard`, and no other component registers key listeners (`onKeyDown` / `addEventListener('key…')`) for shortcuts

**Given** focus is in the grid
**When** the player presses an arrow key
**Then** the selected cell moves one cell in that direction
**And** at the grid's edge it stays put (no wrap)

**Given** cell-first mode and a selected cell
**When** the player presses 1–9
**Then** the digit is entered (Digit mode) or that Note toggled (Notes mode), with the same rules as mouse entry (same digit clears, Givens never change)

**Given** number-first mode
**When** the player presses 1–9
**Then** that digit becomes the current digit
**And** Enter or Space places it in the selected cell

**Given** a selected cell holding a player digit, or an empty cell with Notes
**When** the player presses Backspace or Delete
**Then** the digit (or, in an empty cell, its Notes) is cleared, and Undo can restore it
**And** on a Given nothing changes and the live region says "Given, can't change"

**Given** focus is in the grid or the side column
**When** the player presses N, M, Ctrl+Z (Cmd+Z on macOS) or H
**Then** N toggles Digit / Notes, M toggles cell-first / number-first, Ctrl/Cmd+Z undoes one change, and H opens the Hint panel and advances it one step per press (Story 2.1)
*(Reconciled 2026-10-09: "H does nothing yet" was superseded by Epic 2's Hint key. Retro 1–3 S5; `src/ui/keyboard.ts`.)*

**Given** focus is on the header (wordmark)
**When** the player presses 1–9, N, M, H or Ctrl/Cmd+Z
**Then** nothing happens to the Puzzle

**Given** the Restart confirm is open
**When** it opens
**Then** focus moves to "Keep going"
**And** Esc or either button closes it and focus returns to "Restart" in the restored action row

**Given** a screen-reader user
**When** they Tab into the Puzzle screen
**Then** the grid is `role="grid"` with 9 rows of `gridcell`s and a roving `tabindex` (one tab stop), and the focus order is header (wordmark) → grid → side column (mode indicator → digit pad → Undo · Restart), every control reachable by Tab
**And** every focusable control shows a 3px solid `focus` outline with 3px offset; while the grid has focus the frame carries the ring and the selected-cell ring is the cursor

**Given** any cell
**When** its accessible name is read
**Then** it follows "Row 4, column 6, 7, your digit" / "Row 1, column 1, 5, given" / "Row 2, column 3, notes 6, 7" / "Row 9, column 9, empty"

**Given** a polite live region
**When** the player enters 7, adds or removes Note 7, tries to change a Given, switches mode, or solves the Puzzle
**Then** it announces "7", "note 7 added" / "note 7 removed", "Given, can't change", the new mode ("Notes", "Digit", "number-first", "cell-first"), or "Solved"

**Given** `prefers-reduced-motion: reduce` or not
**When** the player solves
**Then** nothing on the Puzzle screen animates or transitions, except the first solve of a City, where Story 3.3's Postcard slides onto the finished grid (and appears in place, without sliding, under reduced motion)
*(Reconciled 2026-10-09: superseded by Epic 3's Postcard reveal. Retro 1–3 S5; `src/ui/puzzle.css:76-100`.)*

**Given** a viewport narrower than 1100px
**When** the Puzzle screen renders
**Then** the side column stacks under the grid, the grid keeps its 58px cells, the page scrolls vertically only, focus order is unchanged, and no "unsupported" message appears

**Given** every interactive control (cells, pad keys, segments, buttons)
**When** measured
**Then** each mouse target is at least 24×24px and no state is shown by colour alone

**Covers:** FR2, FR3, FR21, NFR3, NFR4, NFR9, UX-DR35, UX-DR38, UX-DR57, UX-DR59, UX-DR60, UX-DR61, UX-DR62, UX-DR63, UX-DR64, UX-DR65, UX-DR66, Conventions (one keyboard handler)

### Story 1.6: Assists and Lamplight

As a player,
I want to choose which Assists help me and to switch to a dark Lamplight theme,
So that the grid reads clearly and helps exactly as much as I want.

**Acceptance Criteria:**

**Given** the header
**When** it renders
**Then** the nav shows "Puzzle · Settings" as small-caps `label` links, each at least 24×24px, with the current surface in `airmail-red` with a 1px underline
**And** choosing a link moves focus to the grid (Puzzle) or the page heading (Settings)

**Given** the header nav links
**When** measured and tabbed through on the Puzzle screen
**Then** each nav link's mouse target is at least 24×24px, its current state is not shown by colour alone (1px underline), and the focus order is header (wordmark, nav links) → grid → side column
**And** pressing 1–9, N, M, H or Ctrl/Cmd+Z while focus is on a nav link does nothing to the Puzzle

**Given** the Settings surface
**When** it opens for the first time in a page load
**Then** it lists Mistake highlighting "Off", Same-digit highlighting "On", Row, column and box highlighting "On", and Lamplight "Off", each as a toggle with the label left (`body`) and the state word right (small-caps `label`, On in `ink`, Off in `ink-muted`)
**And** "Tidy notes after a placement" is not offered
**And** the values live in `AppState.settings` and reset to these defaults on reload (saving arrives in Epic 4)

**Given** a toggle has focus
**When** the player clicks it or presses Space
**Then** its state word flips and the change takes effect immediately on the Puzzle

**Given** row/column/box highlighting is On and a cell is selected
**When** the grid renders
**Then** the cells of its row, column and box get `fill-highlight`, 12×7px `airmail-red` triangle ticks mark the row and column on the frame edge, and 2px L-shaped `airmail-red` ticks sit inside the box's four corners
**And** with the Assist Off none of these appear

**Given** same-digit highlighting is On and the selected cell holds 7
**When** the grid renders
**Then** every cell holding 7, Givens and player digits alike, gets `fill-same-digit` and a 2px `airmail-red` underline offset 4px
**And** with the selected cell empty, or the Assist Off, no same-digit marks appear

**Given** Mistake highlighting is On
**When** a player digit differs from the solution (a Mistake)
**Then** that digit shows in `mistake` umber with a 2px dotted underline offset 4px and a 6px round corner dot top-right, never `airmail-red`, never "✗", never a shake, and its cell label gains "mistake"
**And** Givens are never marked, and Mistakes are computed by an `engine/` function from the session's digits and solution only, never from Notes

**Given** Mistake highlighting is Off (default)
**When** the grid holds a Mistake
**Then** no Mistake mark appears

**Given** a cell that is selected, holds the same digit and is a Mistake
**When** it renders
**Then** the selected ring is outermost, `fill-selected` wins over `fill-same-digit` over `fill-highlight`, the dotted Mistake underline replaces the same-digit underline, and the corner dot still shows

**Given** the operating system prefers a dark colour scheme
**When** the page loads
**Then** the theme is Daylight; Lamplight is never applied automatically

**Given** the Lamplight toggle
**When** the player turns it On
**Then** every colour token swaps instantly to its `-lamplight` twin with the UX-DR2 hexes, and shadows use black at the same alpha
**And** turning it Off restores Daylight

**Given** the token pairs listed in DESIGN › Colors › Measured contrast
**When** the contrast test (Vitest) runs over both themes
**Then** every text pair is at least 4.5:1 and every non-text pair (box rules, highlight marks, ticks, focus ring) at least 3:1, and every Daylight role has a Lamplight twin
**And** changing a token so a pair falls below its threshold fails `npm test`

**Covers:** FR5, FR20, NFR8, NFR9, NFR13, AD-5, AD-9, UX-DR1, UX-DR2, UX-DR3, UX-DR9, UX-DR10, UX-DR14, UX-DR36, UX-DR57, UX-DR61, UX-DR63, UX-DR65, UX-DR66

### Story 1.7: Fair puzzles: Technique solver and grader

As a player,
I want every Puzzle graded by the Techniques it truly needs,
So that its Difficulty is honest and I never have to guess.

**Acceptance Criteria:**

**Given** a grid of digits
**When** `engine` computes candidates
**Then** it returns 81 nine-bit masks derived from the digits alone, with 0 for filled cells (unit-tested)

**Given** the Technique registry in `engine/techniques`
**When** it is read
**Then** it lists exactly, in order: naked single, hidden single, naked pair, pointing, claiming
**And** every Technique module has the same signature: grid + candidates → the next `Step` or nothing

**Given** any `Step` the engine returns
**When** it is inspected
**Then** it has exactly `{ technique, placements[], eliminations[], focusCells[], unit }` and contains no display text

**Given** a known-puzzle test set with, for each of the five Techniques, a position where it applies and one where it doesn't
**When** each Technique runs
**Then** it returns the expected placements, eliminations, focus cells and unit, or nothing

**Given** a position
**When** the solver runs
**Then** it always applies the first Technique in registry order that finds a `Step`, repeating until the grid is solved or no Technique applies
**And** on a puzzle that needs a Technique beyond the MVP set it returns an unsolved result without throwing

**Given** the known-puzzle set
**When** the grader runs
**Then** it returns `easy` when only singles were used, `medium` when naked pair is the highest Technique used, `hard` when pointing or claiming was used, and "not gradeable" for the unsolvable-by-MVP puzzle

**Given** `engine/brute.ts`
**When** it counts solutions with a limit of 2
**Then** it returns 0, 1 or 2 for an unsolvable, a unique and a multi-solution fixture
**And** no solver, grader or Hint code imports `brute.ts`

**Given** the same input
**When** the solver or grader runs twice
**Then** the results are identical, and the engine passes the architecture test (no `Math.random`, `Date`, DOM or storage)

**Given** the built-in sample Puzzle
**When** the tests run
**Then** it has exactly one solution, its solution matches the fixture, and the grader's result equals its declared Difficulty
**And** the Puzzle header shows "Free Play · {Difficulty}" (e.g. "Free Play · Easy") in `city-title`, with no Stamp

**Covers:** FR1, NFR15, AD-2, AD-3, UX-DR14

### Story 1.8: Start a Free Play Puzzle

As a player,
I want to start a fresh Puzzle at the Difficulty I choose,
So that I always have a fair Puzzle to play.

**Acceptance Criteria:**

**Given** the header nav
**When** it renders
**Then** it shows "Puzzle · Free Play · Settings"
**And** choosing "Free Play" opens the Free Play entry with focus on its heading

**Given** Free Play entry now exists
**When** the app starts with no session in progress
**Then** the built-in sample Puzzle is no longer loaded at startup (it remains only as a test fixture); `sessions` starts empty, the app opens on the Album (Story 3.5's launch rule), and the "Puzzle" nav item is disabled until a Puzzle exists
*(Reconciled 2026-10-09: the Free Play start state at startup was superseded by Story 3.5's `launch()`, which opens the Album when nothing is in progress. Retro 1–3 S4; `src/game/launch.ts:30-50`.)*

**Given** the Free Play entry
**When** it opens
**Then** a Difficulty picker "Easy | Medium | Hard" (styled like the mode indicator, segments at least 24×24px) preselects the last Free Play Difficulty in `settings`, or Easy if none was chosen yet

**Given** the Free Play Puzzle is `inProgress`
**When** the Free Play entry opens
**Then** it shows "Carry on" (primary) and "Start a new one"
**And** "Carry on" returns to the Puzzle exactly as left

**Given** no Free Play Puzzle is in progress (none, or solved)
**When** the Free Play entry opens
**Then** it shows a single start button

**Given** a Free Play Puzzle is in progress
**When** the player chooses "Start a new one"
**Then** an inline line asks "This replaces your current Free Play Puzzle." with "Start a new one" and "Keep going", no modal
**And** "Keep going" or Esc cancels and the current Puzzle is untouched

**Given** the player starts a Puzzle at Medium
**When** the request is sent
**Then** a new request id and a seed created in the shell are posted to the generator Web Worker in `src/workers/`
**And** the start button is replaced by "Finding a fair Puzzle…", the Difficulty picker is disabled in `ink-muted`, and the nav and Settings stay usable while it works (generation never runs on the main thread)

**Given** the worker replies with the latest request id
**When** the reply is reduced
**Then** `sessions['free']` is replaced by a fresh Session (digits = Givens, Notes all 0, `inProgress`, `difficulty: 'medium'`, `hintsUsed: 0`), `settings` remembers Medium, and only a Hint belonging to the old Free Play Puzzle closes
**And** the new Puzzle becomes the current Puzzle (undo history empty, `meta.lastPlayedKey` = `free`), unless a City is current and the player has left the entry: then the City stays current and the new Puzzle waits under Free Play → "Carry on"
**And** the Puzzle screen opens titled "Free Play · Medium" with focus on the grid only if the player is still on the Free Play entry; elsewhere they stay on their screen
**And** if the player went back to the old Free Play Puzzle and it is current, in progress and on the Puzzle screen, the reply is set aside: the old Puzzle, its Undo and the screen are unchanged, `settings` and `meta.lastPlayedKey` are unchanged, and only the entry returns to idle
*(Reconciled 2026-10-09: open-only-from-the-entry was a Story 1.8 decision; the set-aside rule and Hint scoping came from the Epics 1–3 retro fixes D1/D5. Retro 1–3 S3, S11; spec-1-8 Decisions; spec-retro-epics-1-3-actions.md; `src/game/reducer-free-play.ts`.)*

**Given** two requests were sent in a row
**When** the reply to the older request arrives
**Then** the reducer ignores it and only the latest reply is applied (unit-tested)

**Given** the worker reports an error
**When** the error is handled
**Then** a calm inline line appears on the Free Play entry (no browser alert), the picker is enabled again, and the current Free Play Puzzle is unchanged

**Given** `engine/generator` with a seed and a target Difficulty
**When** it runs
**Then** it accepts only Puzzles that `brute` reports as having exactly one solution and that the grader grades to the target
**And** the same seed and Difficulty always produce the same Puzzle, and tests over several seeds per Difficulty confirm uniqueness and grade

**Given** the player solves a Free Play Puzzle
**When** the last correct digit is entered
**Then** the side column shows "Solved. Another one?" with a link to the Free Play entry
**And** no Postcard is shown and `album` is unchanged

**Covers:** FR1, FR7, FR23, NFR5, NFR15, AD-4, AD-6, AD-10, UX-DR14, UX-DR34, UX-DR39, UX-DR41, UX-DR47, UX-DR53, UX-DR64, UX-DR67

## Epic 2: Hints that teach

When stuck, the player can ask for a Hint that goes "Show a nudge" -> "Explain it" -> "Show me the move", read Technique definitions, have Mistakes pointed out, and see "Something doesn't fit yet" on a full but wrong grid.

### Story 2.1: Get a nudge and an explanation for the next move

As a player,
I want to ask for a nudge and then an explanation of the next logical move,
So that I learn why a digit goes somewhere instead of just being told.

**Acceptance Criteria:**

**Given** the Puzzle screen with an in-progress Puzzle
**When** the side column renders
**Then** the action row reads "Undo · Hint · Restart", with "Hint" as the surface's one primary button (`ink` fill, `card` text, 3px double `card` border, 2px solid `ink` outline) and the key caption "H" in `caption` style, coloured `card` on the primary fill so it keeps at least 4.5:1 (enabled and disabled, both themes)
**And** the side-column focus order is Hint panel (when open) → mode indicator → digit pad → Undo · Hint · Restart
*(Reconciled 2026-10-09: `ink-muted` on the `ink` fill failed 4.5:1, so the primary caption uses `card` (retro 1–3 D2). spec-retro-epics-1-3-actions.md; `src/ui/controls.css:82-84`.)*

**Given** a grid position with no Mistake
**When** `engine/hints` is asked for a Hint
**Then** it computes candidates from the session's current digits only (never from Notes), runs the AD-2 solver from that position until the first `Step` that has a placement, and returns the chain of `Step`s in order, elimination-only `Step`s first, ending with that placement
**And** a unit test shows that the same digits with different (even wrong) Notes produce an identical Hint, and that asking for a Hint never changes the player's Notes
**And** for each of the five Techniques a known position returns a chain that uses it: for naked single and hidden single the chain's last (only) `Step` names that Technique; for naked pair, pointing and claiming the chain's first `Step` names it and the chain ends in a placement (only singles place digits)
*(Reconciled 2026-10-09: "the last Step names each of 5 Techniques" can't be met, because elimination Techniques never place a digit. Retro 1–3 S8; `tests/engine/hints.test.ts:46,57`.)*

**Given** the Hint panel is closed, or open and idle
**When** the player clicks "Hint" in the action row, or presses H with focus in the grid or side column (handled by the single `ui/keyboard` handler from Story 1.5)
**Then** `hintRequested` is dispatched, the chain is stored in `ui.hint` with its session key and current step, and the Hint panel opens at step 1 at the top of the side column (below any notice banner, above the mode indicator), right of the grid, never over it, and the grid does not move
**And** the panel is `card` with a 1px `rule-thin` border, a 1px `fill-highlight` inner frame inset 6px, a hard 3px 4px `fill-highlight` shadow and padding 16px 18px 14px, holding a small-caps `airmail-red` step label, the text in `hint-text` `ink`, the next-step button and the caption "Esc to set aside"

**Given** the Hint panel is open and idle (no current Hint)
**When** it renders
**Then** its step label reads "Hint" and its one step button reads "Show a nudge"

**Given** a Hint at step 1
**When** the panel renders
**Then** the step label reads "Nudge", the text names the Technique and the unit (row, column or box) of the chain's first `Step`, rendered from that Technique's nudge template in `content/techniques` (draft, e.g. "Look for a hidden single in row 4."), and the step button reads "Explain it"
*(Reconciled 2026-10-09: step labels are nouns ("Nudge", "Explanation"); the buttons keep "Show a nudge" / "Explain it" / "Show me the move". No decision was recorded in 2.1. Retro 1–3 S6; `src/content/copy.ts` `hintLabelNudge`, `hintLabelExplain`.)*
**And** every cell of that unit gets the hint-focus mark (2px dashed `postmark` inset ring, drawn 3px inside the selected ring when the cell is also selected)
**And** each hint-focused cell's accessible name ends with "hint", and the live region announces the nudge text once

**Given** a Hint at step 1
**When** the player clicks "Explain it" or presses H
**Then** the step label reads "Explanation", the text gives one or two plain sentences covering the whole chain, built from one template per Technique in `content/techniques` (hidden single in a row: "In row {r}, a {d} fits only in column {c}. Every other empty cell in the row already has a {d} in its column or box."; "an 8" for 8), and the step button reads "Show me the move"
*(Reconciled 2026-10-09: label per S6; the hidden-single template gained "or box", since a box can also rule a cell out. Retro 1–3 S6, S8; `src/content/techniques.ts:70-74`.)*
**And** the hint-focus ring moves to the `focusCells` of every `Step` in the chain, and the live region announces the explanation once

**Given** the engine and `content/techniques`
**When** the tests run
**Then** every Technique in the registry has a nudge template and an explanation template, `Step`s still contain no display text, and a missing template fails `npm test`

**Given** an open Hint at step 1 or 2
**When** the session's digits change by any route (`digitEntered`, clear, Undo, Restart)
**Then** the reducer clears `ui.hint` in that same step and the panel returns to idle ("Hint" · "Show a nudge") with no hint-focus marks left on the grid
**And** if focus was inside the panel it moves to the grid; otherwise focus is unchanged

**Given** an open Hint
**When** only Notes, the selected cell or the input mode change
**Then** the Hint stays at its current step

**Given** a reducer unit test with a two-session fixture (session keys A and B) and an open Hint stored in `ui.hint` for key A
**When** the active session switches to key B
**Then** `ui.hint` is keyed by session, the Hint for key A is not shown for key B, and B's Hint panel starts closed (unit-tested)

**Given** the Hint panel is open
**When** the player presses Esc with focus in the grid or side column
**Then** the panel closes, `ui.hint` is cleared, the hint-focus marks disappear, and focus moves to the grid if it was inside the panel
**And** if the Restart confirm is also open, Esc closes the Restart confirm first

**Given** the Puzzle is solved
**When** the player presses H or reaches the action row
**Then** "Hint" is disabled (`aria-disabled`, still focusable for its label) and H does nothing

**Given** the solver finds no placement from the current digits (not expected for MVP Puzzles)
**When** a Hint is requested
**Then** the engine returns a "no Hint" result without throwing, the panel stays idle and nothing else changes
**And** the "no Hint" result is kept while the panel is idle, so asking again does nothing (and the step button is disabled) until the digits change
*(Reconciled 2026-10-09: the cached idle "no Hint" result is as built and was not in the epic. Retro 1–3 S9; `src/game/reducer-hint.ts:32`.)*

**Given** focus is on the header nav
**When** the player presses H
**Then** nothing happens

**Covers:** FR8, FR9, FR11, NFR1, AD-2, AD-3, AD-5, AD-9, AD-11, UX-DR9, UX-DR10, UX-DR13, UX-DR27, UX-DR28, UX-DR29, UX-DR57, UX-DR61, UX-DR62, UX-DR63, UX-DR64, UX-DR67, Conventions (`hintRequested`, one keyboard handler)

### Story 2.2: Show me the move

As a player,
I want the Hint to place the digit for me when I ask,
So that I can keep going when I don't see it, and still take it back.

**Acceptance Criteria:**

**Given** a Hint at step 2 ("Explanation")
**When** the player clicks "Show me the move", presses H, or clicks the action-row "Hint"
**Then** `hintApplied` places the chain's final placement digit in its cell through the same Undo path as `digitEntered`, increments the session's `hintsUsed` by 1, and clears `ui.hint`
**And** the panel returns to idle ("Hint" · "Show a nudge"), the hint-focus marks disappear, and focus moves to the grid if it was inside the panel
*(Reconciled 2026-10-09: label per S6; at step 2 every Hint control, including the action-row "Hint", applies the move. Retro 1–3 S6, S9; `src/ui/puzzle-screen.tsx:57-58`, `src/game/hint.ts` `hintAction`.)*

**Given** the target cell has Notes
**When** the move is placed
**Then** the cell shows the digit as a player digit (italic `player-ink`) and its Notes are hidden, exactly as with `digitEntered`

**Given** the move was just placed
**When** the polite live region updates
**Then** it announces the placement once, e.g. "7 placed, row 4, column 4"

**Given** the move was just placed
**When** the player clicks "Undo" or presses Ctrl/Cmd+Z
**Then** the cell returns exactly to its previous state (empty, with its Notes), and `hintsUsed` keeps its incremented value (Undo never lowers it)

**Given** the placed move fills the last empty cell and completes the solution
**When** `hintApplied` is reduced
**Then** in the same reducer step the session becomes `solved`, exactly as for `digitEntered`; using Hints never blocks solving

**Given** a Hint at step 1
**When** the player presses H twice
**Then** the first press shows step 2 and the second applies the move; one press never skips a step

**Given** `hintApplied` is dispatched while `ui.hint` is empty or belongs to another session (a stale click)
**When** it is reduced
**Then** nothing changes and `hintsUsed` is not incremented (unit-tested)

**Covers:** FR4, FR8, FR9, AD-5, AD-10, AD-11, UX-DR30, UX-DR58, UX-DR62, UX-DR64, Conventions (`hintApplied`)

### Story 2.3: What's a [Technique]?

As a player,
I want to read a short definition of the Technique a Hint uses,
So that I can spot it myself next time.

**Acceptance Criteria:**

**Given** `content/techniques`
**When** it is read
**Then** it holds a short plain-language definition for each of naked single, hidden single, naked pair, pointing and claiming, and a test fails if any registry Technique lacks one

**Given** a Technique Hint at step 1 or 2
**When** the panel renders
**Then** it shows the link "What's a {technique}?" (e.g. "What's a hidden single?"; "What's pointing?" and "What's claiming?" take no article) in `airmail-red` with a 3px underline offset, naming the Technique of the chain's first `Step`, the same Technique the nudge names
*(Reconciled 2026-10-09: a browser check found the nudge and a final-Step link naming different Techniques, so the link follows `chain[0]`. Retro 1–3 S7, S9; `src/game/hint.ts:35-41`, `src/content/techniques.ts` `link`.)*

**Given** the link is visible
**When** the player clicks it or activates it with Enter
**Then** the definition opens inside the Hint panel (no modal, never over the grid, the grid stays usable and does not move) and focus moves to the definition
**And** the Hint's step, text and hint-focus marks are unchanged

**Given** the definition is open
**When** the player presses Esc or activates its close control
**Then** the definition closes, focus returns to the "What's a {technique}?" link, and the Hint panel stays open at the same step

**Given** the definition is open
**When** the digits change (the player places a digit, Undo, Restart)
**Then** the definition closes together with the Hint as the panel returns to idle

**Covers:** FR10, NFR1, AD-3, UX-DR13, UX-DR27, UX-DR57, UX-DR64, UX-DR67

### Story 2.4: Hints that find Mistakes, and "Something doesn't fit yet"

As a player,
I want a Hint to tell me gently when one of my digits doesn't fit,
So that I never reason forward from a wrong digit or get stuck on a full grid that won't solve.

**Acceptance Criteria:**

**Given** the grid holds one or more Mistakes (player digits that differ from the solution)
**When** a Hint is requested
**Then** `engine/hints` returns a Mistake Hint for the first Mistake in row-major order instead of a Technique chain, computed from the session's digits and solution only (never Notes), whatever the Mistake Assist setting
**And** Givens are never reported (unit-tested with several Mistakes placed in different orders)

**Given** a Mistake Hint at step 1
**When** the panel renders
**Then** the step label reads "Nudge" (step 2's reads "Explanation"; reconciled 2026-10-09, retro 1–3 S6), the text reads "One of your digits doesn't fit — look at row {r}." (e.g. "One of your digits doesn't fit — look at row 4."), the Mistake cell gets the hint-focus ring, the step button reads "Explain it", and the live region announces the text once

**Given** a Mistake Hint at step 2
**When** the panel renders
**Then** the text explains in one or two calm sentences that the digit in that cell differs from this Puzzle's solution path (draft, e.g. "The {d} in row {r}, column {c} isn't part of this Puzzle's solution. Clearing it gets you back on track."), never "Wrong!" and never an exclamation mark, and the step button reads "Show me the move"

**Given** a Hint that reports a Mistake
**When** the panel renders
**Then** no "What's a {technique}?" link is shown

**Given** the Mistake Assist is Off
**When** a Mistake Hint is open (step 1 or 2)
**Then** that Mistake cell shows the Mistake mark (digit in `mistake` umber, 2px dotted underline offset 4px, 6px round corner dot top-right) and its accessible name gains "mistake" and "hint"
**And** no other Mistake is marked, and the mark disappears when the Hint closes or resets

**Given** a Mistake Hint at step 2
**When** the player clicks "Show me the move" or presses H
**Then** `hintApplied` clears that Mistake digit (its Notes, if any, show again) through the same Undo path as `digitEntered`, increments `hintsUsed`, clears `ui.hint`, returns the panel to idle, and the live region announces the clear once (e.g. "row 4, column 6 cleared")
**And** Undo puts the Mistake digit back

**Given** a Mistake Hint is open
**When** the player clears or corrects the Mistake themselves
**Then** the Hint resets to idle as for any digit change, and the next Hint reports the next Mistake or, if none is left, a Technique chain

**Given** every cell is filled and `digits` ≠ `solution`
**When** the side column renders
**Then** the calm inline line "Something doesn't fit yet — want a hint?" appears in the side column with a "Hint" button (default style; the action-row "Hint" stays the one primary), nothing overlays or moves the grid
**And** nothing else changes: Mistake highlighting is not forced on, input stays live, the status stays `inProgress`, and there is no game over
**And** the digit that fills the grid is announced once with the cue ("7. Something doesn't fit yet — want a hint?")

**Given** the "Something doesn't fit yet" line
**When** the player clicks its "Hint" button
**Then** the Hint panel opens at step 1 of a Mistake Hint pointing at the first Mistake in row-major order
**And** further clicks on that button advance the Hint like H: step 2, then the move (clearing the Mistake)
*(Reconciled 2026-10-09: the spoken cue and the button running the whole sequence are as built and were not in the epic. Retro 1–3 S9; `src/ui/puzzle-screen.tsx:138`, `src/game/announce.ts:93`.)*

**Given** the "Something doesn't fit yet" line is showing
**When** any cell becomes empty again, or the grid is solved
**Then** the line disappears

**Covers:** FR6, FR9, FR10, FR11, NFR13, AD-9, AD-11, UX-DR9, UX-DR10, UX-DR31, UX-DR37, UX-DR44, UX-DR61, UX-DR62, UX-DR65, UX-DR67

## Epic 3: Travel and collect Postcards

The player can choose Cities from the Album, solve their pre-built Puzzles, receive Postcards in a warm reveal, unlock Mid and Far Cities, replay collected Cities, and resume the last-played Puzzle. Runs on placeholder City content until the creator supplies the 30 Cities and Postcard lines.

### Story 3.1: City catalogue and pre-built City Puzzles

As a creator,
I want a catalogue of 30 Cities and one released, verified Puzzle per City,
So that every City plays the same fair Puzzle forever, offline, at the Difficulty its Tier promises.

**Acceptance Criteria:**

**Given** `src/content/cities.json`
**When** it is read
**Then** it lists exactly 30 Cities: 10 per Region (`europe`, `asia`, `americas`), each Region split 4 `near` / 3 `mid` / 3 `far`
**And** every City has a stable, unique kebab-case `id`, `name`, `country`, `region`, `tier`, a Stamp `glyph` and its Postcard `line`
**And** a test enforces these counts, the allowed code values and id uniqueness

**Given** the catalogue before the creator's content arrives
**When** it is inspected
**Then** Lisbon (`id: lisbon`, Portugal, `europe`, `mid`, line "The trams climb hills that would tire a goat. Wish you were here.") is real content and every other City is flagged `placeholder: true` with a line starting "PLACEHOLDER"
**And** placeholder ids are neutral slot ids (e.g. `europe-near-1`), so the creator can later change a City's name, country and line without changing its id

**Given** any City in `content/cities.json` has `placeholder: true`
**When** the CI pipeline runs on `main`
**Then** tests may pass but the deploy-to-GitHub-Pages job fails with a clear message listing the placeholder City ids (`npm run check:placeholders`), so the live site never ships placeholder content
**And** local `npm run dev` and `npm run build` still work with placeholder content
**And** the deploy job, and so this gate, runs only once the repository variable `PAGES_ENABLED` is `true` (Story 1.1); until then it has never fired
*(Reconciled 2026-10-09: deploy is opt-in behind `vars.PAGES_ENABLED`. Retro 1–3 S1; `.github/workflows/ci-deploy.yml:42-61`.)*

**Given** `src/game/journey`
**When** it is read
**Then** it holds the only Tier → Difficulty map (`near` → `easy`, `mid` → `medium`, `far` → `hard`); no other module defines it

**Given** `scripts/build-cities` is run
**When** some catalogue City ids have no entry in `src/content/city-puzzles.json`
**Then** it generates entries only for those ids, using the `engine` generator with a seed derived from the City id (same id → same Puzzle), at the Difficulty the journey map gives the City's Tier, and appends `{ cityId, givens, solution, difficulty }` with 81-character digit strings
**And** existing entries are never regenerated or rewritten
**And** the AD-1 architecture test allows `scripts` to import `game/journey` for the Tier → Difficulty map (amended rule; nothing else in `game/`)

**Given** `scripts/build-cities` is run with every City already present
**When** it finishes
**Then** the file is byte-for-byte unchanged

**Given** `city-puzzles.json`
**When** `npm test` runs (locally and in `ci-deploy`)
**Then** for every entry: `brute` counts exactly one solution, that solution equals `solution`, the Givens agree with the solution, the grader's result equals `difficulty`, and `difficulty` equals the journey map's value for the City's Tier
**And** every catalogue City has exactly one entry and every entry's `cityId` exists in the catalogue
**And** any failure fails the build and names the City id

**Given** the committed snapshot of released City Puzzles
**When** any released entry's `givens`, `solution` or `difficulty` changes, or an entry is removed
**Then** the snapshot test fails and nothing is deployed; newly added entries extend the snapshot

**Given** the released content
**When** a City Puzzle is opened in the app
**Then** it is read from `city-puzzles.json` with no generation at runtime, so it is interactive in under 1 second

**Covers:** FR1, FR13, NFR5, NFR10, NFR15, AD-1, AD-2, AD-4, Conventions (City id, Tier, Region, digit strings)

### Story 3.2: Choose a destination from the Album

As a player,
I want to browse my Album by Region and pick a Reachable City to travel to,
So that each Puzzle feels like the next stop on a journey I choose.

**Acceptance Criteria:**

**Given** the header nav
**When** it renders
**Then** it reads "Puzzle · Album · Free Play · Settings", each link at least 24×24px, the current surface in `airmail-red` with a 1px underline
**And** choosing "Album" opens the Album with focus on its heading, and the Album header shows the wordmark and nav only (no destination title, no Stamp)

**Given** the Album
**When** it renders
**Then** Region tabs "Europe · Asia · The Americas" show in small-caps `label`, each with its count in `meta` `ink-muted` ("Europe 4 / 10"), the active tab underlined with a 3px double `ink` rule, each tab at least 24×24px
**And** the Album opens on the Region of the most recent Postcard, else Europe
**And** one Region shows per page: a heading in `city-title`, then 10 slots in a 5-column grid with a 12px gap, ordered Near → Mid → Far (catalogue order within a Tier)

**Given** the `album` slice
**When** it is read
**Then** each Album entry is a Postcard with the AD-6 shape `{ cityId, collectedOn, revealed }` (`collectedOn` a `YYYY-MM-DD` date passed in by the shell, `revealed` a boolean), at most one per `cityId`, in the order collected
**And** this story only reads that shape (tests use `album` fixtures); awarding Postcards arrives in Story 3.3

**Given** the Album and catalogue
**When** reachability is computed
**Then** it comes from `album` + catalogue only, never stored (AD-6): every Near City is reachable from the start; a Region's Mid Cities become reachable once that Region holds 3 Near Postcards; its Far Cities once it holds 3 Mid Postcards
**And** unit tests cover 0, 2 and 3 Near Postcards, 3 Near + 2 Mid, 3 Near + 3 Mid, and Postcards in one Region never unlocking another

**Given** a reachable City with no session
**When** its slot renders
**Then** it is a blank `card` with a hairline border, the City name (`body` `ink`), "{country} · {Tier}" (`caption` `ink-muted`) and the call to action "Travel here" in small-caps `airmail-red`

**Given** a reachable City whose session `city:<id>` is `inProgress`
**When** its slot renders
**Then** it shows "Carry on" instead of "Travel here"

**Given** a locked City
**When** its slot renders
**Then** it has no fill, a 1px dashed `rule-thin` border and only the `ink-muted` caption "Opens after 3 Near Postcards" (Mid) or "Opens after 3 Mid Postcards" (Far), with no City name
**And** it is focusable for its label but not clickable, and its text keeps at least 4.5:1 contrast in both themes (fading by fill and border only)

**Given** a City not yet collected (no Postcard for its `cityId` in `album`)
**When** its Reachable, Reachable-in-progress or Locked slot renders, or its City Puzzle screen renders
**Then** the City's Postcard line is never shown (not in visible text, accessible names or the live region) before that City is collected (unit-tested)

**Given** the Album is completely empty
**When** it renders
**Then** it opens on Europe with 4 Near slots "Travel here", the Mid and Far slots locked, and the heading "Where to first?"; once any Postcard exists the heading reads "Where to next?"

**Given** a slot showing "Travel here"
**When** the player clicks it or activates it with Enter
**Then** `cityChosen` creates `sessions['city:<id>']` from content (`givens`, `solution`, `difficulty` from `city-puzzles.json`; digits = Givens; Notes all 0; `inProgress`; `hintsUsed: 0`), the Puzzle screen opens with focus on the grid, and the undo history starts empty

**Given** a slot showing "Carry on"
**When** the player chooses it
**Then** the Puzzle screen opens on that session exactly as left (digits and Notes); other Cities' half-finished sessions are untouched
**And** leaving a Puzzle by any nav link never asks for confirmation

**Given** a City Puzzle on the Puzzle screen
**When** the header renders
**Then** it shows the destination title in `city-title` ("Lisbon · Mid · Medium"), the meta line in `body` `ink-muted` ("Portugal — Europe, Postcard 5 of 10", where 5 is the City's slot position in its Region), and the 74×88px Stamp: `airmail-red` face, `card` 9px caps text with country top, the City's glyph centre and Tier bottom, perforated edge (5px dotted `desk` border + 2px `card` outline), rotated +3°, `aria-hidden`
**And** a decorative Postmark sits outside the top-right corner of the grid frame, never over cells: double circle (2px outer + 1px inner) in `postmark` at 75% opacity with the City name in caps and a date as DD MMM YY ("06 OCT 26"), `aria-hidden`: today's date (from the shell) while the City is in progress, and the Postcard's `collectedOn` during the reveal and on a solved City
**And** a Free Play Puzzle shows neither Stamp nor Postmark
*(Reconciled 2026-10-09: the Postmark shows the solve date once the City is solved. Retro 1–3 S10; `src/ui/puzzle-screen.tsx:85`.)*

**Given** a `cityChosen` action for a locked City or an unknown id (a stale or forged action)
**When** it is reduced
**Then** nothing changes (unit-tested)

**Given** Lamplight is On
**When** the Album, slots, Stamp and Postmark render
**Then** every colour uses its `-lamplight` twin and the contrast test covers the new pairs

**Covers:** FR12, FR13, FR14, FR15, NFR8, NFR9, AD-6, AD-10, UX-DR7, UX-DR14, UX-DR15, UX-DR16, UX-DR19, UX-DR20, UX-DR22, UX-DR24, UX-DR25, UX-DR40, UX-DR42, UX-DR43, UX-DR64, UX-DR65, UX-DR67, Conventions (`cityChosen`)

### Story 3.3: Receive a Postcard

As a player,
I want a Postcard from the City to arrive when I solve its Puzzle for the first time,
So that finishing feels like getting a warm note from somewhere I've been.

**Acceptance Criteria:**

**Given** a City Puzzle `city:<id>` whose City is not yet in the Album
**When** the digit that completes the solution is reduced (`digitEntered` or `hintApplied`, each carrying the shell's date as `YYYY-MM-DD`)
**Then** in the same reducer step the session becomes `solved` and `journey.award(state, key)` adds a Postcard (the `album` entry shape defined in Story 3.2) `{ cityId, collectedOn, revealed: false }` to `album`
**And** the core never reads the clock; a unit test passes the date in with the action

**Given** `journey.award`
**When** it is called for a `free` key, or for a City already in the Album
**Then** it adds nothing (unit-tested), so Free Play never awards and nothing ever duplicates

**Given** a Postcard with `revealed: false` for the City on screen
**When** the Puzzle screen renders
**Then** the grid stays visible with the finished digits, input stops, and the Postcard slides onto the finished grid (or appears in place, without sliding, under `prefers-reduced-motion`), with no sound, no flashing and no confetti
**And** the grid and side column keep their look but are `inert`, and focus moves to "Add to Album"

**Given** the Postcard
**When** it renders
**Then** it is `card` with the 8px airmail-stripe border (repeating −45° `airmail-red` 12px / `desk` 8px / `rule-box` 12px / `desk` 8px), rotated −1°, square corners, with the shadow `0 10px 26px rgba(31,42,68,.30)`
**And** its left half holds the City's line in `postcard-line` `ink`; its right half holds the Postmark (City name caps, `collectedOn` as DD MMM YY) overlapping the 52×62px Stamp, and three ruled address lines "To: the Traveller" · "Album · {Region}" · "{City}, {country}"
**And** the line sits in a region labelled "Postcard from {City}" that is tied to "Add to Album" by `aria-describedby`, and the live region announces "Solved"
**And** the Postcard is a labelled `role="dialog"`, `aria-modal` during the reveal
*(Reconciled 2026-10-09: the dialog role is as built and was not in the epic. Retro 1–3 S10; `src/ui/postcard.tsx:31-50`.)*

**Given** the Postcard is showing
**When** the player clicks "Add to Album" or presses Esc
**Then** `postcardAdded` sets that Postcard's `revealed` to `true`, and the Album opens on that City's Region with the heading "Where to next?", the Region count one higher, and focus on the Album heading
**And** clicking outside the Postcard does nothing; there is no other way to dismiss it
**And** when the player later returns to the solved City via "Puzzle", the solved grid shows with the side-column line "Solved. Where to next?" followed by a link-styled "Album" button
*(Reconciled 2026-10-09: the interim "Solved. Where to next?" line was meant to be replaced but stays as the solved-City line. Retro 1–3 S12; `src/content/copy.ts` `solvedCity`, `src/ui/puzzle-screen.tsx:145`.)*

**Given** the Album after "Add to Album"
**When** the new City's slot renders
**Then** it is a Collected slot (`card`, 1px `rule-thin` border, 4px airmail-stripe top edge, City in `body` `ink`, "{country} · {Tier}" in `caption` `ink-muted`, the line in `meta` italic `ink`) with a 2px `airmail-red` outline and the caption "just arrived" in `airmail-red`
**And** the "just arrived" mark has a short gentle entrance, is static under reduced motion, and is gone the next time the Album opens

**Given** any Postcard in `album` with `revealed: false` (e.g. state loaded mid-reveal)
**When** the app starts or the Album opens
**Then** the Puzzle screen for that City opens with its solved grid and the Postcard shown again, before anything else; with several, they are shown one at a time in the order collected (testable now from a state fixture; surviving a real reload arrives with Epic 4)

**Given** the third Near Postcard in a Region is added
**When** the Album opens
**Then** that Region's Mid slots show "Travel here" with no extra message (unlock computed live)

**Given** a full City journey
**When** the player opens the Album, travels to a City, plays with Notes and a Hint, solves, and adds the Postcard
**Then** the UJ-1 flow works end to end: Album → "Lisbon · Mid · Medium" with Stamp → Hint nudge and explanation → Postcard slides onto the grid → "Add to Album" → Album on Europe with Lisbon "just arrived" and "Where to next?"

**Covers:** FR7, FR14, FR15, NFR2, NFR3, NFR15, AD-6, UX-DR6, UX-DR17, UX-DR18, UX-DR23, UX-DR24, UX-DR25, UX-DR45, UX-DR59, UX-DR60, UX-DR62, UX-DR64, UX-DR66, UX-DR67, UX-DR68

### Story 3.4: Revisit Postcards and replay Cities

As a player,
I want to look at my collected Postcards again and replay a City I enjoyed,
So that my Album feels like a keepsake and favourite Puzzles stay playable.

**Acceptance Criteria:**

**Given** a Collected slot
**When** the player clicks it or activates it with Enter
**Then** the Postcard viewer opens over the Album page, non-blocking, reusing the Postcard component (Postmark dated with the Postcard's `collectedOn`) with "Play again" (primary) in place of "Add to Album", and focus moves to "Play again"

**Given** the Postcard viewer is open
**When** the player presses Esc, clicks once outside it, or chooses its visible "Close" control
**Then** it closes and focus returns to the slot that opened it
*(Reconciled 2026-10-09: a visible "Close" control was added. Retro 1–3 S10; `src/ui/postcard.tsx`, `src/content/copy.ts` `viewerClose`.)*

**Given** the Postcard viewer
**When** the player chooses "Play again"
**Then** `sessions['city:<id>']` is replaced by a fresh session built from content (digits = Givens, Notes all 0, `inProgress`, `hintsUsed: 0`), the undo history is empty, and the Puzzle screen opens with focus on the grid
**And** the collected Postcard (its `collectedOn` and `revealed`) is unchanged and the Region count is unchanged

**Given** a collected City whose replay session is `inProgress`
**When** its slot renders
**Then** it shows the Collected layout plus "Carry on" in small-caps `airmail-red`; "Carry on" resumes the replay exactly as left, and clicking the Postcard face still opens the viewer

**Given** a replay is in progress and has been touched (any digit or Note beyond the Givens)
**When** the player chooses "Play again" in the viewer
**Then** an inline confirm appears in the viewer ("This replaces your replay in progress." · "Start fresh" / "Keep going"), matching the Free Play replace confirm, and focus moves to "Keep going"
**And** "Start fresh" replaces the replay with a fresh grid (AD-10), while "Keep going" resumes the replay exactly as left
**And** for an untouched replay (only the Givens, no Notes) "Play again" starts a fresh grid without asking, since there is nothing to lose
*(Reconciled 2026-10-09: the confirm is skipped when the replay is untouched. Retro 1–3 S10; `src/game/reducer-journey.ts:129-137`.)*

**Given** a replay session
**When** the player completes the solution
**Then** the session becomes `solved`, no Postcard is shown, `album` is unchanged (no duplicate, no new `collectedOn`), and the side column shows "Solved again. {City} is already in your Album." (e.g. "Solved again. Lisbon is already in your Album."), where the word "Album" in the sentence is the link-styled button to the Album
**And** the slot returns to plain Collected
*(Reconciled 2026-10-09: the link is the word "Album" inside the sentence, not a separate link. Retro 1–3 S10; `src/content/copy.ts` `solvedAgainBefore`/`solvedAgainAfter`.)*

**Covers:** FR7, FR16, AD-6, AD-10, UX-DR17, UX-DR21, UX-DR23, UX-DR26, UX-DR46, UX-DR57, UX-DR64, UX-DR67

### Story 3.5: Pick up where you left off

As a player,
I want the game to open straight onto the Puzzle I was last playing,
So that coming back takes no clicks.

**Acceptance Criteria:**

**Given** any action that changes a session's digits or Notes (`digitEntered`, `cellClicked`, `currentDigitPlaced` and `cellCleared`, in Digit or Notes mode; `hintApplied`, `undoRequested`, `restartConfirmed`)
**When** it is reduced
**Then** `meta.lastPlayedKey` is set to that session's key
**And** a Free Play reply that makes the new Free Play Puzzle current (`freePlayGenerated`, Story 1.8) also sets it to `free`
**And** actions that only open a session (`cityChosen`, "Carry on"), select cells or switch modes do not change it (unit-tested)
*(Reconciled 2026-10-09: there is no `noteToggled` action; Notes go through the digit actions in Notes mode. Retro 1–3 S11; spec-3-5 Design Notes; `src/game/reducer-shared.ts` `putSession`, `src/game/reducer-free-play.ts`.)*

**Given** the app starts with state where `sessions[meta.lastPlayedKey]` exists and is `inProgress`
**When** the launch rule runs
**Then** the Puzzle screen opens on that session, digits and Notes exactly as stored, with focus on the grid

**Given** the `lastPlayedKey` session is solved, missing or its City id is not in the catalogue, but another session is `inProgress`
**When** the launch rule runs
**Then** the Puzzle screen opens on the first `inProgress` City session in catalogue order, or else the Free Play session, with focus on the grid

**Given** the app starts with no session `inProgress` (no sample Puzzle is seeded at startup; Story 1.8)
**When** the launch rule runs
**Then** the Album opens (on the most recent Postcard's Region, else Europe) with focus on its heading, and any in-progress Puzzle shows "Carry on" on its slot or on the Free Play entry

**Given** the header nav
**When** a current Puzzle exists (the session last open on the Puzzle screen, or at launch the `lastPlayedKey` session, even if it is solved)
**Then** "Puzzle" returns to it with focus on the grid
*(Reconciled 2026-10-09: a solved last-played Session counts as current. Retro 1–3 S11; `src/game/launch.ts:41`.)*
**And** when none exists, "Puzzle" is disabled (`aria-disabled`, still focusable for its label) and does nothing

**Given** any Puzzle is `inProgress`
**When** the Album renders
**Then** the reassurance line "No rush - your Puzzle will wait." shows beneath the heading in `meta` italic `ink-muted`

**Given** a launch with an unrevealed Postcard
**When** the launch rule runs
**Then** the Postcard reveal from Story 3.3 takes precedence over the launch rule

**Given** this story's behaviour
**When** it is tested
**Then** the launch rule is unit-tested as a pure function of `AppState`; surviving a real browser reload is completed by Epic 4 (Story 4.1)

**Covers:** FR17 (state part), AD-10, UX-DR14, UX-DR39, UX-DR43, UX-DR64, UX-DR67

## Epic 4: Never lose your journey

The player's Album and Puzzles survive reloads, going offline, new versions and a second tab, with the storage notice, persistent-storage request (and Safari "Add to Dock" tip), save-failed and update-ready notices.

### Story 4.1: Autosave and restore

As a player,
I want every change saved automatically and restored when I come back,
So that I can close the tab at any moment and lose nothing.

**Acceptance Criteria:**

**Given** the codebase
**When** the architecture test runs
**Then** only files in `src/persistence/` import `idb-keyval` or reference `indexedDB`, `localStorage` or `navigator.storage`; any other file doing so fails `npm test`
**And** `idb-keyval` 6.3 is added to `package.json`

**Given** `persistence/document`
**When** `toDocument(state)` runs
**Then** it returns one document `{ schemaVersion: 2, album, sessions, settings, meta }` (version 1 in this story; Story 4.4's v1 → v2 migration made it 2) with `givens`, `solution` and `digits` as 81-character digit strings and `notes` as 81 numbers; `ui` (including `hint`, `undo`, `saveFailed`, `readOnly`, `updateReady`) is never included
**And** `fromDocument(toDocument(state))` restores `album`, `sessions`, `settings` and `meta` exactly (round-trip unit test)
*(Reconciled 2026-10-09: the current schema version is 2. Epic 4 retro R1; `src/persistence/document.ts:5`.)*

**Given** an action that changes `album`, `sessions`, `settings` or `meta`
**When** it is reduced
**Then** the shell writes the whole document to IndexedDB via `idb-keyval` under one key
**And** writes run one at a time in order, so the stored document always reflects the latest state

**Given** an action that changes only `ui` (cell selection, mode switch, Hint steps, opening the Postcard viewer, Restart confirm open)
**When** it is reduced
**Then** no write happens (unit-tested with a storage spy)

**Given** saved data exists
**When** the app starts (reload or browser restart)
**Then** the document is loaded before the first screen renders, `album`, `sessions`, `settings` and `meta` are restored, the undo history starts empty, and the launch rule (Story 3.5) opens the Puzzle on `meta.lastPlayedKey` if it is `inProgress`, else on the first `inProgress` City in catalogue order, else on the Free Play Puzzle if `inProgress`, else the Album
**And** any Postcard with `revealed: false` is shown again first (Story 3.3)
*(Reconciled 2026-10-09: the full Story 3.5 / AD-10 launch rule applies. Epic 4 retro R2; `src/game/launch.ts`.)*

**Given** several half-finished City Puzzles and a Free Play Puzzle
**When** the page is reloaded
**Then** each one reopens with its digits and Notes exactly as left, and the Album slots show "Carry on"

**Given** the Settings surface
**When** the player changes an Assist, Lamplight or a Free Play Difficulty and reloads
**Then** the choices are kept (replacing the reset-on-reload behaviour of Story 1.6), and Lamplight applies before first paint with no Daylight flash

**Given** no saved data (first visit)
**When** the app starts
**Then** it starts from the defaults (empty Album, empty `sessions` with no sample Puzzle, default Settings) and writes nothing until a saved slice changes

**Covers:** FR5, FR17, NFR11, AD-5, AD-7, UX-DR36, UX-DR43, UX-DR45, Conventions (persistence boundary)

### Story 4.2: Safe across versions and tabs

As a player,
I want my saved journey protected from newer versions, unreadable data, a second tab and failed saves,
So that nothing the game does can quietly wipe or corrupt my Album.

**Acceptance Criteria:**

**Given** the notice banner component
**When** a banner shows
**Then** it is inline and non-modal: `card`, 1px `rule-thin` border, a 4px left edge in `postmark` (info) or `airmail-red` (save failed), `body` `ink` text and exactly one text button (no icons, no bare "×"), at least 24×24px
**And** on the Puzzle screen it sits at the top of the side column at side-column width so the grid never moves; on the Album and other screens it spans the content width directly under the header and pushes content down; it never overlays the grid
**And** at most one banner is visible at a time, choosing the highest priority among those pending (read-only > save failed > unreadable in this story; Story 4.4 and TS-43 complete the order)
**And** dismissing a banner moves focus to the grid on the Puzzle screen, or the page heading elsewhere; in a read-only tab on the Puzzle screen the grid is inert, so focus moves to the current nav item instead
*(Reconciled 2026-10-09: the unreadable notice ranks third (spec-4-2 Design Notes); the read-only focus fallback was only in a comment and a test. Epic 4 retro R4, R7; `src/game/banners.ts:8`, `src/ui/app.tsx:221-223`.)*

**Given** `persistence/migrations.ts`
**When** a stored document has an older `schemaVersion`
**Then** migrations run forward in order, one version at a time, before `fromDocument`, and the lock holder writes the migrated document back once
**And** a test with a v1 document and the shipped v1 → v2 migration (Story 4.4) loads it as v2 with every Postcard and session carried forward; a document claiming version 0 is unreadable, because no v0 document ever shipped
*(Reconciled 2026-10-09: the fake v0 → v1 test was replaced by the real v1 → v2 migration test. Epic 4 retro R5; `src/persistence/migrations.ts:6-9`.)*

**Given** a stored `schemaVersion` newer than the code's
**When** the app loads
**Then** `ui.readOnly` is set, the tab never writes to storage for the rest of the page's life, and the banner "A newer version saved your progress. Reload to carry on." · "Got it" shows
**And** the saved state shows, read-only, when the newer document still reads as this version's document (best effort, in memory only); otherwise the defaults show
**And** the stored document is left byte-for-byte unchanged (unit-tested)
*(Reconciled 2026-10-09: the best-effort read-only restore was a Story 4.2 amendment (UJ-2). Epic 4 retro R6; `src/persistence/store.ts:60-63`.)*

**Given** stored data that can't be read (invalid structure, failed validation, or a migration that throws)
**When** the app loads in the tab holding the save lock
**Then** the raw stored value is first copied to a new backup key (`traveller-save-backup-<ISO time>`) that is never overwritten, then the main key gets the default document and the app starts from an empty Album with the banner "We couldn't read your saved progress. It's been kept safe, not overwritten." · "Got it" on the Album
**And** if the backup copy fails, nothing is written and the tab plays on with saving off (see below)
**And** if start-up has already given up (the 3 s timeout) when the backup finishes, the main key is not written: the unreadable data stays where it is and the next launch shows the unreadable notice again
**And** a tab without the lock writes nothing: it starts from an empty Album, read-only (another tab), with no unreadable notice (deferred, Epic 4 retro R8)
*(Reconciled 2026-10-09: the data is kept only under the backup key, so the main key is overwritten with defaults after a successful backup (spec-4-2 residual risk); a failed backup turns saving off instead of read-only (TS-43, spec-ts-43-play-without-saving.md); no main-key write after a start-up give-up (TS-42, spec-ts-42-44-boot-timeout-and-test-gaps.md). The banner's "not overwritten" refers to the backup copy. Epic 4 retro R3, R8; `src/persistence/store.ts:127-143`.)*

**Given** storage can't be reached at start-up (the load rejects, the lock, load and settle together take longer than 3 s, or unreadable data can't be backed up)
**When** the app starts
**Then** the tab starts from the defaults and plays normally in memory with saving off: Cities, Free Play, Hints, Postcards and Settings all work, but nothing is ever written, `persist()` and `persisted()` are never called, and the save lock is released so another tab can save
**And** the info banner "We can't save your progress in this browser right now. Anything saved before is left untouched. You can keep playing, but this session won't be kept - reload to try again." · "Got it" shows (not announced), and "Got it" hides it for the page while saving stays off
**And** the storage notice and the Add to Dock tip never show while saving is off, because both promise saving
**And** a tab that learned another tab holds the lock before giving up is read-only (another tab) instead, and shows no saving-off banner
*(Reconciled 2026-10-09: Jessica chose play-without-saving over read-only `storageUnavailable` (Epic 4 retro E2). TS-43, spec-ts-43-play-without-saving.md; `src/ui/boot.tsx`, `src/game/banners.ts`.)*

**Given** the game opens in a tab
**When** it starts
**Then** it requests the Web Lock `traveller-save` without waiting; only the tab holding it ever writes

**Given** another tab already holds `traveller-save`
**When** this tab starts
**Then** it loads and shows the saved state, sets `ui.readOnly`, never writes, and shows "Traveller Sudoku is open in another tab. Play there, or close it and reload this one." · "Got it"

**Given** a read-only tab (either cause)
**When** the player uses it
**Then** the grid, pad and Settings stay visible but `inert`, Hint is unavailable, and dismissing the banner ("Got it") hides it while the tab stays read-only

**Given** a write fails (e.g. quota or IndexedDB error)
**When** the failure is reported
**Then** `ui.saveFailed` is set, play continues, the banner with the `airmail-red` edge shows "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here." · "Got it", and the live region announces it once (never once per failed retry); no browser alert appears
**And** the next change that touches a saved slice retries the write

**Given** the save-failed banner is showing or was dismissed
**When** a later write succeeds
**Then** `ui.saveFailed` clears and the banner disappears; a later failure shows and announces it again

**Given** the UJ-2 failure branches
**When** a second tab or newer-version data is present
**Then** the matching read-only banner shows and the half-finished Puzzle is visible but not editable

**Covers:** FR17, FR24, NFR11, NFR12, AD-7, AD-12, UX-DR32, UX-DR48, UX-DR49, UX-DR50, UX-DR62, UX-DR63, UX-DR64, UX-DR65, UX-DR67, UX-DR69

### Story 4.3: Play offline and update gently

As a player,
I want the game to work without a connection and to update without interrupting me,
So that I can play on a train and never lose a Puzzle to a new version.

**Acceptance Criteria:**

**Given** the build configuration
**When** it is inspected
**Then** `vite-plugin-pwa` 2.0 (fallback 1.3) is configured with `strategies: 'generateSW'` and `registerType: 'prompt'`, and the service worker is registered from bundled code (no inline script), so the `default-src 'self'` CSP still has zero violations

**Given** the built service worker
**When** its precache manifest is inspected
**Then** it includes the app shell (`index.html`, JS, CSS), the Free Play generator worker, `cities.json`, `city-puzzles.json`, the Technique texts and the icons (a build test asserts the content files and worker are listed)
**And** it has no runtime caching of cross-origin URLs and no code that reads or writes IndexedDB

**Given** the web manifest
**When** it is inspected
**Then** it names "Traveller Sudoku", uses self-hosted icons from `public/`, and its `start_url` and `scope` equal the Vite `base` (`/<repo>/`), matching the service-worker scope on GitHub Pages

**Given** a player has visited the site once online
**When** they reopen it with no network
**Then** the whole game loads, saved data restores, the half-finished Puzzle opens exactly as left, all 30 City Puzzles open, and Free Play generates new Puzzles in the worker (verified with the browser offline in a manual check listed in the story's test notes)

**Given** a new version is deployed while a game tab is open
**When** the new service worker is waiting
**Then** `ui.updateReady` is set and the informational banner "A new version is ready. It arrives next time you open the game." · "Got it" shows at its priority, which is lowest: read-only > saving off > save failed > unreadable > storage notice > persistence (Add to Dock) > update ready
**And** the app never calls `updateSW()` and never reloads during a session
*(Reconciled 2026-10-09: the order as built has seven kinds, with unreadable (Story 4.2) and saving off (TS-43) added. Epic 4 retro R4; `src/game/banners.ts:8` `BANNER_PRIORITY`.)*

**Given** all game tabs are closed
**When** the player opens the game again
**Then** the new version is active and progress saved by the earlier version is loaded (migrated forward if needed)

**Given** the first visit fails partway (the network drops before precaching completes)
**When** the player later opens the game offline
**Then** the browser shows its normal offline page; the next online visit completes precaching, and no saved data is touched

**Covers:** FR18, NFR7, NFR10, NFR11, AD-8, AD-12, UX-DR32, UX-DR51, UX-DR67, UX-DR69

### Story 4.4: Storage notice and keeping your data

As a player,
I want to be told once where my Album lives and have the game ask the browser to keep it,
So that I don't lose my Postcards to cleared or evicted browser data.

**Acceptance Criteria:**

**Given** first launch (`meta.seenStorageNotice` is false)
**When** the Album opens on Europe with "Where to first?"
**Then** the info banner "Your Album lives in this browser only. Clearing browser data erases it." · "Got it" sits directly under the header above the slots (as in the key-first-launch mockup), and play is not blocked: the "Travel here" slots work while it shows
**And** if the player opens a Puzzle before dismissing it, the notice moves to the top of the side column and the grid never moves
**And** while saving is off (Story 4.2, TS-43) the notice never shows, because it promises saving
*(Reconciled 2026-10-09: TS-43, spec-ts-43-play-without-saving.md; `src/game/banners.ts` `pending`.)*

**Given** the storage notice
**When** the player chooses "Got it"
**Then** `meta.seenStorageNotice` becomes true (saved), the notice never shows again, focus moves to the grid on the Puzzle screen or the page heading elsewhere, and `navigator.storage.persist()` is requested
**And** the result is stored in `meta.persistGranted`

**Given** `persist()` is refused on Safari (desktop macOS Safari 17 or later, not already running as a web app)
**When** the result arrives
**Then** the banner "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it." · "Got it" shows (never while saving is off)
**And** on other browsers a refusal shows nothing, and when `navigator.storage.persist` is unavailable it is treated as refused without error
*(Reconciled 2026-10-09: Safari detection was narrowed to desktop macOS Safari 17+ in Story 4.4 review; the tip is hidden while saving is off (TS-43). Epic 4 retro R11; `src/ui/browser.ts:28-33`, spec-ts-43-play-without-saving.md.)*

**Given** the first Postcard is added to the Album and `meta.persistGranted` is not true, in a tab that can write (not read-only, saving on)
**When** "Add to Album" completes
**Then** `persist()` is requested again and `meta.persistGranted` is updated; if still refused on Safari, the Add to Dock banner shows on the Album
**And** a read-only or saving-off tab never calls `persist()` or `persisted()`
*(Reconciled 2026-10-09: TS-44 (E5) and TS-43 tests pin the writable-only guard; `src/ui/app.tsx:126-180`.)*

**Given** the app starts in a tab that can write (not read-only, saving on)
**When** `navigator.storage.persisted()` reports true (e.g. after Add to Dock)
**Then** `meta.persistGranted` is set to true and no Safari banner is shown again

**Given** several banners are pending at once
**When** the screen renders
**Then** exactly one shows, in the priority order read-only > saving off > save failed > unreadable > storage notice > persistence (Add to Dock) > update ready, and the next one appears when the visible one is resolved or dismissed
**And** a unit test covers the priority selection for every pair
*(Reconciled 2026-10-09: seven kinds as built; unreadable ranks above the storage notice because it explains an empty Album, and saving off (TS-43) ranks right after read-only. Epic 4 retro R4; `src/game/banners.ts:8`.)*

**Given** any banner (read-only, saving off, save failed, unreadable save, storage notice, Add to Dock, update ready)
**When** the player activates its one text button
**Then** it is dismissed, focus moves to the grid on the Puzzle screen or the page heading elsewhere (the current nav item when a read-only grid is inert), and the focus order is header nav → banner → page content (Album) or grid → side column with the banner first (Puzzle screen)
*(Reconciled 2026-10-09: Epic 4 retro R7; TS-43; `src/ui/app.tsx:221-223`.)*

**Given** the first-launch flow
**When** a new player opens the game, chooses "Got it", and picks a Near City
**Then** it runs as in UX-DR70: Album on Europe "Where to first?" → notice → persistent storage requested → Add to Dock banner only on a Safari refusal → the first Puzzle opens

**Covers:** FR19, FR24, NFR1, NFR12, AD-7, AD-12, UX-DR32, UX-DR42, UX-DR52, UX-DR63, UX-DR64, UX-DR65, UX-DR67, UX-DR70
