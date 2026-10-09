import { isDifficulty, isPuzzle, makeCurrent, openSession, showPuzzle } from './reducer-shared.ts'
import { createSession, FREE_PLAY_KEY } from './session.ts'
import type { Action, AppState } from './types.ts'

/** Free Play entry "Carry on": the Free Play Puzzle becomes the current Puzzle and shows. */
export function resumeFreePlay(state: AppState): AppState {
  if (!state.sessions[FREE_PLAY_KEY]) return state
  if (state.ui.activeKey === FREE_PLAY_KEY && state.ui.screen === 'puzzle') return state
  return showPuzzle(openSession(state, FREE_PLAY_KEY))
}

/** Free Play entry and generator replies. Never recorded in Undo. */
export function freePlay(state: AppState, action: Action): AppState {
  const fp = state.ui.freePlay
  const session = state.sessions[FREE_PLAY_KEY]
  const withFreePlay = (next: Partial<typeof fp>): AppState => ({ ...state, ui: { ...state.ui, freePlay: { ...fp, ...next } } })
  switch (action.type) {
    case 'freePlayDifficultyPicked':
      if (!isDifficulty(action.difficulty) || fp.status === 'generating' || fp.picked === action.difficulty) return state
      return withFreePlay({ picked: action.difficulty, status: 'idle' })
    case 'freePlayRequested':
      if (!isDifficulty(action.difficulty) || !Number.isInteger(action.requestId)) return state
      return withFreePlay({
        picked: action.difficulty,
        requestId: action.requestId,
        status: 'generating',
        confirmingReplace: false,
      })
    case 'freePlayReplaceRequested':
      if (fp.confirmingReplace || fp.status === 'generating' || session?.status !== 'inProgress') return state
      return withFreePlay({ confirmingReplace: true })
    case 'freePlayReplaceCancelled':
      if (!fp.confirmingReplace) return state
      return withFreePlay({ confirmingReplace: false })
    case 'freePlayFailed':
      if (fp.status !== 'generating' || action.requestId !== fp.requestId) return state
      return withFreePlay({ status: 'failed' })
    case 'freePlayGenerated':
      return freePlayGenerated(state, action)
    default:
      return state
  }
}

/**
 * The latest generator reply. The new Puzzle replaces `sessions.free` and its
 * Difficulty is remembered, except when the player went back to the old Free
 * Play Puzzle (current, in progress, on the Puzzle screen): the reply is set
 * aside so the grid never swaps under them, and only the entry goes back to idle.
 * A City current away from the entry stays current; otherwise the new Puzzle
 * becomes current (opening only from the entry). Only a Free Play Hint closes.
 */
function freePlayGenerated(state: AppState, action: Extract<Action, { type: 'freePlayGenerated' }>): AppState {
  const fp = state.ui.freePlay
  if (fp.status !== 'generating' || action.requestId !== fp.requestId) return state
  if (!isPuzzle(action.puzzle)) return { ...state, ui: { ...state.ui, freePlay: { ...fp, status: 'failed' } } }
  const { activeKey, hint, screen } = state.ui
  if (activeKey === FREE_PLAY_KEY && screen === 'puzzle' && state.sessions[FREE_PLAY_KEY]?.status === 'inProgress') {
    // Held: one Free Play slot, and the player chose to keep playing it. "Start a new one" asks again.
    return { ...state, ui: { ...state.ui, freePlay: { ...fp, status: 'idle', confirmingReplace: false } } }
  }
  const { puzzle } = action
  const sessions = { ...state.sessions, [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, puzzle) }
  const settings = { ...state.settings, freePlayDifficulty: puzzle.difficulty }
  const freePlay = { ...fp, picked: puzzle.difficulty, status: 'idle' as const, confirmingReplace: false }
  // The replaced Session's Hint goes; another Session's Hint stays with it.
  const keptHint = hint?.sessionKey === FREE_PLAY_KEY ? null : hint
  if (activeKey !== null && activeKey !== FREE_PLAY_KEY && screen !== 'freePlay') {
    // A City is current and the player has left the entry: the City stays
    // current, with its Undo and Hint. Only the Free Play Puzzle is replaced;
    // it waits under Free Play → "Carry on". (Still on the entry: it opens, below.)
    return { ...state, sessions, settings, ui: { ...state.ui, freePlay, hint: keptHint } }
  }
  const current = makeCurrent(state, FREE_PLAY_KEY)
  return {
    ...current,
    sessions,
    settings,
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
    ui: {
      ...current.ui,
      // Open the Puzzle only if the player is still on the entry; elsewhere they stay put.
      screen: screen === 'freePlay' ? 'puzzle' : screen,
      freePlay,
      hint: keptHint,
    },
  }
}
