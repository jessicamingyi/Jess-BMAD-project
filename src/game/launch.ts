import { CITIES } from '../content/cities.ts'
import { cityKey, cityOfKey, openingRegion } from './journey.ts'
import { FREE_PLAY_KEY } from './session.ts'
import type { AppState } from './types.ts'

/** A Session key a Puzzle can open on: Free Play, or a City in the catalogue. */
export function isPuzzleKey(key: string | null): boolean {
  return key === FREE_PLAY_KEY || cityOfKey(key) !== undefined
}

function inProgress(state: AppState, key: string): boolean {
  return isPuzzleKey(key) && state.sessions[key]?.status === 'inProgress'
}

/**
 * The launch rule (Story 3.5): the screen the app opens on, a pure function of
 * `AppState` and the catalogue. In order:
 *
 * 1. `meta.lastPlayedKey`, if its Session is `inProgress` and the key is valid;
 * 2. else the first `inProgress` City Session in catalogue (`CITIES`) order;
 * 3. else the Free Play Session, if `inProgress`;
 * 4. else the Album on `openingRegion(album)`, with the `lastPlayedKey` Session
 *    (if it exists and its key is valid) as the current Puzzle, else none.
 *
 * Opening a Puzzle deliberately leaves `ui.albumRegion` and `ui.albumSeen` alone,
 * so the first Album visit opens on the latest Postcard's Region.
 *
 * Only `ui.screen`, `ui.activeKey`, `ui.albumRegion` and `ui.albumSeen` change;
 * `album`, `sessions` and `meta` are untouched. An unrevealed Postcard still
 * wins: the app applies `showPendingPostcard` to the result afterwards.
 */
export function launch(state: AppState): AppState {
  const last = state.meta.lastPlayedKey
  const key = last !== null && inProgress(state, last)
    ? last
    : (CITIES.map((c) => cityKey(c.id)).find((k) => inProgress(state, k)) ??
      (inProgress(state, FREE_PLAY_KEY) ? FREE_PLAY_KEY : null))

  if (key !== null) return { ...state, ui: { ...state.ui, screen: 'puzzle', activeKey: key } }

  const activeKey = last !== null && isPuzzleKey(last) && state.sessions[last] !== undefined ? last : null
  return {
    ...state,
    ui: {
      ...state.ui,
      screen: 'album',
      activeKey,
      albumRegion: openingRegion(state.album),
      albumSeen: state.album.length,
    },
  }
}
