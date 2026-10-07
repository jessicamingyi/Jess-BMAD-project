# Input reconciliation: user-voice research vs PRD

- **Input:** `_bmad-output/planning-artifacts/research/user-voice-sudoku-players-2026-10-05/research.md`
- **Checked against:** `prd.md` and `addendum.md` (same folder)
- **Date:** 2026-10-05
- **Scope:** hobby web MVP. Items the PRD explicitly defers (streaks, social, variants, stats, daily puzzle, pictures, phone/native) are not flagged unless the deferral conflicts with a research must-have. Pricing (one-time purchase) is not flagged: the PRD rules out payments entirely, which meets the need behind it (no ads, no subscription).

## Well covered (no action)
- No ads or interruptions, calm by design, no flashing (§5, FR-14) — research N1, "calm interface".
- No game over (FR-6), mistake highlighting off by default (FR-5) — research "three mistakes" complaint and autonomy insight.
- Number-first input, Notes, Assists each switchable (FR-2, FR-3, FR-5) — research "flexible input".
- Teaching Hints that name the Technique, explain it, and link to a definition (FR-8, FR-10) — research N3 and Recommendation 3.
- Logic-only Puzzles with one solution (FR-1) — research N2.
- Readable notes, contrast, borders, dark theme (FR-20) — research N4 and Recommendation 4.

## Gaps

### G1. "Progress that is never lost" is only partly met, and deferring export/import conflicts with it — **HIGH**
- **Research section:** Executive summary (two added must-haves); Recommendations §2 ("progress that is never lost"); Why players stay/switch ("loses their records"); sources [4][18].
- **What's missing:** FR-17 covers autosave and FR-19 warns that clearing browser data erases the Album. The PRD doesn't address loss the player didn't cause: browser storage eviction (Safari can clear script-written storage for sites that haven't been visited for a while unless the app is installed; storage can also be cleared when the disk is under pressure), save failures (quota or private mode), or corrupted saves. Export/import, the only recovery path, is deferred to "later". The research calls never-lost progress a must-have, and lost records are a top reason paying users leave Good Sudoku. FR-19 tells the player about the risk instead of reducing it.
- **Suggested PRD fix:** Add an FR, e.g. **"FR-x: Durable progress."** The game asks the browser for persistent storage. If a save fails, it tells the player quietly and doesn't lose the in-memory state. A corrupted or unreadable save never wipes the Album. Then either (a) bring a minimal manual backup into the MVP (download/upload an Album file, or copy/paste a save code), or (b) record in §7 and §9 that deferring it is an accepted risk against a research must-have. Update FR-19 to recommend installing the app if Safari eviction remains a risk.

### G2. Offline and saves must survive app updates — **HIGH**
- **Research section:** Executive summary point 2 ("about 15 complaints" of broken offline play; "lost history" after the app changed); Cross-dimension insight 1 ("nobody runs it reliably").
- **What's missing:** FR-18 says the game works offline after the first visit, but it says nothing about what happens when a new version is deployed. In the competitor complaints, offline play and data broke *after updates*. Without a requirement, a service-worker update or a change to the save format could break offline play or silently drop the Album or a Puzzle in progress.
- **Suggested PRD fix:** Extend FR-18/FR-17 with: "After an app update, the game still works offline, and existing Album and in-progress Puzzles load unchanged. Saved data is versioned and migrated forward, never discarded. An update never interrupts a Puzzle in progress; it applies on the next launch." Add a consequence: an automated test loads a save from the previous version.

### G3. Switching Cities may discard a half-finished Puzzle — **MEDIUM-HIGH**
- **Research section:** Recommendations §2 (progress never lost); UJ-2 depends on it.
- **What's missing:** FR-17 saves progress on "the current Puzzle" (singular). FR-12 lets the player pick any Reachable City and FR-16 allows replays. The PRD doesn't say what happens to Puzzle A's progress when the player opens City B, or when they replay a collected City. The addendum suggests per-Puzzle saving, but that note isn't a requirement.
- **Suggested PRD fix:** In FR-17, state that in-progress state is kept per City, and that opening another City never discards it. Alternatively, if only one Puzzle can be in progress, the game must warn before discarding it. Show "in progress" as a City state in FR-15.

### G4. No mis-tap protection or input precision requirement — **MEDIUM**
- **Research section:** Recommendation 4 ("mis-tap protection"); N1 (banner next to the number pad causes mis-taps); Other complaints ("three mistakes" combined with mis-taps; input lag); [20] (mis-taps, confusing notes mode with number mode).
- **What's missing:** Undo (FR-4) helps after the fact, but the PRD sets no requirements for: target size and spacing on a tablet browser (§5 says "usable on a tablet"), given digits that can't be edited, a clearly visible Notes/digit mode indicator, or input response time. FR-2 lists number-first entry but doesn't say the selected digit stays "locked" until the player changes it.
- **Suggested PRD fix:** Add to FR-2/FR-3 or §5: "Given digits can't be changed. The current input mode (digit or Note) and the locked digit in number-first mode are always visible. Cells and the number pad have touch-sized targets with spacing on tablet, and nothing else sits next to the number pad. Input shows on screen without perceptible lag (under 100 ms)." `[ASSUMPTION]` on the numbers.

### G5. Difficulty-to-Technique mapping is undefined, so labels could be wrong — **MEDIUM**
- **Research section:** N2 (wrong difficulty labels across communities: "Expert easier than NYT Medium", "Hard easier than Medium"); Recommendations §2 (puzzle quality).
- **What's missing:** §3 says the hardest Technique needed sets Difficulty, and FR-1 says Difficulty matches Tier, but the PRD never says which of the 5 Techniques define Easy, Medium and Hard. So the FR-1 test can't check labels, only solvability. With only basic Techniques available, "Hard" could feel easy to improvers. That's the exact complaint in the research.
- **Suggested PRD fix:** Add the mapping to §3, e.g. Easy = naked/hidden singles only; Medium = needs a naked pair; Hard = needs pointing or claiming `[ASSUMPTION]`. Extend the FR-1 consequence so the grader confirms each Puzzle needs its Tier's hardest Technique. Optionally, set a minimum number of hard steps for Hard so it feels harder.

### G6. Sound and animation controls are unspecified — **LOW**
- **Research section:** New needs ("optional animations and sound that can be muted"); [5] (unmutable audio); "Reward animations ... overstimulating" [1].
- **What's missing:** FR-14 says "no sound by default", which implies sound exists, but there is no mute or sound setting and no rule for animations beyond "no flashing". Reduced-motion preferences aren't mentioned.
- **Suggested PRD fix:** Either state "the MVP has no audio", or add a persistent sound toggle (off by default). Add: "Animations are short and subtle, and are turned off when the OS reduced-motion setting is on."

### G7. No way to restart a Puzzle — **LOW**
- **Research section:** Other complaints, input friction ("no reset") [2][4].
- **What's missing:** The PRD has Undo but no "restart this Puzzle" or "clear all Notes".
- **Suggested PRD fix:** Add to FR-4: "The player can restart the current Puzzle (with confirmation), which keeps the Postcard if it has already been collected."

### G8. No digit/Note size setting — **LOW**
- **Research section:** N4 ([15] vendor FAQ "numbers too small"); Recommendation 4 ("readability as a setting for everyone").
- **What's missing:** FR-20 sets large defaults but gives the player no way to adjust them. The research frames readability as an *accessibility setting*.
- **Suggested PRD fix:** Add to FR-20 that the grid scales with browser zoom without breaking the layout, or add a simple size setting (normal/large).
