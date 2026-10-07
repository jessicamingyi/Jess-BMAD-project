---
title: 'Product Brief: Traveller Sudoku'
status: final
created: '2026-10-05'
updated: '2026-10-05'
inputs:
  - _bmad-output/planning-artifacts/research/user-voice-sudoku-players-2026-10-05/research.md
---

# Product Brief: Traveller Sudoku

## Executive Summary

Traveller Sudoku is a calm, ad-free Sudoku game for the web. **Every puzzle you solve sends you a postcard from a new city**, and over time you fill an album of the world. It is a personal project, and the MVP runs in the browser.

It exists because Sudoku can feel pointless. The puzzles work, but **there is nothing to play for**: you solve one, it vanishes, and nothing has changed. Most Sudoku apps answer this with noise (ads, flashy animations, streak pressure), and players find that more irritating than motivating. Traveller Sudoku answers it quietly. Each solve adds to something you own and want to complete.

It also keeps what players already love about the best Sudoku apps:
- no interruptions
- puzzles solvable by logic alone
- hints that *teach* instead of just filling in a cell
- progress that is never lost

## The Problem

- **No stakes, no goal.** Solving a puzzle leaves nothing behind, so there is no reason to play the next one or to come back tomorrow. *(This comes from the creator's own experience and is the core problem this product solves.)*
- **Existing apps add the wrong kind of stakes.** Players reject flashy reward animations as "distracting and overstimulating". Streaks can make people "feel awful if I miss it". Grinding events ("100 levels in a week") feel like chores. (See the research, sections on why players stay and switch.)
- **Interruptions break the calm Sudoku is meant to give.** Ads during a puzzle are the main reason players delete free Sudoku apps ("Breaks my concentration each time").
- **When players get stuck, nothing helps them improve.** Hints often reveal a cell without explaining why, so players guess or give up.

## The Solution

A web Sudoku game built around a **postcard album**:

- **Solve a puzzle, get a postcard.** Each completed puzzle "sends" a postcard from a city and adds it to your album. In the MVP a postcard is text only: the city's name, its country and a short line of text. Pictures come later.
- **The album is the journey.** Cities are grouped into regions. [ASSUMPTION: difficulty maps to distance. Easy puzzles bring postcards from nearby cities; harder ones reach more distant destinations, so you have to grow as a solver to complete the album.]
- **Quiet extras for clean solves.** [ASSUMPTION: solving without hints or mistakes adds a special postmark or stamp to the postcard. It's a reward, never a punishment. You always get the postcard.]
- **Calm, focused play.** No ads, no timers forced on you, no flashing celebrations. The reward is opening the postcard.
- **Hints that teach.** Each hint names the technique (for example "hidden single"), highlights the cells involved and explains the reasoning, so you could find it yourself next time.
- **Your album is saved.** Progress is saved in the browser and the game keeps working without a connection once loaded.

## What Makes This Different

This is a personal project with no technical moat. What makes it different is the **combination**, which none of the Sudoku apps in the research offers:

1. **Stakes without noise.** A collection gives every solve a lasting result, without ads, streak pressure or overstimulating effects.
2. **Hints that teach.** Players praise this in Good Sudoku and criticise its absence elsewhere.
3. **A theme with charm.** Most Sudoku apps look alike. A postcard album is personal and has room to grow.

## Who This Serves

- **The creator (primary for the MVP).** Someone who found Sudoku boring because nothing was at stake. Success = *wanting* to open it again to see which city the next postcard comes from.
- **Daily players.** They play a puzzle or two a day as a ritual and value calm and no interruptions. Success = a peaceful session with a small reward at the end.
- **Improvers.** They are stuck at intermediate level and want to learn techniques. Success = solving puzzles they couldn't before, because a hint taught them something.

## Scope

**In the MVP (web):**
- Classic 9×9 Sudoku with a puzzle generator: every puzzle has exactly one solution and can be solved by logic, without guessing.
- 3–4 difficulty levels, graded by the techniques a puzzle needs.
- Core play: mouse and keyboard input, notes (pencil marks), undo, optional highlighting of mistakes, and assists that can each be switched on or off.
- Hints that teach for a core set of techniques. [ASSUMPTION: singles, pairs, pointing and claiming; advanced techniques come later.]
- Postcard album with text-only postcards: city name, country and a short line. [ASSUMPTION: about 30 cities across 3 regions for the first version.]
- Readability for everyone: large, clear digits and notes, good contrast, and light and dark modes.
- Local saving and offline play after first load. No accounts.

**Explicitly out of the MVP:**
- accounts, cloud sync, album backup (export/import), mobile apps
- leaderboards, sharing, friends
- streaks and a daily puzzle
- variant puzzles (Killer, Thermo and so on)
- any ads or payments
- postcard pictures or illustrations (planned for after the MVP)
- story or narrative content beyond the postcard text

## Risks and Open Questions

- **Are text-only postcards enough?** Using only city names keeps the MVP small and avoids the effort of producing art. The risk is that the album feels flat without pictures. Watch for this in the creator's own play and in testing; it's the first thing to improve if the collection doesn't pull the creator back.
- **Will collecting stay motivating after the novelty?** The creator is the first test. If the album stops pulling them back, the distance-to-difficulty link (or rare postcards) may need more weight.
- **How hard is good hint generation?** Explaining techniques needs a solver that solves step by step, the way a person would. This is the main technical risk, and the architect should look at it.
- **Browser storage is the only copy.** With no accounts and no backup, clearing browser data or switching device loses the album. That's acceptable for a personal MVP, but it's the first thing to fix if others start playing.

## Vision

If the MVP keeps *you* coming back, Traveller Sudoku could grow into:
- illustrated postcards with a picture for each city
- a full world atlas of regions
- a postcard of the day that everyone shares
- trading or sharing favourite postcards with friends
- variant puzzles as "special destinations"
- a mobile app with sync

All of these must keep the same promise: **calm play, and something worth collecting with every solve.**
