import type { AppState, Puzzle, Session, Settings } from './types.ts'

export const FREE_PLAY_KEY = 'free'

export function createSession(key: string, puzzle: Puzzle): Session {
  return {
    key,
    givens: puzzle.givens,
    solution: puzzle.solution,
    digits: puzzle.givens,
    notes: Array.from({ length: 81 }, () => 0),
    status: 'inProgress',
    difficulty: puzzle.difficulty,
    hintsUsed: 0,
  }
}

/** Settings defaults (FR-20): Mistake Off, same digit On, row/column/box On, Lamplight Off. */
export const DEFAULT_SETTINGS: Settings = {
  mistakeHighlighting: false,
  sameDigitHighlighting: true,
  unitHighlighting: true,
  lamplight: false,
}

export function createInitialState(puzzle: Puzzle): AppState {
  return {
    album: {},
    sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, puzzle) },
    settings: DEFAULT_SETTINGS,
    meta: { lastPlayedKey: null },
    ui: {
      screen: 'puzzle',
      selectedCell: null,
      entryMode: 'digit',
      inputMode: 'cellFirst',
      currentDigit: null,
      undo: [],
      restartConfirming: false,
      announcement: null,
    },
  }
}
