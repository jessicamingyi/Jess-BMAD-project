# Epic 3 Context: Travel and collect Postcards

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn the calm Sudoku from Epics 1–2 into a journey: the player browses an Album by Region, chooses a Reachable City, solves its pre-built Puzzle, receives a text Postcard in a warm reveal, unlocks Mid and Far Cities, replays collected Cities, and reopens straight onto the last-played Puzzle. Each solve leaves something behind, which is the reason the product exists. The 30 Cities are approved (names, countries, slot ids). Postcard lines are not written yet (tracked as TS-40), so every City except Lisbon stays `placeholder: true` and deploys stay blocked. Surviving a real reload, offline play and storage notices belong to Epic 4.

## Stories

- Story 3.1: City catalogue and pre-built City Puzzles
- Story 3.2: Choose a destination from the Album
- Story 3.3: Receive a Postcard
- Story 3.4: Revisit Postcards and replay Cities
- Story 3.5: Pick up where you left off

## Requirements & Constraints

- **30 Cities:** 10 per Region (`europe`, `asia`, `americas`), each split 4 `near` / 3 `mid` / 3 `far`; one Puzzle per City; no country repeats. Tier sets Difficulty: Near = Easy, Mid = Medium, Far = Hard. City fields: `id`, `name`, `country`, `region`, `tier`, Stamp `glyph`, Postcard `line`, plus `placeholder` where it applies. A test enforces the counts, the allowed values and unique ids.
- **Approved catalogue (slot id → City, Country):** Europe: near `europe-near-1..4` Paris FR, London UK, Rome IT, Amsterdam NL; mid `lisbon` Lisbon Portugal, `europe-mid-2` Prague Czechia, `europe-mid-3` Dubrovnik Croatia; far `europe-far-1..3` Reykjavík Iceland, Tromsø Norway, Tbilisi Georgia. Asia: near `asia-near-1..4` Tokyo Japan, Seoul South Korea, Singapore, Bangkok Thailand; mid `asia-mid-1..3` Hanoi Vietnam, Jaipur India, Taipei Taiwan; far `asia-far-1..3` Luang Prabang Laos, Ulaanbaatar Mongolia, Samarkand Uzbekistan. Americas: near `americas-near-1..4` New York USA, Toronto Canada, Mexico City Mexico, Rio de Janeiro Brazil; mid `americas-mid-1..3` Havana Cuba, Cartagena Colombia, Cusco Peru; far `americas-far-1..3` Ushuaia Argentina, La Paz Bolivia, Nuuk Greenland. Catalogue order within a Tier follows this list.
- **Placeholder content:** only Lisbon is real (line "The trams climb hills that would tire a goat. Wish you were here."). Every other City has `placeholder: true` and a line starting "PLACEHOLDER". Ids are neutral slot ids and never change, even when a name or line changes later. Stamp glyphs are a design choice made in Story 3.1.
- **Deploy gate:** if any City is a placeholder, CI tests may pass but the deploy job fails with a message listing the placeholder ids. Local `npm run dev` and `npm run build` still work.
- **Fair, frozen City Puzzles:** every entry has exactly one solution (brute count = 1), its Givens agree with its solution, its grade equals its `difficulty`, and `difficulty` matches its Tier. Every City has exactly one entry and every entry's City exists. Failures name the City id. Released entries never change; a snapshot test fails on any change or removal.
- **Unlocks (per Region):** all Near Cities are reachable from the start; Mid opens at 3 Near Postcards in that Region; Far at 3 Mid. One Region's Postcards never unlock another.
- **Postcard secrecy:** a City's line never appears in visible text, accessible names or the live region before that City is collected.
- **Award:** only the first solve of a City awards a Postcard. Replays and Free Play award nothing; there are never duplicates.
- **Calm reveal:** no flashing, sound or confetti; nothing covers the grid during play; motion honours `prefers-reduced-motion`. Opening a City Puzzle takes under 1s (read from content, never generated at runtime).
- **Accessibility:** WCAG AA in Daylight and Lamplight for every new pair (Album, slots, Stamp, Postmark, Postcard); targets ≥ 24×24px; locked slots are focusable for their label.

## Technical Decisions

