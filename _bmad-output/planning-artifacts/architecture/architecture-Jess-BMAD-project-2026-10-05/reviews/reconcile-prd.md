# Input Reconciliation: PRD vs Architecture Spine

- **Spine:** `ARCHITECTURE-SPINE.md` (draft, 2026-10-05)
- **Inputs:** `prds/prd-Jess-BMAD-project-2026-10-05/prd.md`, `addendum.md`
- **Date:** 2026-10-05
- **Method:** I checked every FR, §5 cross-cutting rule, glossary term and non-goal against the ADs, the Conventions and the Capability Map. I only flag items where the spine contradicts the PRD, or where two units built separately could reasonably diverge. FRs that sit inside one unit (e.g. FR-3 mode visibility) are not flagged.

Severity: **High** = likely to cause a PRD violation or data loss if left open. **Medium** = a real divergence risk between units. **Low** = worth one line in the spine.

---

## F1. Hints for elimination-only Steps loop, and it is unclear whether a Hint makes the move

- **PRD ref:** FR-8, FR-9, FR-11; §1 "Hints that teach instead of giving answers"; Open Question 2
- **Gap:** AD-9 says the Hint function reads only the current digits and the solution, and recomputes candidates each time. The Techniques naked pair, pointing and claiming produce `eliminations[]` but no `placements[]`. These eliminations are not stored anywhere (Notes are ignored by design), so the next Hint request starts from the same digits, finds the same elimination again, and the player is stuck in a loop on Medium and Hard Puzzles. The spine also doesn't say what the second Hint step does with "the move" (FR-9). Does it dispatch `digitEntered`? Is that undoable? Does it count as a player entry? `engine/hints`, `game/reducer` and `ui/` could each answer these questions differently.
- **Suggested spine fix:** add to AD-2 or AD-9: *"A Hint runs the solver from the current digits until the first Step that has a placement. The Hint is that placement plus the chain of elimination Steps that enabled it. The Hint's Technique is the hardest one in the chain. The nudge names that Technique and `unit`."* Then decide FR-9's "move": either the Hint only shows the move, or the player accepts it through a `hintApplied` action that is undoable like any other move. Extend the `Step`/`Hint` type in AD-3 to match.
- **Severity:** High

## F2. Several tabs, or two app versions, can overwrite the Album

- **PRD ref:** FR-17, FR-18 ("never discarded"), FR-24; addendum D2
- **Gap:** AD-7 stores one whole document and AD-5 saves after every action. Every open tab holds a full `AppState` in memory, so the last tab to write wins. If a Postcard is earned in tab A and tab B then saves its stale `album`, the Postcard is lost. AD-8 lets an old tab (old code, old `schemaVersion`) keep running while a new tab migrates the document forward. The old tab then writes a downgraded document on top. AD-7 also doesn't say what happens when the stored `schemaVersion` is newer than the running code.
- **Suggested spine fix:** add to AD-7: (a) single-writer. Use a `BroadcastChannel` or Web Locks so that only one tab is active, and other tabs show a calm "open in another tab" state. Or re-read and merge `album` before each write, since the Album only ever grows. (b) If the stored `schemaVersion` is newer than the code's version, persistence goes read-only and never writes.
- **Severity:** High

## F3. The session model is ambiguous: Free Play location, replay vs resume, who detects a solve

- **PRD ref:** FR-7, FR-16, FR-17, FR-22, FR-23
- **Gap:** three related gaps.
  1. `AppState` has both `sessions` and `freePlay`, and the Puzzle-key convention includes `free`. It isn't clear whether the current Free Play session lives in `sessions.free` or in `freePlay`, or what `freePlay` holds. A Free Play session must also store its generated `givens`/`solution`, which City sessions get from content.
  2. FR-16 says a replay starts from a fresh grid, but sessions are keyed only by `city:<id>`. The spine doesn't say whether a collected City's half-finished replay is resumed (FR-17) or reset, or what happens to a session once it is solved.
  3. AD-6 makes `puzzleSolved` an action. If the UI dispatches it, the UI decides what "solved" means (FR-7: every cell matches the solution), and could fire it twice or wrongly.
- **Suggested spine fix:** in AD-5 or AD-6, define `Session = { key, givens, solution, digits, notes, status }`, with Free Play stored in `sessions.free` (and drop `freePlay` or define it as "last chosen Difficulty"). The reducer detects completion itself after `digitEntered` and emits the solve internally. The UI never dispatches `puzzleSolved`. Choosing a City whose Postcard is already collected resumes an in-progress replay if one exists. Otherwise it creates a fresh session. A solved session is cleared.
- **Severity:** Medium-High

## F4. City Puzzles are not frozen across versions

