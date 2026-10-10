import type { AppState, BannerKind } from './types.ts'

/**
 * The notice banners, most important first. Only one shows at a time; the next
 * pending one appears once it is resolved or dismissed. Saving off comes right after
 * read-only. Unreadable outranks the storage notice (it explains an empty Album); a
 * waiting update is the lowest.
 */
export const BANNER_PRIORITY: readonly BannerKind[] = ['readOnly', 'savingOff', 'saveFailed', 'unreadable', 'storageNotice', 'addToDock', 'updateReady']

export const isBannerKind = (v: unknown): v is BannerKind => BANNER_PRIORITY.includes(v as BannerKind)

type BannerState = {
  readonly ui: Pick<AppState['ui'], 'readOnly' | 'savingOff' | 'saveFailed' | 'unreadableNotice' | 'addToDockPending' | 'updateReady' | 'dismissed'>
  readonly meta: Pick<AppState['meta'], 'seenStorageNotice'>
}

/**
 * Whether `kind`'s condition holds (dismissed or not). Saving off never shows on a
 * read-only tab (its "keep playing" would sit over an inert grid). While saving is off
 * the storage notice and the Add to Dock tip never show: both promise saving.
 */
function pending({ ui, meta }: BannerState, kind: BannerKind): boolean {
  switch (kind) {
    case 'readOnly':
      return ui.readOnly !== null
    case 'savingOff':
      return ui.readOnly === null && ui.savingOff
    case 'saveFailed':
      return ui.saveFailed
    case 'unreadable':
      return ui.unreadableNotice
    case 'storageNotice':
      return !ui.savingOff && !meta.seenStorageNotice
    case 'addToDock':
      return !ui.savingOff && ui.addToDockPending
    case 'updateReady':
      return ui.updateReady
  }
}

/** The one banner to show: the first pending, undismissed kind in `priority`, or null. Pure. */
export function visibleBanner(state: BannerState, priority: readonly BannerKind[] = BANNER_PRIORITY): BannerKind | null {
  return priority.find((kind) => pending(state, kind) && !state.ui.dismissed.includes(kind)) ?? null
}
