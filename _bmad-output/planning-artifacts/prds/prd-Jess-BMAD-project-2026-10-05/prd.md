---
title: 'PRD: Traveller Sudoku'
status: final
created: '2026-10-05'
updated: '2026-10-06'
inputs:
  - _bmad-output/planning-artifacts/briefs/brief-Jess-BMAD-project-2026-10-05/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-Jess-BMAD-project-2026-10-05/addendum.md
  - _bmad-output/planning-artifacts/research/user-voice-sudoku-players-2026-10-05/research.md
---

# PRD: Traveller Sudoku

## 0. Document Purpose

This PRD defines the web MVP of Traveller Sudoku, a personal hobby project. It builds on the product brief and the player research (see the frontmatter for paths); it does not repeat them. Terms in §3 are used exactly. Requirements are numbered FR-1 to FR-24 so that UX, architecture and stories can refer to them; IDs are stable, so some appear out of numeric order. Inferred items are tagged `[ASSUMPTION]` and listed in §9. Technical approach notes are in `addendum.md`.

## 1. Vision

Traveller Sudoku is a calm Sudoku game in the browser, where **every solved Puzzle sends you a Postcard from a City**. Sudoku felt boring to its creator because nothing was at stake: a solved grid vanished and nothing changed. Here, every solve adds to an Album you build City by City. Harder Puzzles take you further away.

The game keeps what players value most in Sudoku apps: no interruptions, Puzzles solvable by logic alone, Hints that teach instead of giving answers, and a game that never ends in "game over".

## 2. Target User

### 2.1 Jobs To Be Done
- **The creator (primary):** *"Give me a reason to play the next Puzzle, and something I own at the end of it."*
- **Daily players:** *"A calm Puzzle or two, without interruptions, with a small reward."*
- **Improvers:** *"When I'm stuck, teach me the Technique so I can find it myself next time."*

### 2.2 Key User Journeys
- **UJ-1. Jess picks her next stop.** Jess opens Traveller Sudoku on her laptop in the evening. Her Album shows 4 Postcards from Europe: every Near City, so the Mid Cities are now open. From the Reachable Cities she picks Lisbon, a Mid City with a Medium Puzzle. She starts the Puzzle, gets stuck once and uses a Hint. The Hint explains a *hidden single* in row 4. She finishes the Puzzle, and a Postcard from Lisbon quietly lands in her Album. She closes the tab.
- **UJ-2. Jess comes back after a break.** Two days later Jess reopens the game, offline on a train. Her half-finished Puzzle and her Album are exactly as she left them, and she carries on.

## 3. Glossary
- **Puzzle**: one classic 9×9 Sudoku grid with exactly one solution, generated at a Difficulty.
- **Difficulty**: Easy, Medium or Hard. Set by the hardest Technique the Puzzle needs: Easy needs only singles; Medium also needs naked pairs; Hard also needs pointing or claiming. `[ASSUMPTION: 3 levels and this mapping]` Each Difficulty also has a minimum number of Givens: Easy at least 61, Medium at least 40, Hard at least 32 (TS-62, decided 13 Oct), so a calm player solves an Easy Puzzle in about one minute (a design target, not a timer).
- **Technique**: a named solving step. MVP set: naked single, hidden single, naked pair, pointing, claiming.
- **City**: a destination with a name, a country, a Region and a Tier. Each City has one Puzzle.
- **Region**: a group of Cities. MVP: Europe, Asia, the Americas.
- **Tier**: a City's distance (Near, Mid or Far). Tier sets the Puzzle's Difficulty: Near is Easy, Mid is Medium, Far is Hard.
- **Reachable City**: a City whose Puzzle the player can play now (see FR-12).
- **Postcard**: the reward for solving a City's Puzzle. In the MVP it is text only: City name, country and one short line.
- **Album**: the player's collection of Postcards, grouped by Region.
- **Hint**: a step-by-step explanation of the next logical move, naming its Technique.
- **Assist**: an optional helper that can be switched on or off (for example mistake highlighting).
- **Notes**: pencil-mark candidates a player writes in a cell.
- **Given**: a digit that is part of the Puzzle at the start. It can't be changed.
- **Mistake**: a digit the player entered that differs from the Puzzle's solution.
- **Free Play**: playing a generated Puzzle at a chosen Difficulty, outside any City. It earns no Postcard.

