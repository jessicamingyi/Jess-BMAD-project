import { activeHint, hintMove } from './hint.ts'
import { cityOfKey, isCollected, isDateString } from './journey.ts'
import { toggleNote } from './notes.ts'
import { settle } from './reducer-journey.ts'
import { isCell, isDigit, putSession } from './reducer-shared.ts'
import { activeSession, isUntouched } from './session.ts'
import type { Action, AppState, UndoEntry } from './types.ts'

/** The actions that can complete a solution; each carries the shell's date. */
export const SOLVING_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'digitEntered',
  'cellClicked',
  'currentDigitPlaced',
  'hintApplied',
])

/** The cell and digit a solving action would place in the current Puzzle, or null when it places none. */
function placement(state: AppState, action: Action): { cell: number; digit: number } | null {
  const { inputMode, entryMode, selectedCell, currentDigit } = state.ui
  const digitMode = entryMode === 'digit'
  switch (action.type) {
    case 'digitEntered':
      return digitMode && inputMode === 'cellFirst' && selectedCell !== null ? { cell: selectedCell, digit: action.digit } : null
    case 'cellClicked':
      return digitMode && inputMode === 'numberFirst' && currentDigit !== null ? { cell: action.cell, digit: currentDigit } : null
    case 'currentDigitPlaced':
      return digitMode && inputMode === 'numberFirst' && currentDigit !== null && selectedCell !== null
        ? { cell: selectedCell, digit: currentDigit }
        : null
    case 'hintApplied': {
      const key = state.ui.activeKey
      return key === null ? null : hintMove(activeHint(state, key))
    }
    default:
      return null
  }
}

/**
 * A solving action with a malformed date that would complete a City not yet in
 * the Album (and so award its Postcard): refused whole. Any other move with a
 * bad date goes ahead, as it awards nothing.
 */
export function refusedForDate(state: AppState, action: Action): boolean {
  if (!SOLVING_ACTIONS.has(action.type) || isDateString((action as { date?: unknown }).date)) return false
  const active = activeSession(state)
  const city = cityOfKey(active?.key ?? null)
  if (!active || !city || active.session.status === 'solved' || isCollected(state.album, city)) return false
  const target = placement(state, action)
  if (!target || !isCell(target.cell) || !isDigit(target.digit)) return false
  const { digits, givens, solution } = active.session
  if (givens[target.cell] !== '0') return false
  return digits.slice(0, target.cell) + String(target.digit) + digits.slice(target.cell + 1) === solution
}

/**
 * Apply `digit` to `cell` of the current Puzzle in the current entry mode.
 * Digit: place, replace, or clear when the same digit is already there.
 * Notes: toggle Note `digit`, only in empty cells. Placing a digit hides Notes but keeps the mask.
 * Refused (same state) with no current Puzzle, when solved or on a Given.
 */
export function applyDigit(state: AppState, cell: number, digit: number, date: string): AppState {
  const active = activeSession(state)
  if (!active || !isCell(cell) || !isDigit(digit)) return state
  const { key, session } = active
  if (session.status === 'solved' || session.givens[cell] !== '0') return state

  if (state.ui.entryMode === 'notes') {
    if (session.digits[cell] !== '0') return state
    const notes = session.notes.slice()
    notes[cell] = toggleNote(notes[cell], digit)
    return putSession(state, key, { ...session, notes })
  }

  const ch = String(digit)
  const next = session.digits[cell] === ch ? '0' : ch
  const digits = session.digits.slice(0, cell) + next + session.digits.slice(cell + 1)
  return settle(state, key, { ...session, digits }, date)
}

/**
 * Clear `cell`: a player digit becomes empty (its hidden Notes show again); an
 * empty cell loses its Notes. Refused (same state) on a Given, when solved, or
 * when there is nothing to clear.
 */
export function clearCell(state: AppState, cell: number): AppState {
  const active = activeSession(state)
  if (!active || !isCell(cell)) return state
  const { key, session } = active
  if (session.status === 'solved' || session.givens[cell] !== '0') return state
  if (session.digits[cell] !== '0') {
    const digits = session.digits.slice(0, cell) + '0' + session.digits.slice(cell + 1)
    return putSession(state, key, { ...session, digits })
  }
  if (session.notes[cell] === 0) return state
  const notes = session.notes.slice()
  notes[cell] = 0
  return putSession(state, key, { ...session, notes })
}

function select(state: AppState, cell: number): AppState {
  if (state.ui.selectedCell === cell) return state
  return { ...state, ui: { ...state.ui, selectedCell: cell } }
}

const sameNotes = (a: readonly number[], b: readonly number[]) =>
  a === b || (a.length === b.length && a.every((m, i) => m === b[i]))

