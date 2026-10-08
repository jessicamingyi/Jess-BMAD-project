import { describe, expect, it } from 'vitest'
import { BANNER_PRIORITY, visibleBanner } from '../../src/game/banners.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { BannerKind, UiState } from '../../src/game/types.ts'

const ui = (patch: Partial<UiState> = {}): UiState => ({ ...createInitialState().ui, ...patch })
const PENDING: Record<BannerKind, Partial<UiState>> = {
  readOnly: { readOnly: 'otherTab' },
  saveFailed: { saveFailed: true },
  unreadable: { unreadableNotice: true },
  updateReady: { updateReady: true },
}

describe('visibleBanner', () => {
  it('shows nothing by default', () => {
    expect(visibleBanner(ui())).toBeNull()
  })

  it('priority: read-only > save failed > unreadable > update ready (lowest)', () => {
    expect(BANNER_PRIORITY).toEqual(['readOnly', 'saveFailed', 'unreadable', 'updateReady'])
  })

  it.each(BANNER_PRIORITY)('shows %s alone when it is the only one pending', (kind) => {
    expect(visibleBanner(ui(PENDING[kind]))).toBe(kind)
  })

  const pairs = BANNER_PRIORITY.flatMap((a, i) => BANNER_PRIORITY.slice(i + 1).map((b) => [a, b] as const))
  it.each(pairs)('%s outranks %s; dismissing it shows the other', (high, low) => {
    const both = ui({ ...PENDING[high], ...PENDING[low] })
    expect(visibleBanner(both)).toBe(high)
    expect(visibleBanner({ ...both, dismissed: [high] })).toBe(low)
    expect(visibleBanner({ ...both, dismissed: [high, low] })).toBeNull()
  })

  it('read-only reasons all show the read-only banner', () => {
    for (const readOnly of ['otherTab', 'newerVersion', 'storageUnavailable'] as const) {
      expect(visibleBanner(ui({ readOnly, saveFailed: true }))).toBe('readOnly')
    }
  })

  it('takes a priority list a later story can extend', () => {
    expect(visibleBanner(ui({ saveFailed: true, unreadableNotice: true }), ['unreadable', 'saveFailed'])).toBe('unreadable')
  })
})
