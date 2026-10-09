import { cityById } from '../content/cities.ts'
import { cityPuzzle } from '../content/city-puzzles.ts'
import { award, cityKey, cityOfKey, isCollected, isReachable, pendingPostcard } from './journey.ts'
import { isPuzzle, makeCurrent, openSession, putSession, showPuzzle } from './reducer-shared.ts'
import { createSession, isUntouched } from './session.ts'
import type { AppState, Puzzle, Session } from './types.ts'

/**
 * The one place a Session's solve status is decided, after a step that changed
 * its digits (a digit placed, or `hintApplied`): solved when the digits are the
 * solution. The step that solves a City not yet in the Album also awards its
 * Postcard dated `date` (`journey.award`; Free Play awards nothing). Solving a
 * collected City (a replay) awards nothing and adds its key to `ui.solvedAgain`.
 * `reducer` has already refused such a step when `date` is malformed.
 */
export function settle(state: AppState, key: string, session: Session, date: string): AppState {
  const solved = session.digits === session.solution
  const next = putSession(state, key, { ...session, status: solved ? 'solved' : 'inProgress' })
  if (!solved || state.sessions[key]?.status === 'solved') return next
  // A replay of a collected City awards nothing (`album` stays the same reference): it is "Solved again".
  const city = cityOfKey(key)
  if (city && isCollected(state.album, city)) {
    if (next.ui.solvedAgain.includes(key)) return next
    return { ...next, ui: { ...next.ui, solvedAgain: [...next.ui.solvedAgain, key] } }
  }
  return award(next, key, date)
}

/**
 * The reveal gate: while any revealable Postcard (`journey.isRevealable`) waits, the
 * Puzzle screen shows the first one (oldest first) over its City's solved grid.
 * Its Session becomes current (a changed current Puzzle clears Undo and the
 * selection) and, if missing or not solved, is rebuilt solved from content.
 * Returns `state` itself when the gate is already showing it or nothing is
 * pending. Runs after every step and when the app starts; Story 3.5's launch
 * rule gives way to it.
 */
export function showPendingPostcard(state: AppState): AppState {
  const pending = pendingPostcard(state.album)
  if (!pending) return state
  const key = cityKey(pending.cityId)
  let next = state
  if (next.sessions[key]?.status !== 'solved') {
    // A revealable Postcard's City always has a well-formed Puzzle.
    const puzzle = cityPuzzle(pending.cityId)!
    const session: Session = { ...createSession(key, puzzle), digits: puzzle.solution, status: 'solved' }
    const hint = next.ui.hint?.sessionKey === key ? null : next.ui.hint
    next = { ...next, sessions: { ...next.sessions, [key]: session }, ui: { ...next.ui, hint } }
  }
  next = openSession(next, key)
  return next.ui.screen === 'puzzle' ? next : showPuzzle(next)
}

/**
 * "Add to Album" (or Esc) on the Postcard showing: it becomes revealed and joins
 * "just arrived". The next unrevealed Postcard shows (the gate), else the Album
 * opens on this City's Region with every Postcard seen. Only the first pending
 * Postcard can be added; any other id is the same state.
 */
export function addPostcard(state: AppState, cityId: string): AppState {
  const pending = pendingPostcard(state.album)
  if (!pending || pending.cityId !== cityId) return state
  const album = state.album.map((p) => (p === pending ? { ...p, revealed: true } : p))
  const justArrived = state.ui.justArrived.includes(cityId) ? state.ui.justArrived : [...state.ui.justArrived, cityId]
  const next: AppState = { ...state, album, ui: { ...state.ui, justArrived } }
  if (pendingPostcard(album)) return next
  const city = cityById(cityId)!
  return {
    ...next,
    ui: { ...next.ui, screen: 'album', albumRegion: city.region, albumSeen: album.length, restartConfirming: false },
  }
}

/**
 * A fresh Session `key` from `puzzle`, made current: Undo, selection, current
 * digit and Restart confirm cleared, and that Session's Hint closed. Other
 * Sessions and `meta.lastPlayedKey` are left alone; the screen is not changed.
 */
