---
title: 'Adversarial review: Traveller Sudoku architecture spine'
target: ../ARCHITECTURE-SPINE.md
context: _bmad-output/planning-artifacts/prds/prd-Jess-BMAD-project-2026-10-05/prd.md
lens: 'Two units one level down, each obeying every AD, that still build incompatibly'
date: '2026-10-05'
---

# Adversarial review: Traveller Sudoku architecture spine

## Verdict

**Pass with fixes.** The spine is strong on the risky logic: one Technique pipeline (AD-2), structured `Step`s (AD-3), a single owner of the Album (AD-6) and one versioned save document (AD-7) close most of the obvious collisions. The holes left are all in the **shared state shapes the ADs name but don't define**: what a session holds, how a solve gets turned into a Postcard, and which fields sit in `AppState` compared with the save document. Each one lets two epics write code that passes every AD and still doesn't fit together. Five holes are worth closing before stories start. Two of them are High because they hit the core loop (play, solve, Postcard, save). The rest are cheap to fix. This review is calibrated to hobby stakes, so it leaves out enterprise concerns such as multi-tab sync, quota handling and telemetry.

## Holes

### H1. The Free Play Puzzle has two owners, and no unit defines a session (High)

**Units:** Puzzle play (FR-2 to FR-7, FR-22) and Free Play (FR-23). Saving and offline (FR-17) is also affected.

**How each obeys every AD:**
- *Puzzle play* reads "Puzzle key = `city:<id>` or `free`" (Conventions) and "`AppState` (`album`, `sessions`, ...)" (AD-5). It models every in-progress grid as `sessions[puzzleKey] = { digits, notes, undo }`, so the Free Play grid lives at `sessions.free`. For City Puzzles it looks up givens and solution from `content/city-puzzles.json` by key, because AD-4 says that's where they live. Digits are an 81-character string, as the Grid format convention requires. Notes are a `number[81]` of bitmasks, which no AD covers. All changes go through the reducer.
- *Free Play* reads AD-5 and AD-7, which list `freePlay` as its own top-level slice. It stores `freePlay = { difficulty, givens, solution, digits, notes: string[81] }` there, because a generated Puzzle has no content entry to look up. It dispatches `freePlayGenerated` through the reducer, so it also obeys AD-5.

**How they clash:** the same entity, the current Free Play grid, is stored in two places with two shapes. Puzzle play's Hint, Mistake and completion code calls `sessions.free` and finds nothing there, or finds it without a `solution`, which AD-9 needs. Two Notes formats reach the single save document. AD-7 checks that there is one document, but not that its contents have one shape. The Hint unit (AD-9: "takes the current digits and the Puzzle's solution") can't get a solution in the same way for both kinds of Puzzle.

