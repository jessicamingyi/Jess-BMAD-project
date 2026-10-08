import type { BannerKind, UiState } from './types.ts'

/**
 * The notice banners, most important first. Only one shows at a time; the next
 * pending one appears once it is resolved or dismissed. Story 4.4 inserts the
 * storage notice and Add to Dock banners after `saveFailed`.
 */
export const BANNER_PRIORITY: readonly BannerKind[] = ['readOnly', 'saveFailed', 'unreadable']

export const isBannerKind = (v: unknown): v is BannerKind => v === 'readOnly' || v === 'saveFailed' || v === 'unreadable'

type BannerUi = Pick<UiState, 'readOnly' | 'saveFailed' | 'unreadableNotice' | 'dismissed'>

/** Whether `kind`'s condition holds (dismissed or not). */
function pending(ui: BannerUi, kind: BannerKind): boolean {
  switch (kind) {
    case 'readOnly':
      return ui.readOnly !== null
    case 'saveFailed':
      return ui.saveFailed
    case 'unreadable':
      return ui.unreadableNotice
  }
}

/** The one banner to show: the first pending, undismissed kind in `priority`, or null. Pure. */
export function visibleBanner(ui: BannerUi, priority: readonly BannerKind[] = BANNER_PRIORITY): BannerKind | null {
  return priority.find((kind) => pending(ui, kind) && !ui.dismissed.includes(kind)) ?? null
}
