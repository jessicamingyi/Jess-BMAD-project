import { toggleNote } from './notes.ts'
import { FREE_PLAY_KEY } from './session.ts'
import type { Action, AppState } from './types.ts'

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

/**
 * The only way AppState changes. Pure: never mutates `state`, and returns
 * `state` itself when an action changes nothing.
 */
export function reducer(state: AppState, action: Action): AppState {
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
