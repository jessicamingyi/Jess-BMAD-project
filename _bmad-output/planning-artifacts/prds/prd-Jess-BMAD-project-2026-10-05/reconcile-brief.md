# Reconciliation: Brief inputs vs PRD + PRD addendum

Inputs checked: `briefs/brief-Jess-BMAD-project-2026-10-05/brief.md`, `addendum.md`, `.memlog.md`.
Against: `prds/prd-Jess-BMAD-project-2026-10-05/prd.md`, `addendum.md`.

These were intentional and are not counted as gaps: clean-solve postmark dropped (pass/fail only), success metrics removed, export/import out, postcards text-only.

---

## High

### G1. Only 30 Puzzles in total, and nothing defined after the Album is complete
- **Source:** brief.md Scope ("Classic 9×9 Sudoku with a puzzle generator"); Who This Serves (daily players "a puzzle or two a day as a ritual"; creator success = *wanting* to open it again); brief Risks ("Will collecting stay motivating after the novelty?").
- **Gap:** The PRD says "Each City has one Puzzle" and ships 30 Cities (FR-13). So the game has 30 Puzzles in all. A daily player runs out in about 2–4 weeks, and only Replay (FR-16) is left. The brief's "puzzle generator" has become a fixed set (the PRD addendum's option (a) makes this likely). The PRD doesn't say what happens once the Album is full or a Region is complete. It's also unclear whether a player can play a Puzzle with no Postcard attached.
- **Suggested fix:** Add an FR or Open Question for end of content: what the player sees when a Region or the Album is complete, and whether there is free play (generated Puzzles, no Postcard) at a chosen Difficulty. Or state outright that 30 Puzzles is the MVP's intended lifespan, as a test of the hook.

## Medium

### G2. "Never lose progress" is only partly covered: switching City mid-Puzzle
- **Source:** brief.md Executive Summary ("progress that is never lost"); brief addendum guardrail ("Never lose progress. Players treat history and collections as possessions...").
- **Gap:** FR-17 saves "the current Puzzle" only. The PRD doesn't say what happens to a half-finished Puzzle if the player opens a different Reachable City, or starts a Replay of a collected City. Read literally, that progress could be overwritten. The PRD addendum hints at saving each Puzzle separately, but no requirement says so. The PRD §1 list of values kept from the brief also leaves out "progress that is never lost".
- **Suggested fix:** Extend FR-17: "Progress on every started Puzzle is kept separately. Opening another City or a Replay never discards it." Add "progress is never lost" to the §1 list of kept values.

### G3. The reward has no positive spec for feel or charm, only things it must not do
- **Source:** brief.md Solution ("The reward is opening the postcard"); Differentiator 3 ("A theme with charm... personal"); memlog line 9 (Sudoku felt "a bit boring", a tension with "calm" positioning, "to explore").
- **Gap:** FR-14 and §5 only say what the reveal must *not* do (no flashing, no sound, one click to close). Nothing says the Postcard moment should feel charming, personal or worth opening. "Calm" risks becoming "flat", which is the boredom the product exists to fix. The tone of the Postcard line is only an Open Question (§8 Q1), with no direction or owner.
- **Suggested fix:** Add a cross-cutting quality line, e.g. "Calm, not dull: the Postcard reveal is the emotional high point of a session: warm, personal, unhurried." Make §8 Q1 a decision with a default tone, or name an owner and a deadline. Pass the brief's "postcard is *sent* to you" idea on to UX.

### G4. The Postcard's surprise is not protected
- **Source:** brief.md Who This Serves (creator success = wanting to open it again "to see which city the next postcard comes from"); Solution ("The reward is opening the postcard").
- **Gap:** The PRD lets the player choose the City (a deliberate choice, recorded in the addendum), so which City is coming is no longer a surprise. Nothing keeps any surprise in its place. FR-15 shows reachable and locked Cities but doesn't say whether the Postcard's line (or anything else) stays hidden until solved. If everything is visible upfront, "opening the postcard" has nothing left to reveal.
- **Suggested fix:** In FR-14/FR-15, state that the Postcard's line stays hidden until the Puzzle is solved. Reachable Cities show name and country only.

## Low

### G5. "No timers forced on you" has become "no timers" at all
- **Source:** brief.md Solution ("no timers forced on you"); brief addendum option B (personal bests "parked... players value stats quietly").
- **Gap:** PRD §5 says "no countdown timers", which fits the brief. But §6 Non-Goals says "no lives, timers or streaks", which also rules out an optional, hidden elapsed-time display. The brief left room for one.
- **Suggested fix:** Change §6 to "no forced or countdown timers". Optionally list "optional elapsed timer / personal bests" under Out (later).

### G6. Possible grind in Tier unlocks
- **Source:** brief.md Problem ("Grinding events ('100 levels in a week') feel like chores").
- **Gap:** The 3-Postcard unlock (FR-12) is mild, but nothing in the PRD guards against unlocks feeling like a chore.
- **Suggested fix:** Add to §5 Calm by design: "Unlocks never require repeating content or meeting time-bound goals."

### G7. Guardrails for future features not carried over
- **Source:** brief addendum ("Streaks, if ever added, must be opt-in or forgiving"); brief Vision ("All of these must keep the same promise: calm play, and something worth collecting with every solve").
- **Gap:** The PRD lists streaks and the daily puzzle under Out (later) without the brief's condition on them, and leaves out the brief's promise that any future feature must keep.
- **Suggested fix:** Add both as notes in §7 Out (later) or §6.

### G8. "Story or narrative content beyond the postcard text" missing from Out
- **Source:** brief.md Scope, Explicitly out.
- **Gap:** The PRD's Out list doesn't include it. Without that, Postcard lines could grow into narrative content.
- **Suggested fix:** Add it to §7 Out.

### G9. Ideas for weighting motivation not carried over
- **Source:** brief.md Risks ("the distance-to-difficulty link (or rare postcards) may need more weight"); brief addendum option A (mastery "could later shape how regions unlock").
- **Gap:** The PRD addendum merges the two motivation risks into Tier = Difficulty. But the fallback ideas from the brief (rare Postcards, unlocks based on Techniques) don't appear anywhere, not even under Out (later). §8 Q3 only covers whether text-only Postcards are enough, not whether the hook stays motivating after the novelty wears off.
- **Suggested fix:** Broaden §8 Q3 to cover motivation after the novelty, and list rare Postcards and Technique-based unlocks as fallbacks.

### G10. Technique set may have narrowed
- **Source:** brief.md Scope ("singles, pairs, pointing and claiming").
- **Gap:** The PRD lists "naked pair" only. The brief's "pairs" could also mean hidden pairs. Probably intentional, but it isn't recorded.
- **Suggested fix:** Confirm it in §3, or add hidden pair to the Technique list.