## 4. Features

### 4.1 Puzzle play
Classic Sudoku, focused and calm. You can never lose. Realises UJ-1 and UJ-2.

- **FR-1: Fair Puzzles.** Each City's Puzzle has exactly one solution and can be solved using only the MVP Techniques, without guessing. Its Difficulty matches its City's Tier.
  - *Consequence:* a test solver using only the MVP Techniques solves 100% of Puzzles, and the hardest Technique it needs matches the Puzzle's Difficulty as defined in §3. Each Puzzle has at least its Difficulty's minimum Givens (Easy 61, Medium 40, Hard 32).
- **FR-2: Two input modes.** The player can enter digits **cell-first** (select a cell, then a digit) or **number-first** (select a digit, then click cells), using mouse or keyboard. Givens can't be changed.
- **FR-3: Notes.** The player can switch between entering a digit and entering Notes, and can add or remove Notes in any empty cell. The current mode (digit or Notes, and the selected digit in number-first mode) is always visible.
- **FR-4: Undo.** The player can undo any number of moves, including Note changes.
- **FR-5: Assists.** The player can switch each Assist on or off: mistake highlighting (**off by default**), highlighting other cells with the same digit (on by default), and highlighting the selected cell's row, column and box (on by default). `[ASSUMPTION: this Assist set]`
- **FR-6: No game over.** Mistakes never end, reset or fail a Puzzle. A Puzzle is either solved or still in progress.
- **FR-22: Restart.** After a confirmation, the player can restart the current Puzzle; restarting clears all entries except the Givens.
- **FR-7: Completion.** When every cell matches the solution, the Puzzle is marked solved. The first time a City's Puzzle is solved, FR-14 fires; replays and Free Play award no Postcard.

### 4.2 Teaching Hints
Hints teach the reasoning instead of filling in a cell. Realises UJ-1.

- **FR-8: Hint content.** When asked, a Hint names the Technique, highlights the cells involved and explains in one or two plain sentences why the move is true (for example "7 can only go in this cell of row 4").
- **FR-9: Three-step Hint.** The first request gives a nudge: the Technique and the area of the grid to look at. The second explains the reasoning. The third shows the move ("Show me the move"). Updated 2026-10-06 to match the UX design.
- **FR-10: Technique help.** From any Hint, the player can open a short definition of its Technique.
- **FR-11: Hints respect the player's grid.** A Hint reasons from the digits currently in the grid and works out candidates itself; it doesn't rely on the player's Notes. If the grid contains a Mistake, the Hint points out the Mistake instead of reasoning from it.

### 4.3 Postcard journey
The reason to play the next Puzzle. Realises UJ-1.

- **FR-12: Choose a destination.** The player chooses the next City from the Reachable Cities. In each Region, all Near Cities are reachable from the start. Mid Cities become reachable after 3 Near Postcards in that Region, and Far Cities after 3 Mid Postcards. `[ASSUMPTION: 3-Postcard unlock threshold]`
- **FR-13: Cities.** The MVP ships 30 Cities: 10 per Region, split across the Tiers. `[ASSUMPTION: 4 Near / 3 Mid / 3 Far per Region]`
- **FR-14: Receive a Postcard.** A Postcard's line stays hidden until its City's Puzzle is solved. Solving the Puzzle adds the Postcard to the Album and reveals it in a short, warm moment that feels like receiving mail from a friend: no flashing, no sound, closed with one click.
- **FR-15: Album.** The player can browse the Album by Region and see which Cities are collected, reachable or locked, with a count such as "7 / 10 Europe".
- **FR-16: Replay.** The player can replay the Puzzle of a City they've already collected. A replay starts from a fresh grid and never creates a duplicate Postcard.