function freshCitySession(state: AppState, key: string, puzzle: Puzzle): AppState {
  const next = makeCurrent(state, key)
  const hint = state.ui.hint?.sessionKey === key ? null : state.ui.hint
  return { ...next, sessions: { ...state.sessions, [key]: createSession(key, puzzle) }, ui: { ...next.ui, hint } }
}

/**
 * An Album slot. A Reachable City with a Puzzle in progress opens as it was left
 * (the same Session). An uncollected City with no Session yet, or solved, gets a
 * fresh Session from its pre-built Puzzle (`freshCitySession`). A collected City
 * not in progress is the same state: a replay starts only from the viewer's
 * "Play again". Locked, unknown or Puzzle-less Cities: the same state. Other
 * Sessions are never touched. Never recorded in Undo. (`cityChosen` also closes
 * the Postcard viewer in every case.)
 */
export function chooseCity(state: AppState, cityId: string): AppState {
  const city = typeof cityId === 'string' ? cityById(cityId) : undefined
  if (!city || !isReachable(state.album, city)) return state
  const puzzle = cityPuzzle(city.id)
  if (!isPuzzle(puzzle)) return state
  const key = cityKey(city.id)
  if (state.sessions[key]?.status === 'inProgress') return showPuzzle(openSession(state, key))
  if (isCollected(state.album, city)) return state
  return showPuzzle(freshCitySession(state, key, puzzle))
}

/** Close the Postcard viewer; already closed is the same state. */
export function closeViewer(state: AppState): AppState {
  return state.ui.viewer === null ? state : { ...state, ui: { ...state.ui, viewer: null } }
}

/**
 * A Collected slot: open the viewer on the City's revealed Postcard (on the
 * Album). Uncollected, unrevealed or unknown Cities, or another screen: the same state.
 */
export function viewPostcard(state: AppState, cityId: string): AppState {
  if (state.ui.screen !== 'album' || typeof cityId !== 'string') return state
  const city = cityById(cityId)
  if (!city || !state.album.some((p) => p.cityId === city.id && p.revealed)) return state
  const viewer = state.ui.viewer
  if (viewer?.cityId === city.id && !viewer.confirming) return state
  return { ...state, ui: { ...state.ui, viewer: { cityId: city.id, confirming: false } } }
}

/**
 * "Play again" in the viewer. With a replay in progress the inline confirm
 * shows first, unless it is untouched (only the Givens, no Notes: nothing to
 * lose); otherwise a fresh replay starts. No viewer, or the confirm already
 * showing: the same state.
 */
export function requestReplay(state: AppState): AppState {
  const viewer = state.ui.viewer
  if (viewer === null || viewer.confirming) return state
  const session = state.sessions[cityKey(viewer.cityId)]
  if (session?.status === 'inProgress' && !isUntouched(session)) {
    return { ...state, ui: { ...state.ui, viewer: { ...viewer, confirming: true } } }
  }
  return freshReplay(state, viewer.cityId)
}

/**
 * Replay a collected City: a fresh Session from content opens on the Puzzle
 * screen (the viewer closes) and its key leaves `ui.solvedAgain`. The Album,
 * `meta.lastPlayedKey` and other Sessions are untouched.
 */
export function freshReplay(state: AppState, cityId: string): AppState {
  const puzzle = cityPuzzle(cityId)
  if (!isPuzzle(puzzle)) return state
  const key = cityKey(cityId)
  const next = showPuzzle(freshCitySession(state, key, puzzle))
  if (!next.ui.solvedAgain.includes(key)) return next
  return { ...next, ui: { ...next.ui, solvedAgain: next.ui.solvedAgain.filter((k) => k !== key) } }
}

/** "Keep going" in the replay confirm: the replay in progress opens as it was left. */
export function keepReplay(state: AppState): AppState {
  const viewer = state.ui.viewer
  if (!viewer?.confirming) return state
  const key = cityKey(viewer.cityId)
  if (state.sessions[key]?.status !== 'inProgress') return state
  return showPuzzle(openSession(state, key))
}