**Fix: add AD-10 (Session shape).**
> **AD-10: Every playable grid is one `Session` with one shape.**
> **Rule:** `sessions: Record<PuzzleKey, Session>` holds every in-progress Puzzle, including Free Play under the key `free` (only one Free Play Puzzle at a time). `Session = { key, givens, solution, digits, notes, status: 'inProgress' | 'solved', difficulty }`. `givens`, `solution` and `digits` are 81-character strings. `notes` is an 81-character-per-digit encoding defined once in `game/session.ts`: an array of 81 nine-bit masks, saved as numbers. A Session always carries its own `givens` and `solution`, copied from content when a City Puzzle starts, so engine calls never need to know where a Puzzle came from. The `freePlay` slice holds only Free Play *preferences* (the last chosen Difficulty and a `generating` flag that isn't saved), never a grid. Only `game/` constructs Sessions.

### H2. Completion has no single mutation path, so the Postcard award can be bypassed or doubled (High)

**Units:** Puzzle play (FR-7) and Postcard journey (FR-14, FR-16).

**How each obeys every AD:**
- *Puzzle play* handles `digitEntered` in the reducer. When the grid matches the solution, it sets `session.status = 'solved'` in the same reduction. That's pure and reducer-only (AD-5). It doesn't touch the Album, so AD-6 is respected.
- *Postcard journey* reads AD-6 ("only the `puzzleSolved` action may add a Postcard"). It implements `puzzleSolved` in `game/journey`. A reducer can't dispatch, so the journey author has the UI's Puzzle screen dispatch `puzzleSolved` from an effect when it sees that the grid is full. The Conventions table uses past-tense event names, so this looks correct.

**How they clash:** there are now two sources of truth for "solved". One is a reducer-computed `status`, the other is a UI-dispatched event. Specific failures:
- The UI checks "grid full" rather than "grid matches solution", and awards a Postcard for a wrong grid.
- A reload of a solved session re-runs the effect. AD-6's "not already in Album" guard stops a duplicate, but the "short, warm moment" (FR-14) plays again.
- Free Play's screen never dispatches `puzzleSolved`, so the two kinds of Puzzle mark completion differently.
- Any component can dispatch `puzzleSolved({ key: 'city:tokyo' })` with no solve at all. AD-6 only restricts *which action* adds a Postcard, not who may raise it or what it checks.

This also bends AD-1. Completion detection, which is a game rule, ends up in the shell.

**Fix: tighten AD-6 (and AD-5).**
> **AD-6 Rule (tightened):** completion is detected only inside the reducer. When a committed grid change makes `digits === solution`, the reducer sets `status: 'solved'` and, in the same reduction, calls `journey.award(album, session.key)`, which adds a Postcard only for `city:<id>` keys not already in the Album and returns `{ album, newPostcard? }`. `puzzleSolved` is not a UI-dispatchable action. The newly awarded Postcard is recorded in a non-saved `ui.pendingReveal` field, which the UI shows (FR-14) and clears with `postcardRevealClosed`. Reachability stays computed and is never stored.

### H3. `AppState` and the save document have different field lists, so a second write path appears (Medium-High)

**Units:** Saving and offline, specifically the storage notice (FR-19) and the save-failed signal (FR-24), and Saving and offline's autosave (FR-17). The two units collide even though they come from the same epic, because the stories split along these lines.

**How each obeys every AD:**
- *Storage notice story:* AD-7's document contains `seenStorageNotice`, but AD-5's `AppState` lists only `album, sessions, settings, freePlay`. The flag isn't in `AppState`, so the story adds `persistence.markNoticeSeen()`, which writes that one field. Only `persistence/` touches storage (AD-7), and no `AppState` change happened, so AD-5 isn't broken.
- *Autosave story:* "Persistence saves after every committed action" (AD-5). It serialises `AppState` into the document and fills in the fields it doesn't know about with defaults. It also has to strip undo history ("not saved"), so it hand-picks fields.
- *Save-failed story:* "A failed save sets a state flag" (AD-7). Shell errors become state flags (Conventions). It dispatches `saveFailed` into `AppState`.

**How they clash:**
- The next autosave writes `seenStorageNotice: false` over the value `markNoticeSeen` wrote, so the notice comes back on every launch. That's a lost write between two writers of one document.
- `saveFailed` is itself a committed action, so it triggers another save. If storage is broken, that save fails too, and the app loops.
- Undo stripping, the `generating` flag and `pendingReveal` each need ad-hoc exclusion code with no rule about who owns the list of saved fields.

**Fix: tighten AD-5 and AD-7 with an explicit split.**
> **AD-7 Rule (addition):** `AppState = { album, sessions, settings, freePlay, meta: { seenStorageNotice }, ui }`. Every saved field lives in `AppState` and changes only through the reducer. `ui` (save status, pendingReveal, generating, undo stacks) is never saved. `persistence/` owns one pair of functions, `toDocument(state)` and `fromDocument(doc)`. These are the only place that decides what's saved: they strip `ui` and undo, and add `schemaVersion`. Persistence writes only the full document. It has no partial-field writers. Actions that change only `ui` (for example `saveFailed`, `saveSucceeded`) don't trigger a save.

### H4. Rebuilding the City Puzzles silently corrupts saved half-finished City grids (Medium)

**Units:** build scripts/content (FR-1, FR-13) and Saving and offline (FR-17, FR-18).

**How each obeys every AD:**
- *Build scripts:* AD-4 says `scripts/` generates the 30 City Puzzles and commits them. Six months later, the creator tunes the generator or fixes a grading bug, then re-runs `build-cities`. A different seed produces new, valid, unique, correctly graded Puzzles for the same City ids. The AD-4 test passes. City ids aren't reused, so the Conventions are met.
- *Saving:* a session keyed `city:lisbon` stores the player's digits and Notes (FR-17), and forward migrations run (AD-7). Nothing in the document changed shape, so no migration is needed.

**How they clash:** the saved Lisbon digits now sit on top of a different set of givens. Mistake highlighting flags correct moves, and Hints report Mistakes that don't exist (AD-9). An already-collected City's replay gives a different Puzzle, which breaks AD-4's own "Prevents: a City's Puzzle changing between versions". AD-4 states the intent but has no rule that enforces it. H1's fix (a Session carries its own `givens`/`solution`) protects in-progress grids. Even so, content should be frozen.

**Fix: tighten AD-4.**
> **AD-4 Rule (addition):** once released, a City Puzzle is immutable. `build-cities` generates only for City ids missing from `content/city-puzzles.json` and never overwrites an existing entry. A test fails the build if any existing `{ cityId, givens, solution }` differs from the last committed version (a snapshot test). To change a released City's Puzzle, add a new City id. Saved Sessions keep their own `givens` and `solution` (AD-10), so content changes never reinterpret saved digits.

### H5. Hint stage and the Hint's move have no owner (Medium)

**Units:** Teaching Hints (FR-8 to FR-11) and Puzzle play (FR-4 Undo, FR-22 Restart, FR-17 autosave).

**How each obeys every AD:**
- *Teaching Hints* keeps the two-step stage (`none`, `nudge` or `full`) and the current `Step` in React component state. AD-5 governs `AppState`, and ephemeral view state is not obviously `AppState`. FR-9's "shows ... the move" is built as a button that *places* the digit by dispatching `digitEntered`, which is the existing action. Text comes from templates (AD-3) and Mistakes are checked first (AD-9). Every AD is met.
- *Puzzle play* builds Undo as a snapshot stack per session (AD-5) and treats every `digitEntered` as a player move. Restart clears entries (FR-22). It never knows a Hint is open.

**How they clash:**
- The Hint panel keeps showing a `Step` for a grid that has changed (after Undo, Restart, a typed digit or a switch of session), so the player can see a nudge for a cell that's already filled.
- A digit placed by a Hint looks the same as a player move. That's fine today, but it blocks the PRD's planned later "clean-solve rewards (postmarks)" without a schema migration.
- A second Hint author could add a `hintApplied` action that skips Undo, which gives two mutation paths for the same placement with different Undo behaviour.

AD-5's "Prevents: Undo seeing a different history" doesn't cover this.

**Fix: add a rule under AD-3 or AD-5.**
> **Rule:** Hint state lives in the current Session's `ui` part as `hint: { stage: 'nudge' | 'full', step } | null`. It's set by `hintRequested` and cleared by the reducer on every grid-changing action (`digitEntered`, `noteToggled`, `undoRequested`, `puzzleRestarted`) and on session switch. Applying the Hint's move dispatches `hintApplied`, which the reducer turns into the same placement and Undo entry as `digitEntered` and also tags in `session.hintsUsed` (a saved counter, ready for postmarks later).

## Lower-severity notes (optional, Low)

- **AD-2 forbids the brute-force code the generator and the AD-4 test need.** Filling a random complete grid and counting solutions are both "solving logic", and AD-2 says "No other code may implement solving logic". A scripts author and an engine-generator author will each write their own backtracker, or argue about whether they may. *Fix:* add to AD-2: "One exception: `engine/brute.ts` (backtracking fill and `countSolutions(limit)`) may be used only by the generator and tests, never by grading or Hints."
- **Shared enums aren't pinned.** Tier, Difficulty and Region are glossary words, but their code values (`'Near'` or `'near'`, `'americas'` or `'the-americas'`) and the Tier-to-Difficulty mapping (needed in `scripts/`, the AD-4 test and Free Play's Difficulty picker) aren't owned. *Fix:* add a Conventions row: "`Tier`, `Difficulty`, `RegionId` and `tierDifficulty` are defined once in `engine/types.ts` (Difficulty) and `game/journey.ts` (Tier, Region), with lowercase string values. Content JSON uses the same strings."
- **Free Play generation races.** Two quick "new Free Play" requests can let the slower worker reply overwrite the newer Puzzle. *Fix:* the worker echoes the seed, and the reducer ignores a `freePlayGenerated` whose seed isn't the one most recently requested. Starting a new Free Play while one is in progress asks for confirmation, as Restart does.

## What holds up well

- AD-2 combined with AD-3 removes the PRD's main technical risk (§8 Q2) as a source of conflict: grader, generator and Hints can't disagree.
- AD-6's "reachability is computed, never stored" closes the classic unlock-flag drift.
- AD-8's "service worker never touches IndexedDB" plus AD-7's "keep under backup key, never overwrite" is the right level of care for a game with no backup feature.
