import { describe, expect, it } from 'vitest'
import { BANNER_PRIORITY, visibleBanner } from '../../src/game/banners.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState, BannerKind, Meta, UiState } from '../../src/game/types.ts'

type Patch = { ui?: Partial<UiState>; meta?: Partial<Meta> }

/** Nothing pending: the storage notice was acknowledged. */
const at = (...patches: Patch[]): Pick<AppState, 'ui' | 'meta'> => {
  const base = createInitialState()
  let ui: UiState = base.ui
  let meta: Meta = { ...base.meta, seenStorageNotice: true }
  for (const p of patches) {
    ui = { ...ui, ...p.ui }
    meta = { ...meta, ...p.meta }
  }
  return { ui, meta }
}
const dismissed = (s: Pick<AppState, 'ui' | 'meta'>, kinds: BannerKind[]) => ({ ...s, ui: { ...s.ui, dismissed: kinds } })

const PENDING: Record<BannerKind, Patch> = {
  readOnly: { ui: { readOnly: 'otherTab' } },
  saveFailed: { ui: { saveFailed: true } },
  unreadable: { ui: { unreadableNotice: true } },
  storageNotice: { meta: { seenStorageNotice: false } },
  addToDock: { ui: { addToDockPending: true } },
  updateReady: { ui: { updateReady: true } },
}

describe('visibleBanner', () => {
  it('shows nothing when nothing is pending', () => {
    expect(visibleBanner(at())).toBeNull()
  })

  it('shows the storage notice on a first visit', () => {
    expect(visibleBanner(createInitialState())).toBe('storageNotice')
  })

  it('priority (final): read-only > save failed > unreadable > storage notice > Add to Dock > update ready', () => {
    expect(BANNER_PRIORITY).toEqual(['readOnly', 'saveFailed', 'unreadable', 'storageNotice', 'addToDock', 'updateReady'])
  })

  it.each(BANNER_PRIORITY)('shows %s alone when it is the only one pending', (kind) => {
    expect(visibleBanner(at(PENDING[kind]))).toBe(kind)
  })

  const pairs = BANNER_PRIORITY.flatMap((a, i) => BANNER_PRIORITY.slice(i + 1).map((b) => [a, b] as const))
  it('covers every pair of the six kinds', () => {
    expect(pairs).toHaveLength(15)
  })
  it.each(pairs)('%s outranks %s; dismissing it shows the other', (high, low) => {
    const both = at(PENDING[high], PENDING[low])
    expect(visibleBanner(both)).toBe(high)
    expect(visibleBanner(dismissed(both, [high]))).toBe(low)
    expect(visibleBanner(dismissed(both, [high, low]))).toBeNull()
  })

  it('read-only reasons all show the read-only banner', () => {
    for (const readOnly of ['otherTab', 'newerVersion', 'storageUnavailable'] as const) {
      expect(visibleBanner(at({ ui: { readOnly, saveFailed: true } }))).toBe('readOnly')
    }
  })

  it('takes a priority list', () => {
    expect(visibleBanner(at({ ui: { saveFailed: true, unreadableNotice: true } }), ['unreadable', 'saveFailed'])).toBe('unreadable')
  })
})
