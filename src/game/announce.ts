import { copy } from '../content/copy.ts'
import { colOf, rowOf } from '../engine/grid.ts'
import { activeHint, hintMove, hintView } from './hint.ts'
import { hasNote } from './notes.ts'
import { reducer } from './reducer.ts'
import { isFullNotSolved } from './session.ts'
import type { Action, AppState } from './types.ts'

/** The cell and digit an action tries to apply (null when it applies none). */
function digitTarget(prev: AppState, action: Action): { cell: number; digit: number } | null {
  const { inputMode, selectedCell, currentDigit } = prev.ui
  switch (action.type) {
    case 'digitEntered':
      return inputMode === 'cellFirst' && selectedCell !== null ? { cell: selectedCell, digit: action.digit } : null
    case 'cellClicked':
      return inputMode === 'numberFirst' && currentDigit !== null ? { cell: action.cell, digit: currentDigit } : null
    case 'currentDigitPlaced':
      return inputMode === 'numberFirst' && currentDigit !== null && selectedCell !== null
        ? { cell: selectedCell, digit: currentDigit }
        : null
    default:
      return null
  }
}

/**
 * The screen-reader message for `action` taking `prev` to `next`, or null for silence.
 * Pure. "7" / "cleared" for digits, "note 7 added|removed", "Given, can't change",
 * mode names, "current digit 7" (number-first), "Solved", and the Hint's nudge
 * or explanation text when `hintRequested` moves it to that step, and for
 * `hintApplied` the placement ("7 placed, row 4, column 4", with ". Solved" if it
 * solves) or a Mistake clear ("row 4, column 6 cleared"). When a digit fills the
 * last empty cell and the grid isn't the solution, the digit message gains the
 * cue once: "7. Something doesn't fit yet — want a hint?".
 */
export function announce(prev: AppState, next: AppState, action: Action): string | null {
  // Only the current Puzzle speaks; opening or switching Puzzles is silent.
  const key = prev.ui.activeKey
  if (key === null || next.ui.activeKey !== key) return null
  const before = prev.sessions[key]
  const after = next.sessions[key]
  if (!before || !after) return null
  // A Hint move says its placement, and the solve in the same message.
  if (action.type === 'hintApplied') {
    const move = hintMove(activeHint(prev, key))
    if (!move || before.digits === after.digits) return null
    if (move.digit === 0) return copy.announceHintCleared(rowOf(move.cell) + 1, colOf(move.cell) + 1)
    const solved = before.status !== 'solved' && after.status === 'solved'
    return copy.announceHintPlaced(move.digit, rowOf(move.cell) + 1, colOf(move.cell) + 1, solved)
  }
  if (before.status !== 'solved' && after.status === 'solved') return copy.announceSolved

  switch (action.type) {
    case 'entryModeChosen':
    case 'entryModeToggled':
      if (prev.ui.entryMode === next.ui.entryMode) return null
      return next.ui.entryMode === 'notes' ? copy.entryNotes : copy.entryDigit
    case 'inputModeChosen':
    case 'inputModeToggled':
      if (prev.ui.inputMode === next.ui.inputMode) return null
      return next.ui.inputMode === 'numberFirst' ? copy.statusNumberFirst : copy.statusCellFirst
    case 'hintRequested': {
      const hint = activeHint(next, key)
      if (!hint || hint.step === 'idle' || hint.step === activeHint(prev, key)?.step) return null
      return hintView(hint, after.digits).text
    }
    case 'cellCleared': {
      const cell = prev.ui.selectedCell
      if (cell === null || before.status === 'solved') return null
      if (before.givens[cell] !== '0') return copy.announceGiven
      return before === after ? null : copy.announceCleared
    }
    case 'digitEntered':
      if (prev.ui.inputMode === 'numberFirst') {
        const d = next.ui.currentDigit
        return d !== null && d !== prev.ui.currentDigit ? copy.announceCurrentDigit(d) : null
      }
      break
    default:
      break
  }

  const target = digitTarget(prev, action)
  if (!target || before.status === 'solved') return null
  const { cell, digit } = target
  if (before.givens[cell] !== '0') return copy.announceGiven
  if (before.digits[cell] !== after.digits[cell]) {
    if (after.digits[cell] === '0') return copy.announceCleared
    // The grid just filled up wrong: say so once, with the digit.
    if (!isFullNotSolved(before) && isFullNotSolved(after)) return copy.announceDigitFullNotSolved(digit)
    return copy.announceDigit(digit)
  }
  if (before.notes[cell] !== after.notes[cell]) {
    return hasNote(after.notes[cell], digit) ? copy.announceNoteAdded(digit) : copy.announceNoteRemoved(digit)
  }
  return null
}

/**
 * `reducer`, then the announcement for the change in `ui.announcement` with the
 * next `seq`. Silent actions return the reducer's result untouched (so no-ops
 * still return `state` itself). Announcements never touch `ui.undo`.
 */
export function withAnnouncement(state: AppState, action: Action): AppState {
  const next = reducer(state, action)
  const text = announce(state, next, action)
  if (text === null) return next
  const seq = (state.ui.announcement?.seq ?? 0) + 1
  return { ...next, ui: { ...next.ui, announcement: { text, seq } } }
}
