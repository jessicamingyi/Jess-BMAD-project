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

/**
 * Every cell holds a digit but the grid isn't the solution ("Something doesn't
 * fit yet"). The Session stays `inProgress` with input live.
 */
export function isFullNotSolved(session: Session): boolean {
  return !session.digits.includes('0') && session.digits !== session.solution
}

/** Settings defaults (FR-20): Mistake Off, same digit On, row/column/box On, Lamplight Off. */
export const DEFAULT_SETTINGS: Settings = {
  mistakeHighlighting: false,
  sameDigitHighlighting: true,
  unitHighlighting: true,
  lamplight: false,
  freePlayDifficulty: null,
}

/**
 * The starting AppState. The app passes no Puzzle: `sessions` is empty and the
 * Free Play entry shows. Tests pass a fixture Puzzle to start on the Puzzle screen.
 */
export function createInitialState(puzzle?: Puzzle): AppState {
  return {
    album: {},
    sessions: puzzle ? { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, puzzle) } : {},
    settings: DEFAULT_SETTINGS,
    meta: { lastPlayedKey: null },
    ui: {
      screen: puzzle ? 'puzzle' : 'freePlay',
      selectedCell: null,
      entryMode: 'digit',
      inputMode: 'cellFirst',
      currentDigit: null,
      undo: [],
      restartConfirming: false,
      announcement: null,
      freePlay: { picked: 'easy', requestId: 0, status: 'idle', confirmingReplace: false },
      hint: null,
    },
  }
}
