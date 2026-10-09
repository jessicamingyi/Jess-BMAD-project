import type { AppState, Difficulty, Puzzle, Screen, Session } from './types.ts'

/* Helpers every reducer area uses: action validators, writing a Session back, changing the current Puzzle. */

export const isCell = (c: number) => Number.isInteger(c) && c >= 0 && c < 81
export const isDigit = (d: number) => Number.isInteger(d) && d >= 1 && d <= 9
export const isDifficulty = (d: unknown): d is Difficulty => d === 'easy' || d === 'medium' || d === 'hard'
export const isScreen = (s: unknown): s is Screen => s === 'puzzle' || s === 'album' || s === 'freePlay' || s === 'settings'
const isGridString = (s: unknown) => typeof s === 'string' && /^[0-9]{81}$/.test(s)
export const isPuzzle = (p: Puzzle | undefined): p is Puzzle =>
  !!p && isGridString(p.givens) && isGridString(p.solution) && isDifficulty(p.difficulty)

/** Write `session` back under `key` as the last-played Session. */
export function putSession(state: AppState, key: string, session: Session): AppState {
  return {
    ...state,
    sessions: { ...state.sessions, [key]: session },
    meta: { ...state.meta, lastPlayedKey: key },
  }
}

/**
 * Make Session `key` the current Puzzle from scratch: Undo emptied, and the
 * selection, current digit and any Restart confirm cleared. Touches nothing else.
 */
export function makeCurrent(state: AppState, key: string): AppState {
  return {
    ...state,
    ui: { ...state.ui, activeKey: key, undo: [], selectedCell: null, currentDigit: null, restartConfirming: false },
  }
}

/**
 * Make Session `key` the current Puzzle. Changing the current Puzzle clears the
 * Undo history, the selection, the current digit and any Restart confirm;
 * returning to the same Puzzle keeps them. Never touches `meta.lastPlayedKey`.
 */
export function openSession(state: AppState, key: string): AppState {
  return state.ui.activeKey === key ? state : makeCurrent(state, key)
}

/**
 * Show the Puzzle screen, closing any open confirm or Postcard viewer and ending
 * the Album visit (as any screen change does).
 */
export function showPuzzle(state: AppState): AppState {
  const fp = state.ui.freePlay
  return {
    ...state,
    ui: {
      ...state.ui,
      screen: 'puzzle',
      restartConfirming: false,
      viewer: null,
      justArrived: state.ui.justArrived.length === 0 ? state.ui.justArrived : [],
      freePlay: fp.confirmingReplace ? { ...fp, confirmingReplace: false } : fp,
    },
  }
}
