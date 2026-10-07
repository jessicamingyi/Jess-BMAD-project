import { toggleNote } from './notes.ts'
import { FREE_PLAY_KEY } from './session.ts'
import type { Action, AppState, UndoEntry } from './types.ts'

const isCell = (c: number) => Number.isInteger(c) && c >= 0 && c < 81
const isDigit = (d: number) => Number.isInteger(d) && d >= 1 && d <= 9

/**
 * Apply `digit` to `cell` in the current entry mode.
 * Digit: place, replace, or clear when the same digit is already there.
 * Notes: toggle Note `digit`, only in empty cells. Placing a digit hides Notes but keeps the mask.
 * Refused (same state) when solved or on a Given.
 */
export function applyDigit(state: AppState, cell: number, digit: number): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || !isCell(cell) || !isDigit(digit)) return state
  if (session.status === 'solved' || session.givens[cell] !== '0') return state

  if (state.ui.entryMode === 'notes') {
    if (session.digits[cell] !== '0') return state
    const notes = session.notes.slice()
    notes[cell] = toggleNote(notes[cell], digit)
    return {
      ...state,
      sessions: { ...state.sessions, [FREE_PLAY_KEY]: { ...session, notes } },
      meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
    }
  }

  const ch = String(digit)
  const next = session.digits[cell] === ch ? '0' : ch
  const digits = session.digits.slice(0, cell) + next + session.digits.slice(cell + 1)
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [FREE_PLAY_KEY]: {
        ...session,
        digits,
        status: digits === session.solution ? 'solved' : 'inProgress',
      },
    },
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
  }
}

function select(state: AppState, cell: number): AppState {
  if (state.ui.selectedCell === cell) return state
  return { ...state, ui: { ...state.ui, selectedCell: cell } }
}

const sameNotes = (a: readonly number[], b: readonly number[]) =>
  a === b || (a.length === b.length && a.every((m, i) => m === b[i]))

/**
 * Push the pre-change `{ digits, notes }` of `prev` onto `next.ui.undo` when the
 * grid changed, and close any open Restart confirm. ui-only changes and no-ops record nothing.
 */
function record(prev: AppState, next: AppState): AppState {
  if (next === prev) return next
  const before = prev.sessions[FREE_PLAY_KEY]
  const after = next.sessions[FREE_PLAY_KEY]
  if (!before || !after || before === after) return next
  if (before.digits === after.digits && sameNotes(before.notes, after.notes)) return next
  const entry: UndoEntry = { digits: before.digits, notes: before.notes }
  return { ...next, ui: { ...next.ui, undo: [...prev.ui.undo, entry], restartConfirming: false } }
}

function undo(state: AppState): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  const history = state.ui.undo
  if (!session || session.status === 'solved' || history.length === 0) return state
  const { digits, notes } = history[history.length - 1]
  return {
    ...state,
    sessions: { ...state.sessions, [FREE_PLAY_KEY]: { ...session, digits, notes, status: 'inProgress' } },
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
    ui: { ...state.ui, undo: history.slice(0, -1), restartConfirming: false },
  }
}

/** Clear to the Givens. Snapshots first (so one Undo brings everything back); clean grids record nothing. */
function restart(state: AppState): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || session.status === 'solved') return state
  const closed = state.ui.restartConfirming ? { ...state, ui: { ...state.ui, restartConfirming: false } } : state
  const clean = session.digits === session.givens && session.notes.every((m) => m === 0)
  if (clean) return closed
  return record(closed, {
    ...closed,
    sessions: {
      ...closed.sessions,
      [FREE_PLAY_KEY]: {
        ...session,
        digits: session.givens,
        notes: Array.from({ length: 81 }, () => 0),
        status: 'inProgress',
      },
    },
    meta: { ...closed.meta, lastPlayedKey: FREE_PLAY_KEY },
  })
}

function setRestartConfirming(state: AppState, open: boolean): AppState {
  if (state.ui.restartConfirming === open) return state
  // Opening is refused once solved; closing an already-open confirm is always allowed.
  if (open && state.sessions[FREE_PLAY_KEY]?.status === 'solved') return state
  return { ...state, ui: { ...state.ui, restartConfirming: open } }
}

/**
 * The only way AppState changes. Pure: never mutates `state`, and returns
 * `state` itself when an action changes nothing. Every change to the session's
 * digits or Notes is recorded in `ui.undo`.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'undoRequested':
      return undo(state)
    case 'restartRequested':
      return setRestartConfirming(state, true)
    case 'restartCancelled':
      return setRestartConfirming(state, false)
    case 'restartConfirmed':
      return restart(state)
    default:
      return record(state, step(state, action))
  }
}

/** Grid and mode actions; `reducer` records any grid change they make. */
function step(state: AppState, action: Action): AppState {
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
      return applyDigit(selected, action.cell, currentDigit)
    }
    case 'digitEntered': {
      if (!isDigit(action.digit)) return state
      if (state.ui.inputMode === 'numberFirst') {
        if (state.ui.currentDigit === action.digit) return state
        return { ...state, ui: { ...state.ui, currentDigit: action.digit } }
      }
      const cell = state.ui.selectedCell
      if (cell === null) return state
      return applyDigit(state, cell, action.digit)
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
    default:
      return state
  }
}