### 4.4 Saving and offline
Realises UJ-2.

- **FR-17: Autosave.** Progress on every started City's Puzzle and on the current Free Play Puzzle (digits and Notes), Assist settings and the Album save automatically after every change and survive a page reload or browser restart. Switching to another City keeps each half-finished Puzzle. Undo history doesn't need to survive a reload.
- **FR-18: Offline play.** After the first visit, the whole game, including all 30 Cities, works without a network connection, and keeps working after a new version is released. Progress saved by an earlier version is carried forward, never discarded.
- **FR-19: Storage notice.** On first launch the game explains once that progress is stored in this browser only, and that clearing browser data erases the Album.
- **FR-24: Durable storage.** The game asks the browser to keep its stored data permanently, so the browser doesn't delete it automatically (for example after a period without visits). If saving fails, the game tells the player.

### 4.5 Readability
- **FR-20: Readable grid.** Digits and Notes are large and clear. Text meets WCAG AA contrast (at least 4.5:1), and box borders and highlights meet at least 3:1, in both light and dark themes.
- **FR-21: Keyboard play.** A Puzzle can be played entirely with the keyboard: arrow keys to move, digits to enter, and a key to toggle Notes.

### 4.6 Free Play
Puzzles beyond the 30 Cities, so play doesn't stop when the Album is complete.

- **FR-23: Free Play.** At any time, the player can start a Free Play Puzzle at a chosen Difficulty. It follows FR-1 to FR-11 and FR-22, earns no Postcard, and is never needed to unlock Cities.

## 5. Cross-Cutting Requirements
- **Calm by design:** no ads, no pop-ups during a Puzzle, no countdown timers, no streak prompts, no flashing effects, and no audio in the MVP. Animations follow the system's reduced-motion setting.
- **Platform:** current desktop versions of Chrome, Edge, Firefox and Safari, with mouse and keyboard. Tablets and phones are not supported in the MVP.
- **Responsiveness:** opening a City's Puzzle takes under 1 second. `[ASSUMPTION]`
- **Privacy:** no accounts, no tracking, no data leaves the browser.

## 6. Non-Goals
- Not a competitive or social game: no leaderboards, sharing or friends.
- No pressure mechanics: no lives, timers or streaks.
- No payments or ads of any kind.

## 7. MVP Scope

**In:** everything in §4: classic 9×9, Free Play, 3 Difficulties, two input modes, Notes, Undo, Assists, three-step teaching Hints for 5 Techniques, 30 text-only Postcards across 3 Regions, the Album, autosave, offline play, light and dark themes.

**Out (later):**
- Postcard pictures
- clean-solve rewards (postmarks)
- advanced Techniques
- more Regions
- export/import or cloud backup, and accounts
- daily Puzzle, streaks, statistics
- variant puzzles
- tablet and phone support, touch input, and native apps
- story or narrative content beyond the Postcard line

*Success metrics are omitted on purpose: this is a hobby project, and the test is whether the creator keeps playing.*

## 8. Open Questions
1. **Who writes the 30 Postcard lines, and in what tone?** Owner: the creator, before content work starts. FR-14 points towards "written as if by a friend".
2. **Can a step-by-step solver produce good Hints within a hobby budget?** This is the main technical risk; the architect should look at it.
3. **Will text-only Postcards be motivating enough?** Watch for this in the creator's own play. If not, Postcard pictures move up the list.

## 9. Assumptions Index
- §3: 3 Difficulty levels, mapped one-to-one to the 3 Tiers, and the Technique-to-Difficulty mapping.
- FR-5: the Assist set and its defaults.
- FR-12: 3-Postcard threshold to unlock the next Tier in a Region.
- FR-13: 4 Near / 3 Mid / 3 Far Cities per Region.
- §5: a City's Puzzle opens in under 1 second.
