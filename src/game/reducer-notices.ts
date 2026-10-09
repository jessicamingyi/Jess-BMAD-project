import { isBannerKind } from './banners.ts'
import type { Action, AppState } from './types.ts'

/** Hint is unavailable in a read-only tab (its move could never be saved). */
const READ_ONLY_REFUSED: ReadonlySet<Action['type']> = new Set(['hintRequested', 'hintApplied'])
/**
 * "Add to Album" still closes a pending reveal (which blocks the nav) in a read-only
 * tab: the Album changes in memory only, since a read-only tab never writes.
 */
const READ_ONLY_EXEMPT: ReadonlySet<Action['type']> = new Set(['postcardAdded'])

/**
 * The read-only guard: a read-only tab never changes a saved slice (`album`,
 * `sessions`, `settings`, `meta`), since that change could never be saved.
 * UI-only changes (opening an existing Puzzle, the viewer, screens) still apply.
 */
export function refusedReadOnly(prev: AppState, next: AppState, action: Action): boolean {
  if (next === prev) return false
  if (READ_ONLY_EXEMPT.has(action.type)) return false
  if (READ_ONLY_REFUSED.has(action.type)) return true
  return prev.album !== next.album || prev.sessions !== next.sessions || prev.settings !== next.settings || prev.meta !== next.meta
}

/**
 * Save outcomes, a waiting update, banner dismissals and the storage notice / persistence
 * answers: applied whatever else is going on (a pending Postcard, read-only). The last two
 * change `meta` only in a writable tab (a read-only tab never changes a saved slice).
 * Null for any other action.
 */
export function noticeAction(state: AppState, action: Action): AppState | null {
  const { ui } = state
  switch (action.type) {
    case 'saveFailed':
      return ui.saveFailed ? state : { ...state, ui: { ...ui, saveFailed: true } }
    case 'saveSucceeded': {
      // A later failure must show (and be announced) again, so its dismissal goes too.
      if (!ui.saveFailed && !ui.dismissed.includes('saveFailed')) return state
      return { ...state, ui: { ...ui, saveFailed: false, dismissed: ui.dismissed.filter((b) => b !== 'saveFailed') } }
    }
    case 'updateAvailable':
      return ui.updateReady ? state : { ...state, ui: { ...ui, updateReady: true } }
    case 'storageNoticeAcknowledged':
      // A read-only tab can't save the flag: "Got it" only hides the notice for this page.
      if (ui.readOnly !== null) {
        return ui.dismissed.includes('storageNotice') ? state : { ...state, ui: { ...ui, dismissed: [...ui.dismissed, 'storageNotice'] } }
      }
      return state.meta.seenStorageNotice ? state : { ...state, meta: { ...state.meta, seenStorageNotice: true } }
    case 'persistResolved':
      return resolvePersist(state, action.granted, action.safari)
    case 'bannerDismissed':
      if (!isBannerKind(action.banner) || ui.dismissed.includes(action.banner)) return state
      return { ...state, ui: { ...ui, dismissed: [...ui.dismissed, action.banner] } }
    default:
      return null
  }
}

/**
 * A persistent-storage answer: saved in `meta.persistGranted`. A grant clears the
 * Add to Dock tip; a Safari refusal shows it (again, if it was dismissed earlier).
 * A read-only tab never asks, and changes nothing.
 */
function resolvePersist(state: AppState, granted: boolean, safari: boolean): AppState {
  const { ui } = state
  if (ui.readOnly !== null) return state
  const meta = state.meta.persistGranted === granted ? state.meta : { ...state.meta, persistGranted: granted }
  let nextUi = ui
  if (granted && ui.addToDockPending) nextUi = { ...ui, addToDockPending: false }
  else if (!granted && safari && (!ui.addToDockPending || ui.dismissed.includes('addToDock'))) {
    nextUi = { ...ui, addToDockPending: true, dismissed: ui.dismissed.filter((b) => b !== 'addToDock') }
  }
  return meta === state.meta && nextUi === ui ? state : { ...state, meta, ui: nextUi }
}
