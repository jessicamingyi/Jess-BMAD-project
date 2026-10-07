import type { AppState, Puzzle, Session } from './types.ts'

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

export function createInitialState(puzzle: Puzzle): AppState {
  return {
    album: {},
    sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, puzzle) },
    settings: {},
    meta: { lastPlayedKey: null },
    ui: { selectedCell: null, entryMode: 'digit', inputMode: 'cellFirst', currentDigit: null },
  }
}
