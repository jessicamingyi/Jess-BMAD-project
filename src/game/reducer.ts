import { isRegion, openingRegion, pendingPostcard } from './journey.ts'
import { freePlay, resumeFreePlay } from './reducer-free-play.ts'
import { record, refusedForDate, restart, setRestartConfirming, step, undo } from './reducer-grid.ts'
import { applyHint, requestHint, resetHintOnDigits, setDefinitionOpen } from './reducer-hint.ts'
import { addPostcard, chooseCity, closeViewer, freshReplay, keepReplay, requestReplay, showPendingPostcard, viewPostcard } from './reducer-journey.ts'
import { noticeAction, refusedReadOnly } from './reducer-notices.ts'
import { isScreen } from './reducer-shared.ts'
import { activeSession } from './session.ts'
import type { Action, AppState, Screen } from './types.ts'

/*
 * The reducer's entry point and action router. Each area lives in a sibling
 * module: grid (`reducer-grid`), Hint (`reducer-hint`), journey and replay
 * (`reducer-journey`), Free Play (`reducer-free-play`), notices and the
 * read-only guard (`reducer-notices`), shared helpers (`reducer-shared`).
 */
export { applyDigit, clearCell, SOLVING_ACTIONS } from './reducer-grid.ts'
export { showPendingPostcard } from './reducer-journey.ts'

/**
 * The only way AppState changes. Pure: never mutates `state`, and returns
 * `state` itself when an action changes nothing. Every change to the current
 * Puzzle's digits or Notes is recorded in `ui.undo`. Any change to the digits of
 * the Session an open Hint belongs to sets that Hint back to idle in the same step.
 * A read-only tab (`ui.readOnly`) refuses any change to a saved slice, and Hint.
 */
export function reducer(state: AppState, action: Action): AppState {
  const notices = noticeAction(state, action)
  if (notices) return notices
  // While a Postcard waits to be revealed, only "Add to Album" and generator replies get through.
  if (pendingPostcard(state.album) && !UNBLOCKED.has(action.type)) return state
  if (refusedForDate(state, action)) return state
  const next = showPendingPostcard(resetHintOnDigits(state, reduce(state, action)))
  if (state.ui.readOnly === null || !refusedReadOnly(state, next, action)) return next
  // A refused Free Play reply still ends the wait (UI only), so the entry never sticks on "generating".
  if (action.type === 'freePlayGenerated' && next.ui.freePlay !== state.ui.freePlay) {
    return { ...state, ui: { ...state.ui, freePlay: { ...state.ui.freePlay, status: 'idle', confirmingReplace: false } } }
  }
  return state
}

const UNBLOCKED: ReadonlySet<Action['type']> = new Set(['postcardAdded', 'freePlayGenerated', 'freePlayFailed'])

function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hintRequested':
      return requestHint(state)
    case 'hintApplied':
      return record(state, applyHint(state, action.date))
    case 'postcardAdded':
      return addPostcard(state, action.cityId)
    case 'hintClosed':
      return state.ui.hint === null ? state : { ...state, ui: { ...state.ui, hint: null } }
    case 'techniqueDefinitionOpened':
      return setDefinitionOpen(state, true)
    case 'techniqueDefinitionClosed':
      return setDefinitionOpen(state, false)
    case 'undoRequested':
      return undo(state)
    case 'restartRequested':
      return setRestartConfirming(state, true)
    case 'restartCancelled':
      return setRestartConfirming(state, false)
    case 'restartConfirmed':
      return restart(state)
    case 'screenChosen':
      return chooseScreen(state, action.screen)
    case 'cityChosen':
      return closeViewer(chooseCity(state, action.cityId))
    case 'albumRegionChosen':
      if (!isRegion(action.region) || state.ui.albumRegion === action.region) return state
      return { ...state, ui: { ...state.ui, albumRegion: action.region, viewer: null } }
    case 'postcardViewed':
      return viewPostcard(state, action.cityId)
    case 'postcardViewerClosed':
      return closeViewer(state)
    case 'replayRequested':
      return requestReplay(state)
    case 'replayConfirmed':
      return state.ui.viewer?.confirming ? freshReplay(state, state.ui.viewer.cityId) : state
    case 'replayKept':
      return keepReplay(state)
    case 'freePlayResumed':
      return resumeFreePlay(state)
    case 'freePlayDifficultyPicked':
    case 'freePlayRequested':
    case 'freePlayReplaceRequested':
    case 'freePlayReplaceCancelled':
    case 'freePlayGenerated':
    case 'freePlayFailed':
      return freePlay(state, action)
    default:
      return record(state, step(state, action))
  }
}

/**
 * Switch screens. Leaving or entering a screen closes any open Restart or
 * replace confirm. The Puzzle screen needs a current Puzzle. The Album keeps its
 * Region tab, or opens on the latest Postcard's Region when one is new since the last visit. Opening the Free Play entry
 * seeds the picker from the last Free Play Difficulty (unless a request is pending).
 */
function chooseScreen(state: AppState, screen: Screen): AppState {
  if (!isScreen(screen) || state.ui.screen === screen) return state
  if (screen === 'puzzle' && !activeSession(state)) return state
  // The Album keeps its Region tab, unless a Postcard arrived since the last visit:
  // then it opens on the latest Postcard's Region.
  const newPostcard = screen === 'album' && state.album.length > state.ui.albumSeen
  const albumRegion = newPostcard ? openingRegion(state.album) : state.ui.albumRegion
  const albumSeen = screen === 'album' ? state.album.length : state.ui.albumSeen
  const fp = state.ui.freePlay
  const entering = screen === 'freePlay' && fp.status !== 'generating'
  const picked = entering ? (state.settings.freePlayDifficulty ?? 'easy') : fp.picked
  // Re-entering the entry clears an old failure line.
  const status = entering && fp.status === 'failed' ? 'idle' : fp.status
  const unchanged = fp.picked === picked && fp.status === status && !fp.confirmingReplace
  return {
    ...state,
    ui: {
      ...state.ui,
      screen,
      albumRegion,
      albumSeen,
      // Any screen change ends the Album visit the marks belong to: "just arrived" goes.
      justArrived: [],
      restartConfirming: false,
      viewer: null,
      freePlay: unchanged ? fp : { ...fp, picked, status, confirmingReplace: false },
    },
  }
}