- **Content:** `src/content/cities.json` (catalogue) and `src/content/city-puzzles.json` (`{ cityId, givens, solution, difficulty }`, 81-char digit strings).
- **`scripts/build-cities`:** generates entries only for City ids that lack one, using the engine generator with a seed derived from the City id (deterministic) at the Tier's Difficulty. Appends only and never rewrites; a run with nothing missing leaves the file byte-for-byte unchanged. The architecture test allows `scripts` → `game/journey` (Tier map only) in addition to `engine` and `content`.
- **`game/journey`** holds the only Tier→Difficulty map, reachability, Region counts and `award(state, key)`. Reachable/locked state and counts are always computed from `album` + catalogue, never stored.
- **Album shape:** `album` = Postcards `{ cityId, collectedOn: 'YYYY-MM-DD', revealed: boolean }`, at most one per City, in the order collected.
- **Solve and award:** in the reducer step that completes the solution (`digitEntered` or `hintApplied`, each carrying the shell's date), mark the session `solved` and call `journey.award`. `award` adds `{ cityId, collectedOn, revealed: false }` only for `city:<id>` keys not already in the Album. `postcardAdded` sets `revealed: true`. Any unrevealed Postcard is shown again before anything else, one at a time in the order collected. The core never reads the clock, and there is no dispatchable `puzzleSolved`.
- **Sessions:** `cityChosen` builds `sessions['city:<id>']` from content (digits = Givens, Notes all 0, `inProgress`, `hintsUsed: 0`) with empty undo history. A `cityChosen` for a locked or unknown City changes nothing. Replay replaces a solved session with a fresh one and leaves the Postcard and counts unchanged. Other Cities' sessions are never touched.
- **Last played:** `meta.lastPlayedKey` is set by actions that change digits or Notes (`digitEntered`, clear, `noteToggled`, `hintApplied`, `undoRequested`, `restartConfirmed`), not by opening a session, selecting or switching modes. The launch rule is a pure function of `AppState`: an unrevealed Postcard first, then `lastPlayedKey` if `inProgress`, else the first `inProgress` City in catalogue order, else Free Play, else the Album.
- **Dates:** the Postmark date (DD MMM YY, e.g. "06 OCT 26") is passed in by the shell: today on the Puzzle screen, `collectedOn` on a Postcard.

## UX & Interaction Patterns

- **Nav:** "Puzzle · Album · Free Play · Settings"; current surface `airmail-red` with 1px underline. "Puzzle" returns to the current Puzzle; with none it is `aria-disabled` but focusable. Leaving a Puzzle never asks for confirmation.
- **Album:** the Album is also the destination chooser (no map). Region tabs "Europe · Asia · The Americas" with counts ("Europe 4 / 10"), active tab under a 3px double `ink` rule. Opens on the Region of the latest Postcard, else Europe. One Region per page: a `city-title` heading ("Where to first?" when empty, else "Where to next?"), then 10 slots in a 5-column grid with a 12px gap, Near→Mid→Far. Shows "No rush - your Puzzle will wait." when any Puzzle is in progress.
- **Slots:** *Reachable* = blank card, City, "{country} · {Tier}", "Travel here". *In progress* = "Carry on". *Locked* = dashed border, no name, "Opens after 3 Near/Mid Postcards", faded by fill and border only. *Collected* = mini Postcard with a 4px airmail-stripe top, City, country · Tier and the line in italic. *Just arrived* = 2px `airmail-red` outline plus a "just arrived" caption, static under reduced motion, gone on the next Album visit. *Collected with replay in progress* adds "Carry on".
- **City Puzzle header:** "Lisbon · Mid · Medium" (`city-title`); meta "Portugal — Europe, Postcard 5 of 10" (the number is the City's slot position); 74×88px Stamp (`airmail-red` face, country / glyph / Tier, perforated edge, +3°, `aria-hidden`); Postmark outside the grid frame's top-right corner (double circle in `postmark` at 75% opacity, `aria-hidden`). Free Play shows neither Stamp nor Postmark.
- **Postcard reveal:** the grid stays visible, input stops, and the Postcard slides onto the grid (appears in place under reduced motion). Grid and side column become `inert`; focus goes to "Add to Album"; the live region says "Solved". Postcard: card with an 8px −45° airmail-stripe border, −1° rotation, shadow `0 10px 26px rgba(31,42,68,.30)`. Left half: the line (`postcard-line`). Right half: Postmark over a 52×62 Stamp and address lines "To: the Traveller" · "Album · {Region}" · "{City}, {country}". The line is in a region labelled "Postcard from {City}", linked to the button by `aria-describedby`. Only "Add to Album" or Esc dismisses it, then the Album opens on that Region with focus on its heading.
- **Postcard viewer:** a Collected slot opens the viewer over the Album (non-blocking) with "Play again" (primary). Esc or one click outside closes it and returns focus to the slot. If a replay is in progress, "Play again" shows an inline confirm "Start fresh" / "Keep going" with focus on "Keep going".
- **Solved lines:** a replay shows "Solved again. {City} is already in your Album." with a link to the Album; no Postcard is shown.

## Cross-Story Dependencies

- 3.1 (catalogue, City Puzzles, journey Tier map, deploy gate) comes first. 3.2 adds reachability, `cityChosen`, the Album and the City header, testing against `album` fixtures. 3.3 adds `award`, the reveal and `postcardAdded`. 3.4 reuses 3.3's Postcard component and replays through 3.2's session creation. 3.5 adds `lastPlayedKey` and the launch rule, which gives way to 3.3's reveal.
- Builds on Epic 1: Session shape, reducer solve step, generator/grader/brute, tokens, contrast test, architecture test, CI. Builds on Epic 2: `hintApplied` can complete a solve, and the UJ-1 flow uses a Hint.
- Epic 4 makes this state survive real reloads (autosave and restoring unrevealed Postcards), adds the second persistence request after the first Postcard, and pre-caches the City content for offline play.
- External: the creator's Postcard lines (TS-40) must replace every placeholder before the deploy gate lets a release through.