- **PRD ref:** FR-18 (progress carried forward), FR-1, FR-13
- **Gap:** AD-4 says it prevents "a City's Puzzle changing between versions", but no rule enforces this. Running `scripts/build-cities` again after a generator change would rewrite `city-puzzles.json`. Saved City sessions only store digits and take givens/solution from content, so they would silently stop matching (wrong Givens, false Mistakes).
- **Suggested spine fix:** add to AD-4: *"Once shipped, a City's Puzzle is immutable. The build script verifies and does not regenerate existing entries, and a test fails if a shipped City's `givens` change."* Alternatively, store `givens` in each session and drop a session whose givens no longer match, with a calm notice.
- **Severity:** Medium

## F5. Privacy is limited to "no telemetry"; third-party requests are not ruled out

- **PRD ref:** §5 Privacy ("no data leaves the browser"), FR-18 (whole game offline)
- **Gap:** the spine only says "no backend, no account system and no telemetry" under Deployment. There is no rule against runtime requests to third-party origins: web fonts from a CDN, analytics added "just for debugging", externally hosted icons. Such requests leak the player's IP address and usage, and also break the promise of full offline play.
- **Suggested spine fix:** add a Conventions row "Network": *"The app makes no runtime requests except to its own origin. All fonts, icons and content are self-hosted and pre-cached. No analytics or third-party scripts. A Content-Security-Policy restricts sources to the app's own origin (`default-src 'self'`)."*
- **Severity:** Medium

## F6. Calm-by-design is not applied to notices and errors

- **PRD ref:** §5 "no pop-ups during a Puzzle", FR-14 (closed with one click, no flashing or sound), FR-19, FR-24, AD-7/AD-8
- **Gap:** the Styling convention covers audio and reduced motion, and the Errors convention says "shown calmly". But three things could interrupt a Puzzle, and nothing says where they appear: the save-failure flag, the unreadable-data notice and the first-launch storage notice. A new-version notice could add a fourth if a later developer switches `vite-plugin-pwa` to prompt mode. "No flashing effects" also isn't stated (only reduced motion is).
- **Suggested spine fix:** extend Conventions with these rules. All system notices are non-modal and appear in one shared status area, never as dialogs over the grid. The FR-19 notice shows on the Album/Destinations screen, not during a Puzzle. Update activation is silent: no update prompt. No flashing or blinking at any motion setting. The only modals allowed are ones the player opens (Restart confirmation, Technique help, Postcard reveal).
- **Severity:** Medium

## F7. The under-1-second open target and Free Play generation time are not designed for

- **PRD ref:** §5 Responsiveness (City Puzzle opens in under 1 second), FR-23
- **Gap:** pre-built City Puzzles (AD-4) make the 1-second target likely, but no rule protects it. For example, nothing stops Hint solving running before the first frame, or the full catalogue loading lazily. Free Play generation for Hard Puzzles that need pointing or claiming may take many tries. "Generator performance tuning" is deferred with no limit and no fallback.
- **Suggested spine fix:** note under AD-4: opening a City Puzzle is a synchronous read of bundled content and must not wait on the engine. Free Play generation runs in the worker with a calm "preparing" state and a time limit. One option is to pre-generate the next Free Play Puzzle in the background, or to ship a small bundled pool to fall back on.
- **Severity:** Low-Medium

## F8. Keyboard input is handled in many places

- **PRD ref:** FR-2, FR-3, FR-21
- **Gap:** keyboard play covers cell-first entry, number-first entry, toggling Notes, moving with the arrows, Undo, and probably Hint and Restart. Nothing assigns one owner to key handling. Separate `keydown` listeners in the grid, Hint panel and modals could conflict, for example digits being entered while the Restart confirmation is open.
- **Suggested spine fix:** add a Conventions row: one key map in `ui/` (or `game/`) turns keys into actions. It is disabled while a modal has focus.
- **Severity:** Low

## F9. The Tier-to-Difficulty mapping has no single source

- **PRD ref:** §3 Difficulty/Tier glossary, FR-1, FR-13, FR-23
- **Gap:** the AD-4 build test, the Free Play Difficulty picker and the Album labels all need the mappings Near=Easy, Mid=Medium, Far=Hard, and Difficulty to highest Technique. The spine doesn't say where these mappings live, so each unit may hard-code them, even though both are flagged `[ASSUMPTION]` and may change.
- **Suggested spine fix:** state in AD-2 that the engine registry owns Technique rank to Difficulty, and that `content/` (or `game/`) owns Tier to Difficulty, defined once and imported everywhere.
- **Severity:** Low

---

## Checked and landed (no action)

- No game over (FR-6) and no timers, streaks or statistics: nothing in `AppState` tracks time or streaks.
- No audio and reduced motion (§5): Styling convention.
- Desktop only (§5, D3): the deployment diagram targets a desktop browser, and touch is deferred.
- WCAG AA in light and dark themes (FR-20): Styling convention.
- Mistakes defined against the solution, Hints ignoring Notes (FR-5, FR-11): AD-9.
- No duplicate Postcards, unlocks computed rather than stored (FR-12, FR-14–FR-16): AD-6.
- Durable storage request, migrations, save-failure flag (FR-24, FR-18): AD-7 (but see F2).
- Glossary naming in code: Naming convention.
- Non-goals (social, payments, pressure mechanics): nothing in the spine contradicts them.
