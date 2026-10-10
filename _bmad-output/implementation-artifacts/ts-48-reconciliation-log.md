---
ticket: TS-48
title: 'Reconcile planning docs with as-built behaviour'
date: '2026-10-09'
status: 'awaiting approval (Jessica)'
baseline_revision: '74683dc'
---

# TS-48 reconciliation log

Every planning-doc change made to match the code at `74683dc`. Each row was checked against `src/`; the code was treated as the truth. Changed ACs in `epics.md` end with an italic *(Reconciled 2026-10-09: …)* note. Spine, EXPERIENCE and context changes are marked "(as built, 2026-10-09)". Spec files were only annotated ("Superseded by TS-43 …"), not rewritten.

Source ids:
- **S1–S12:** `epics-1-3-retro-2026-10-08.md` › Spec-to-implementation reconciliation.
- **R1–R11, A4, E3, E6:** `epic-4-retro-2026-10-09.md`.
- **D1, D2, D5:** `spec-retro-epics-1-3-actions.md`.
- **TS-42:** `spec-ts-42-44-boot-timeout-and-test-gaps.md`.
- **TS-43:** `spec-ts-43-play-without-saving.md`.

## Changes

### `_bmad-output/planning-artifacts/epics.md`

| # | Section | Before → after | Source |
|---|---|---|---|
| 1 | 1.1 CI AC | "every push to `main` … deploys to Pages" → runs ci, lint, test, build; deploy only when `vars.PAGES_ENABLED` is `true`; not live yet | S1 |
| 2 | 1.1 published-site AC | "the site is published at …" → "… (once `PAGES_ENABLED` is set)" | S1 |
| 3 | 1.2 solve AC | "Solved." with no Postcard or animation → solved line; Free Play no Postcard or animation; a first City solve shows the 3.3 Postcard reveal | S5 |
| 4 | 1.4 action row AC | Undo and Restart both have key captions → only Undo has one (Restart has no shortcut); from 2.1 the row is "Undo · Hint · Restart" | S2 |
| 5 | 1.5 N/M/H AC | "H does nothing yet" → H opens the Hint panel and advances one step per press (2.1) | S5 |
| 6 | 1.5 reduced-motion AC | nothing animates on solve → except the City Postcard slide (in place under reduced motion) | S5 |
| 7 | 1.8 startup AC | app shows the Free Play start state → app opens on the Album (3.5 launch); "Puzzle" nav disabled until a Puzzle exists | S4 |
| 8 | 1.8 worker-reply AC | reply always opens "Free Play · Medium" → opens only from the entry; a City current away from the entry stays current; reply set aside when the old in-progress Free Play is current on the Puzzle screen; only a Free Play Hint closes; `lastPlayedKey` = `free` | S3, S11, D1, D5 |
| 9 | 2.1 action-row AC | Hint caption "H" in `ink-muted` → caption coloured `card` on the primary fill (≥ 4.5:1) | D2 |
| 10 | 2.1 engine AC | last `Step` names each of 5 Techniques → singles: last (only) Step; pair, pointing, claiming: first Step, chain ends in a placement | S8 |
| 11 | 2.1 step-1 AC | label "Show a nudge" → label "Nudge" (buttons unchanged) | S6 |
| 12 | 2.1 step-2 AC | label "Explain it"; template "…in its column." → label "Explanation"; template "…in its column or box." ("an 8") | S6, S8 |
| 13 | 2.1 no-Hint AC | (not stated) → "no Hint" result kept while idle; step button disabled until digits change | S9 |
| 14 | 2.2 apply AC | step 2 ("Explain it"); "Show me the move" or H → step 2 ("Explanation"); also the action-row "Hint" | S6, S9 |
| 15 | 2.3 link AC | link names the final `Step`'s Technique → names `chain[0]` (same as the nudge); "What's pointing?" / "What's claiming?" take no article | S7, S9 |
| 16 | 2.4 Mistake step-1 AC | label "Show a nudge" → "Nudge" (step 2 "Explanation") | S6 |
| 17 | 2.4 full-grid ACs | (not stated) → the filling digit is announced with the cue once; the line's "Hint" button advances step 2, then the move | S9 |
| 18 | 3.1 placeholder-gate AC | gate fails the deploy job → same, via `check:placeholders`; runs only once `PAGES_ENABLED` is true; has never fired | S1 |
| 19 | 3.2 Postmark AC | Postmark shows today's date → today while in progress; `collectedOn` during the reveal and on a solved City | S10 |
| 20 | 3.3 Postcard AC | (not stated) → Postcard is a labelled `role="dialog"`, `aria-modal` during the reveal | S10 |
| 21 | 3.3 "Add to Album" AC | (not stated) → returning to a solved City via "Puzzle" shows "Solved. Where to next?" plus an "Album" link | S12 |
| 22 | 3.4 viewer-close AC | Esc or click outside → also a visible "Close" control | S10 |
| 23 | 3.4 replay-confirm AC | confirm whenever a replay is in progress → only when touched (adds "This replaces your replay in progress."); an untouched replay restarts without asking | S10 |
| 24 | 3.4 replay-solved AC | "with a link to the Album" → the word "Album" in the sentence is the link | S10 |
| 25 | 3.5 lastPlayedKey AC | list includes `noteToggled` → `digitEntered`/`cellClicked`/`currentDigitPlaced`/`cellCleared` (Digit or Notes), `hintApplied`, `undoRequested`, `restartConfirmed`; `freePlayGenerated` also sets it | S11 |
| 26 | 3.5 nav "Puzzle" AC | current Puzzle at launch = `lastPlayedKey` Session → "…, even if it is solved" | S11 |
| 27 | 4.1 document AC | `schemaVersion: 1` → `schemaVersion: 2` (1 until 4.4's migration) | R1 |
| 28 | 4.1 restore AC | launch: `lastPlayedKey` else Album → full rule: `lastPlayedKey`, first in-progress City, Free Play, else Album | R2 |
| 29 | 4.2 banner AC | priority read-only > save failed; focus to grid/heading → read-only > save failed > unreadable; read-only Puzzle screen focuses the current nav item | R4, R7 |
| 30 | 4.2 migrations AC | fake v0 doc + v0 → v1 test → real v1 → v2 test; a v0 document is unreadable; holder writes back once | R5 |
| 31 | 4.2 newer-version AC | (defaults implied) → saved state shown read-only (best effort) when readable, else defaults | R6 |
| 32 | 4.2 unreadable AC | backup, then empty Album, "never overwritten"; backup fails → read-only → holder only: backup, then main key gets defaults; backup fails → saving off; no main-key write after a give-up; a non-holder starts empty and read-only with no notice (deferred) | R3, R8, TS-42, TS-43 |
| 33 | 4.2 new AC "storage can't be reached" | (none) → saving off: plays in memory, never writes or asks `persist()`, lock released, saving-off banner (not announced), no storage notice or Add to Dock; a non-holder that gave up is read-only instead | TS-43 |
| 34 | 4.3 update-ready AC | five-kind priority → seven: read-only > saving off > save failed > unreadable > storage notice > Add to Dock > update ready | R4, TS-43 |
| 35 | 4.4 first-launch AC | (not stated) → the storage notice never shows while saving is off | TS-43 |
| 36 | 4.4 Safari AC | "refused on Safari" → desktop macOS Safari 17+ (not as an installed web app); never while saving is off | R11, TS-43 |
| 37 | 4.4 first-Postcard AC | any tab → only a tab that can write; read-only and saving-off tabs never call `persist()`/`persisted()` | TS-43 (E5 test, TS-44) |
| 38 | 4.4 start-up `persisted()` AC | "the app starts" → "…in a tab that can write" | TS-43 |
| 39 | 4.4 priority AC | five kinds → the same seven kinds as row 34 | R4, TS-43 |
| 40 | 4.4 any-banner AC | six kinds; focus to grid/heading → adds saving off; the current nav item when a read-only grid is inert | R7, TS-43 |

### `_bmad-output/planning-artifacts/ux-designs/ux-Jess-BMAD-project-2026-10-06/EXPERIENCE.md`

| # | Section | Before → after | Source |
|---|---|---|---|
| 41 | frontmatter | `updated: '2026-10-06'` → `'2026-10-09'` | — |
| 42 | Voice and Tone › Postcard viewer | "Play again" → "Play again" · "Close" | S10 |
| 43 | Voice and Tone › Hint steps | one row "Show a nudge" → "Explain it" → "Show me the move" → two rows: step labels "Hint" → "Nudge" → "Explanation"; step buttons as before | S6 |
| 44 | Voice and Tone › Hint step 2 | "…in its column." → "…in its column or box." ("an 8") | S8 |
| 45 | Voice and Tone › Technique link | "What's a hidden single?" → adds the no-article forms; names the same Technique as the nudge | S7, S9 |
| 46 | Voice and Tone › Replay solved | (not stated) → the word "Album" is the link | S10 |
| 47 | Voice and Tone › new row "Solved City, revisited" | (none) → "Solved. Where to next?" · "Album" | S12 |
| 48 | Voice and Tone › new row "Saving off" | (none) → the exact `copy.bannerSavingOff` line · "Got it" | TS-43 |
| 49 | Component Patterns › Notice banner | priority read-only > save failed > storage notice > persistence > update ready [ASSUMPTION] → the seven-kind `BANNER_PRIORITY` order | R4, TS-43 |
| 50 | State Patterns › Read-only | (none) → only other tab or newer version; "Got it" focuses the current nav item on the Puzzle screen | TS-43, R7 |
| 51 | State Patterns › new row "Saving off" | (none) → causes, in-memory play, nothing saved, banner, no storage notice or Add to Dock | TS-43 |
| 52 | State Patterns › Unreadable save | "old data stays in its backup key" → backup first, then the main save resets to an empty Album; backup fails → Saving off | R3, TS-43 |
| 53 | Interaction Primitives › Hint steps 1–2 | "Show a nudge" / "Explain it" → names the step labels "Nudge" / "Explanation" and the buttons | S6 |

The other banner lines in Voice and Tone (storage notice, Safari, save failed, other tab, newer version, unreadable, update ready) were compared with `src/content/copy.ts` and already match exactly.

### `_bmad-output/planning-artifacts/architecture/architecture-Jess-BMAD-project-2026-10-05/ARCHITECTURE-SPINE.md`

| # | Section | Before → after | Source |
|---|---|---|---|
| 54 | frontmatter | `updated: '2026-10-06'` → `'2026-10-09'` | — |
| 55 | AD-5 | `ui` list (hint, undo, saveFailed, readOnly, updateReady) → adds `savingOff`, `unreadableNotice`, the banner dismissals | TS-43 |
| 56 | AD-7 new "Modules" bullet | (none) → `document.ts` (v2), `migrations.ts`, `store.ts`, `lock.ts`, `storage-persist.ts` | A4 |
| 57 | AD-7 On load | unreadable data "kept under a backup key … never overwritten" → holder backs up, then writes defaults to the main key; data kept only under the backup key; holder writes the migration back once | R3 |
| 58 | AD-7 new "Start-up give-up" bullet | (none) → 3 s bound; after a give-up no main-key write starts; a started backup may finish | TS-42 |
| 59 | AD-7 new "Storage unavailable → saving off" bullet | (none) → `ui.savingOff`: in-memory play, no writes, no `persist()`, lock released, banner; read-only only for other tab or newer data | TS-43 (E2) |
| 60 | AD-7 One writer | (none) → a tab that will never write releases the lock | TS-43 |
| 61 | AD-7 Persistent storage | any tab; "on Safari" → writable tab only; desktop macOS Safari 17+ | TS-43, R11 |
| 62 | AD-10 Worker replies | ignores stale ids → also opens only from the entry, and sets aside a reply over the current in-progress Free Play on the Puzzle screen | S3, D1 |
| 63 | AD-12 | notices: storage, save failure, read-only, update ready → also saving off, unreadable, Add to Dock | TS-43 |
| 64 | Conventions › Actions | examples include `noteToggled` → removed, with a note that Notes go through the digit actions | S11 |
| 65 | Structural Seed › `.github/workflows/` | "deploy to Pages" → lint added; deploy only when `PAGES_ENABLED` | S1 |
| 66 | Structural Seed › `game/` | "reducer" → `reducer.ts` + `reducer-*.ts` areas, plus `launch` and `banners` | A4 (retro 1–3 A3; Epic 4 A8) |
| 67 | Structural Seed › `persistence/` | "document, migrations/, save-lock, storage-persist" → `document.ts`, `migrations.ts`, `store.ts`, `lock.ts`, `storage-persist.ts` | A4 |
| 68 | Deployment and environments | "a push to `main` … deploys" → adds: opt-in behind `PAGES_ENABLED`, the placeholder gate, not live yet | S1 |

### `_bmad-output/implementation-artifacts/epic-4-context.md`

| # | Section | Before → after | Source |
|---|---|---|---|
| 69 | Requirements › Never lose progress | "unreadable data is never overwritten" → backed up first, then the main key gets defaults | R3 |
| 70 | Technical Decisions › Persistence boundary | `document`, `migrations/`, `save-lock`, `storage-persist` → `document.ts`, `migrations.ts`, `store.ts`, `lock.ts`, `storage-persist.ts` | A4 |
| 71 | Technical Decisions › Document | `schemaVersion: 1` → `2` | R1 |
| 72 | Technical Decisions › Migrations | backup fails → read-only → main key gets defaults after the backup; backup fails → saving off; no main-key write after a give-up | R3, TS-42, TS-43 |
| 73 | Technical Decisions › new "Storage unavailable" bullet | (none) → saving-off behaviour; read-only only for other tab or newer data | TS-43 |
| 74 | UX › Notice banner | five-kind priority → the seven-kind `BANNER_PRIORITY` | R4, TS-43 |
| 75 | UX › Microcopy | (none) → adds the saving-off line, exact from `copy.ts` | TS-43 |
| 76 | Cross-Story Dependencies | "completes the five-level banner priority" → six levels after 4.4, seven after TS-43 | R4, TS-43 |

### Spec annotations (history kept; one inline note each)

| # | File › line | Annotation | Source |
|---|---|---|---|
| 77 | `spec-4-2-safe-across-versions-and-tabs.md` › Always, unreadable bullet (l.31) | "Superseded by TS-43 …: saving off, not read-only" | TS-43 |
| 78 | `spec-4-2…` › matrix "Newer" (l.48) | "as built: the saved state shows read-only when readable, else defaults; the cited Spec Change Log was never written" | R6 |
| 79 | `spec-4-2…` › matrix "Backup fails" (l.50) | "Superseded by TS-43 …" | TS-43 |
| 80 | `spec-4-2…` › Design Notes `storageUnavailable` (l.103) | "Superseded by TS-43 …" | TS-43 |
| 81 | `spec-4-2…` › Auto Run summary (l.119) | "superseded by TS-43: a failed or hung load now turns saving off" | TS-43 |
| 82 | `spec-4-4-storage-notice-and-keeping-your-data.md` › Safari detection (l.36) | "as built: desktop macOS Safari 17+ only, not iOS or an installed web app" | R11 |
| 83 | `spec-4-4…` › Banner priority (final) (l.37) | "Superseded by TS-43 …: final order is the seven kinds" | R4, TS-43 |
| 84 | `spec-ts-42-44-boot-timeout-and-test-gaps.md` › Always (l.24) | "Superseded by TS-43 …" | TS-43 |
| 85 | `spec-ts-42-44…` › matrix "Late unreadable settle" (l.32) and "Late load" (l.33) | "Superseded by TS-43 …" in the outcome cell | TS-43 |
| 86 | `spec-ts-42-44…` › Tasks, autosave tests (l.59) | "Superseded by TS-43 …" | TS-43 |

### `_bmad-output/implementation-artifacts/deferred-work.md` (new entries, existing format)

| # | Entry | Summary | Source |
|---|---|---|---|
| 87 | spec-4-1 | Lamplight on a light OS: blank white Canvas frame before the document loads (medium, unverified) | spec-4-1 `deferred`; P2 |
| 88 | spec-4-3 | Thin install metadata: one SVG icon, no PNG/apple-touch-icon, manifest `id` or `theme-color` | spec-4-3 `deferred`; R10, P2 |
| 89 | spec-4-3 | Old service worker vs new schema; evidence refreshed: v2 shipped in 4.4, so the trigger is met | spec-4-3 `deferred`; E3 |
| 90 | epic-4 retro | Repeated backups while the defaults write keeps failing (ends at the first successful write) | E6 |
| 91 | epic-4 retro | A non-holder tab that finds unreadable data starts empty and read-only, with no unreadable notice | R8 |

## Found but deliberately not changed

1. **The unreadable banner copy still says "…kept safe, not overwritten."** (`src/content/copy.ts` `bannerUnreadable`).
   - The main key *is* overwritten with defaults after a successful backup; only the backup copy is untouched.
   - Docs quote the string verbatim, as required. Changing it is a `src/` change, so it is out of scope here.
   - **Decision for Jessica (R3):** reword the line (e.g. "A copy has been kept safe."), or accept it as is.
2. **`README.md` still says every push deploys** (the README half of S1). Another agent owns `README.md` in this sprint.
3. **The rest of S7 is outside this ticket's files.** These were not touched:
   - `spec-2-3-whats-a-technique.md:107` (Design Notes "Hardest = max rank").
   - `epic-2-context.md:31` ("the link … names the final Step's Technique").
   - The test title at `tests/ui/hint-panel.test.ts:271` (`tests/` is off-limits).
   - spec-2-3:39 already records the amendment.
4. **The epics.md Requirements Inventory was left as the 2026-10-06 extraction snapshot.**
   - Stale items:
     - the AD-5/AD-7 summaries (`ui` list; "never overwritten"; read-only)
     - the Additional Requirements folder layout ("migrations/, save-lock")
     - the CI/CD bullet ("deploys")
     - UX-DR27–29 and UX-DR67 ("Show a nudge"/"Explain it" as step names)
     - UX-DR32 (old five-kind priority)
     - UX-DR48/UX-DR50
     - NFR11 ("unreadable … never overwritten")
   - The ticket scoped epics.md to the story ACs. The sources these items restate (spine, EXPERIENCE) are now reconciled.
   - Suggest regenerating the inventory, or adding a one-line pointer, if Jessica wants it updated.
5. **Some story-time ACs are deliberately incremental and are superseded in-text by later stories**, so they were left alone:
   - 1.1 "no service worker, nothing written to storage" (Epic 4)
   - 1.2 sample Puzzle at startup (1.8 says so)
   - 1.5 focus order without the Hint panel
   - 1.6 nav "Puzzle · Settings" and Settings resetting on reload (3.2 and 4.1 say so)
   - 1.8 nav "Puzzle · Free Play · Settings"
   - 3.3 / 3.5 "surviving a real reload arrives with Epic 4"
6. **Epic 4 retro rows marked accept or defer with no doc action:**
   - R9: precache lists content as a bundled JS chunk. The 4.3 AC names the JSON files; it was accepted.
   - R10: the 4.3 manifest AC "self-hosted icons from `public/`" is literally true (one `favicon.svg`). The gap is tracked in row 88.
   - R12, R13, R14, A2.
   - A3: `ui/app.tsx` calls `toDocument`. The AD-7 ownership statement is still the intended rule, and the gap is a tracked deferral.
7. **The EXPERIENCE.md UJ-2 failure branch** lists other tab and newer version but not saving off. It was left because the ticket scoped EXPERIENCE edits to Voice and Tone, State Patterns and priority. Saving off is covered by the new State Patterns row.
8. **`DESIGN.md`** has no banner priority or storage-state statements, so it needed no change.
9. **The old spec-frontmatter `deferred` entries** in spec-4-1 and spec-4-3 were kept as history. `deferred-work.md` now mirrors them; the 4.3 old-worker entry carries the refreshed evidence.
10. **Epic 4 retro open question 4** (should update-ready outrank the first-visit storage notice?) is a product decision, not a divergence. The order is documented as built.

**Approved by Jessica on 2026-10-09.** Item 1 above (unreadable wording) is resolved: Jessica chose "We couldn't read your saved progress, so we've kept a copy safe and started fresh.", now in `src/content/copy.ts`, EXPERIENCE.md, epics.md and epic-4-context.md.
