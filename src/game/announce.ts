import { copy } from '../content/copy.ts'
import { hasNote } from './notes.ts'
import { reducer } from './reducer.ts'
import { FREE_PLAY_KEY } from './session.ts'
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
 * mode names, "current digit 7" (number-first) and "Solved".
 */
export function announce(prev: AppState, next: AppState, action: Action): string | null {
  const before = prev.sessions[FREE_PLAY_KEY]
  const after = next.sessions[FREE_PLAY_KEY]
  if (!before || !after) return null
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
    return after.digits[cell] === '0' ? copy.announceCleared : copy.announceDigit(digit)
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
