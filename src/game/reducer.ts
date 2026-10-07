import { FREE_PLAY_KEY } from './session.ts'
import type { Action, AppState } from './types.ts'

const isCell = (c: number) => Number.isInteger(c) && c >= 0 && c < 81
const isDigit = (d: number) => Number.isInteger(d) && d >= 1 && d <= 9

/**
 * The only way AppState changes. Pure: never mutates `state`, and returns
 * `state` itself when an action changes nothing.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'cellSelected': {
      if (!isCell(action.cell) || state.ui.selectedCell === action.cell) return state
      return { ...state, ui: { ...state.ui, selectedCell: action.cell } }
    }
    case 'digitEntered': {
      const session = state.sessions[FREE_PLAY_KEY]
      const cell = state.ui.selectedCell
      if (!session || cell === null || !isDigit(action.digit)) return state
      if (session.status === 'solved' || session.givens[cell] !== '0') return state

      const digit = String(action.digit)
      const next = session.digits[cell] === digit ? '0' : digit
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
    default:
      return state
  }
}
