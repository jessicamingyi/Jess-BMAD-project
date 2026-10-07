# Addendum: Traveller Sudoku PRD

Technical notes and the reasons behind decisions. They're for architecture and story writing, not part of the PRD.

## Technical approach notes (for the architect, not decisions)
- **Puzzles per City (FR-1, FR-13):** each City has *one* Puzzle. Two options: (a) generate Puzzles ahead of time and ship them as data, or (b) generate them from a fixed seed per City at runtime. Option (a) makes "solvable with the MVP Techniques" easy to check in a build-time test, and makes offline play (FR-18) simple.
- **Hint engine (FR-8 to FR-11):** needs a solver that works the way a person does, applying Techniques in order of difficulty and recording which cells justify each step. The same solver can grade Difficulty (FR-1). It must also check the player's grid against the solution so it can point out a Mistake (FR-11).
- **Storage (FR-17):** browser storage (IndexedDB, per architecture AD-7) is enough for the Album, every started City's Puzzle and the current Free Play Puzzle. Saving each Puzzle's progress separately makes replay (FR-16) easier.
- **Offline (FR-18):** a static web app with a service worker (installable web app) caching all files and Puzzle data.
- **Durable storage (D2; FR-18, FR-24):** the browser's persistent-storage request (`navigator.storage.persist()`), a version number on saved data with migrations, and a service-worker update strategy that never deletes saved data.

## Decisions made while writing the PRD (2026-10-05)
- **No clean-solve reward in the MVP.** A Puzzle is either solved or not. The postmark idea from the brief is deferred.
- **The player chooses the destination** rather than getting a random City. Choosing makes the journey feel like *yours*.
- **No game over, and mistake highlighting off by default.** Research: the "three mistakes and you're out" rule is a common complaint, and some players want the app *not* to flag Mistakes.
- **Both input modes.** This fixes the brief/addendum mismatch that the brief's polish pass found. Research: players ask for number-first input.
- **Tier = Difficulty.** This merges the brief's two motivation risks into one design lever: distance is the stakes.

## Finalise review decisions (2026-10-05)
- **D1, running out of content:** 30 City Puzzles last a daily player about a month. Chosen: **Free Play** (FR-23) with no Postcard, so a Postcard still means progress. Rejected: more Cities or several Puzzles per City (content cost), and accepting the limit (it would turn the MVP into a test of content volume, not of whether Postcards motivate).
- **D2, durable storage:** Safari deletes a site's stored data after 7 days without a visit unless the app is installed, and updates can break saved data. Chosen: ask the browser to keep data permanently, carry saved data forward across versions, keep offline play working after updates, and tell the player if saving fails (FR-18, FR-24). Export/import stays out, as decided in the brief.
- **D3, platform:** desktop only, with mouse and keyboard. Touch and tablet support are deferred.
