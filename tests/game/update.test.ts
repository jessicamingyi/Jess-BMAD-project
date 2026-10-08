import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { visibleBanner } from '../../src/game/banners.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'

const fresh = (): AppState => createInitialState(samplePuzzle)

describe('updateAvailable', () => {
  it('starts false and sets ui.updateReady, changing no saved slice', () => {
    const s = fresh()
    expect(s.ui.updateReady).toBe(false)
    const next = reducer(s, { type: 'updateAvailable' })
    expect(next.ui.updateReady).toBe(true)
    expect(next.album).toBe(s.album)
    expect(next.sessions).toBe(s.sessions)
    expect(next.settings).toBe(s.settings)
    expect(next.meta).toBe(s.meta)
    expect(visibleBanner(next.ui)).toBe('updateReady')
  })

  it('a second signal changes nothing', () => {
    const once = reducer(fresh(), { type: 'updateAvailable' })
    expect(reducer(once, { type: 'updateAvailable' })).toBe(once)
  })

  it('applies in a read-only tab, under the read-only banner', () => {
    const s = fresh()
    const ro = { ...s, ui: { ...s.ui, readOnly: 'otherTab' as const } }
    const next = reducer(ro, { type: 'updateAvailable' })
    expect(next.ui.updateReady).toBe(true)
    expect(visibleBanner(next.ui)).toBe('readOnly')
    expect(visibleBanner(reducer(next, { type: 'bannerDismissed', banner: 'readOnly' }).ui)).toBe('updateReady')
  })

  it('applies while a Postcard waits to be revealed', () => {
    const s = fresh()
    const pending = { ...s, album: [{ cityId: 'europe-near-1', collectedOn: '2026-10-07', revealed: false }] }
    expect(reducer(pending, { type: 'updateAvailable' }).ui.updateReady).toBe(true)
  })

  it('"Got it" hides it for the page; it stays ready', () => {
    const ready = reducer(fresh(), { type: 'updateAvailable' })
    const dismissed = reducer(ready, { type: 'bannerDismissed', banner: 'updateReady' })
    expect(dismissed.ui.updateReady).toBe(true)
    expect(visibleBanner(dismissed.ui)).toBeNull()
    expect(reducer(dismissed, { type: 'updateAvailable' })).toBe(dismissed)
  })
})
