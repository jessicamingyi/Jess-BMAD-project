import type { AppState, Puzzle, Session, Settings } from './types.ts'

export const FREE_PLAY_KEY = 'free'

/** The current Puzzle: the Session under `ui.activeKey`, or null when there is none. */
export function activeSession(state: AppState): { readonly key: string; readonly session: Session } | null {
  const key = state.ui.activeKey
  if (key === null) return null
  const session = state.sessions[key]
  return session ? { key, session } : null
}

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

/** Nothing to lose: only the Givens, and no Notes anywhere. */
export function isUntouched(session: Session): boolean {
  return session.digits === session.givens && session.notes.every((m) => m === 0)
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
 * The starting AppState. The app passes no Puzzle: `sessions` and the Album are
 * empty and the Album shows ("Where to first?"). Tests pass a fixture Puzzle to
 * start on the Puzzle screen with it as the current Free Play Puzzle.
 */
export function createInitialState(puzzle?: Puzzle): AppState {
  return {
    album: [],
    sessions: puzzle ? { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, puzzle) } : {},
    settings: DEFAULT_SETTINGS,
    meta: { lastPlayedKey: null, seenStorageNotice: false, persistGranted: null },
    ui: {
      screen: puzzle ? 'puzzle' : 'album',
      activeKey: puzzle ? FREE_PLAY_KEY : null,
      albumRegion: 'europe',
      albumSeen: 0,
      selectedCell: null,
      entryMode: 'digit',
      inputMode: 'cellFirst',
      currentDigit: null,
      undo: [],
      restartConfirming: false,
      announcement: null,
      freePlay: { picked: 'easy', requestId: 0, status: 'idle', confirmingReplace: false },
      hint: null,
      justArrived: [],
      viewer: null,
      solvedAgain: [],
      readOnly: null,
      savingOff: false,
      saveFailed: false,
      unreadableNotice: false,
      updateReady: false,
      addToDockPending: false,
      dismissed: [],
    },
  }
}
