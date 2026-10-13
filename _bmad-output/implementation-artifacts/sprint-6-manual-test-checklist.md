---
title: 'Sprint 6 manual test checklist (TS-46, TS-47)'
created: '2026-10-09'
---

# Sprint 6 manual test checklist

Run these against a local production build (`npm run build`, then `npm run preview`), or against the live site once TS-38 turns Pages on. Tick each box, and note anything odd beside it. Claude will turn the notes into fixes.

## Already covered automatically

`npm run smoke` passes 10 of 10 journeys in **Chrome 155** and **Edge 154**:

- first launch
- play (keyboard and mouse, Notes, Undo, Hint)
- Postcard
- Free Play
- reload restore
- two tabs
- offline
- corrupt data
- storage unavailable
- update banner

That completes TS-46: Firefox (TS-52) and Safari (TS-53) are out of MVP scope (Jessica, 9 Oct). Their lists below are kept for after MVP.

## Firefox: out of MVP scope (TS-52, after MVP)

Jessica moved Firefox out of the MVP on 9 Oct. Keep this list for TS-52.

- [ ] **Number-first Space** (deferred since Story 1.5):
  1. Press M to switch to number-first, then pick a digit (press 4).
  2. Arrow to an empty cell and press **Space** once.
  3. The 4 is placed and stays. It must not flash and clear.
  4. Press Enter on another empty cell: same result.
- [ ] **First launch:** the storage notice shows. "Got it" hides it, and it stays hidden after a reload.
- [ ] **Play a City:** choose a City and place a few digits and Notes. After a reload, the City is restored as you left it.
- [ ] **Two tabs:** open a second tab. It says "Traveller Sudoku is open in another tab…" and its grid can't be changed.
- [ ] **Offline:** after one visit, go offline (DevTools → Network → Offline) and reload. The game loads, and a City and Free Play both work.
- [ ] **No errors:** the console shows no red errors.

## Safari: out of MVP scope (TS-53, after MVP; a Mac with Safari 17 or newer)

- [ ] **First launch, play a City and reload, two tabs, offline, no console errors:** the same checks as in the Firefox list, except the Space step, which only Firefox needs.
- [ ] **Add to Dock tip:**
  1. Open the game in a normal Safari window (not one already added to the Dock).
  2. On the storage notice, click "Got it".
  3. If Safari refuses persistent storage, this line appears: "Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it."
- [ ] **Added to the Dock:** File › Add to Dock works, and the game opens from the Dock with the Album intact. The icon is plain until TS-50.
- [ ] **Look and fonts:** the serif fonts and the postcard look match Chrome, and nothing overlaps at a normal window width.

## TS-47 Easy timing (TS-62)

- [ ] **One-minute Easy:** play two or three Easy (Near) Cities at a calm pace and time yourself. Each should take about one minute (about 20 empty cells). Note the times here: ______
  - **Pass:** each Easy City takes about 2 minutes or less. **If slower:** tell Claude, so `MIN_GIVENS` can be re-tuned before release.

## TS-47 Keyboard only (any browser, mouse unplugged or untouched)

- [ ] **Tab order on the Album:** nav → Region tabs → slots. A visible focus ring shows at every stop.
- [ ] **Choose a City:** press Enter on "Travel here". The grid takes focus.
- [ ] **Grid keys:** arrows move. 1–9 place a digit. N toggles Notes. M toggles number-first. Backspace clears. Ctrl+Z (Cmd+Z on a Mac) undoes.
- [ ] **Hint:** H opens the nudge. H again explains, and H again places the move. Esc sets the Hint aside.
- [ ] **Restart:** Restart opens its confirm, and Esc cancels it.
- [ ] **Postcard:** solving a City moves focus to "Add to Album", and Esc also adds it.
- [ ] **Viewer:** in the Album, Enter on a collected slot opens the viewer, and Esc closes it.
- [ ] **No traps:** focus never gets stuck, and nothing needs a mouse.

## TS-47 Screen reader (NVDA on Windows, free from nvaccess.org; or VoiceOver on a Mac)

- [ ] **Cells:** each grid cell reads its row, column and contents (for example "Row 3, column 5, 7").
- [ ] **Moves:** placing a digit, adding or removing a Note, clearing a cell and solving the Puzzle are each announced once.
- [ ] **Hints:** a Hint step is read out, and so is the move it places.
- [ ] **Banners:** each banner is readable. Only "Your last change couldn't be saved…" is announced by itself.

**Decision for Jessica (retro 1–3 item 9):** Undo, Restart, a refused Note (on a filled cell) and deselecting the current digit in number-first are currently **silent**. After hearing the game with NVDA, should they be announced?

- **Recommended: announce Undo and Restart** ("Undone", "Puzzle restarted").
- Leave the other two silent.