/**
 * Push the pre-change `{ digits, notes }` of the current Puzzle in `prev` onto
 * `next.ui.undo` when its grid changed, and close any open Restart confirm.
 * ui-only changes, no-ops and changes of the current Puzzle record nothing.
 */
export function record(prev: AppState, next: AppState): AppState {
  if (next === prev) return next
  const key = prev.ui.activeKey
  if (key === null || next.ui.activeKey !== key) return next
  const before = prev.sessions[key]
  const after = next.sessions[key]
  if (!before || !after || before === after) return next
  if (before.digits === after.digits && sameNotes(before.notes, after.notes)) return next
  const entry: UndoEntry = { digits: before.digits, notes: before.notes }
  return { ...next, ui: { ...next.ui, undo: [...prev.ui.undo, entry], restartConfirming: false } }
}

export function undo(state: AppState): AppState {
  const active = activeSession(state)
  const history = state.ui.undo
  if (!active || active.session.status === 'solved' || history.length === 0) return state
  const { digits, notes } = history[history.length - 1]
  const next = putSession(state, active.key, { ...active.session, digits, notes, status: 'inProgress' })
  return { ...next, ui: { ...state.ui, undo: history.slice(0, -1), restartConfirming: false } }
}

/** Clear to the Givens. Snapshots first (so one Undo brings everything back); clean grids record nothing. */
export function restart(state: AppState): AppState {
  const active = activeSession(state)
  if (!active || active.session.status === 'solved') return state
  const { key, session } = active
  const closed = state.ui.restartConfirming ? { ...state, ui: { ...state.ui, restartConfirming: false } } : state
  if (isUntouched(session)) return closed
  return record(
    closed,
    putSession(closed, key, {
      ...session,
      digits: session.givens,
      notes: Array.from({ length: 81 }, () => 0),
      status: 'inProgress',
    }),
  )
}

export function setRestartConfirming(state: AppState, open: boolean): AppState {
  if (state.ui.restartConfirming === open) return state
  // Opening is refused once solved; closing an already-open confirm is always allowed.
  if (open && activeSession(state)?.session.status === 'solved') return state
  return { ...state, ui: { ...state.ui, restartConfirming: open } }
}

/** Grid and mode actions; `reducer` records any grid change they make. */
export function step(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'cellSelected': {
      if (!isCell(action.cell)) return state
      return select(state, action.cell)
    }
    case 'cellClicked': {
      if (!isCell(action.cell)) return state
      const selected = select(state, action.cell)
      const { inputMode, currentDigit } = selected.ui
      if (inputMode !== 'numberFirst' || currentDigit === null) return selected
      return applyDigit(selected, action.cell, currentDigit, action.date)
    }
    case 'digitEntered': {
      if (!isDigit(action.digit)) return state
      if (state.ui.inputMode === 'numberFirst') {
        if (state.ui.currentDigit === action.digit) return state
        return { ...state, ui: { ...state.ui, currentDigit: action.digit } }
      }
      const cell = state.ui.selectedCell
      if (cell === null) return state
      return applyDigit(state, cell, action.digit, action.date)
    }
    case 'entryModeChosen': {
      if (action.mode !== 'digit' && action.mode !== 'notes') return state
      if (state.ui.entryMode === action.mode) return state
      return { ...state, ui: { ...state.ui, entryMode: action.mode } }
    }
    case 'inputModeChosen': {
      if (action.mode !== 'cellFirst' && action.mode !== 'numberFirst') return state
      if (state.ui.inputMode === action.mode) return state
      return { ...state, ui: { ...state.ui, inputMode: action.mode } }
    }
    case 'inputModeToggled': {
      const inputMode = state.ui.inputMode === 'cellFirst' ? 'numberFirst' : 'cellFirst'
      return { ...state, ui: { ...state.ui, inputMode } }
    }
    case 'entryModeToggled': {
      const entryMode = state.ui.entryMode === 'digit' ? 'notes' : 'digit'
      return { ...state, ui: { ...state.ui, entryMode } }
    }
    case 'cellCleared': {
      const cell = state.ui.selectedCell
      if (cell === null) return state
      return clearCell(state, cell)
    }
    case 'settingToggled': {
      const { setting } = action
      if (!Object.hasOwn(state.settings, setting) || typeof state.settings[setting] !== 'boolean') return state
      return { ...state, settings: { ...state.settings, [setting]: !state.settings[setting] } }
    }
    case 'currentDigitPlaced': {
      const { inputMode, currentDigit, selectedCell } = state.ui
      if (inputMode !== 'numberFirst' || currentDigit === null || selectedCell === null) return state
      return applyDigit(state, selectedCell, currentDigit, action.date)
    }
    default:
      return state
  }
}
