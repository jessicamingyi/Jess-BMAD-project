import { describe, expect, it } from 'vitest'
import { visibleBanner } from '../../src/game/banners.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'

const fresh = (): AppState => createInitialState()
const readOnly = (s: AppState): AppState => ({ ...s, ui: { ...s.ui, readOnly: 'otherTab' } })
const savingOff = (s: AppState): AppState => ({ ...s, ui: { ...s.ui, savingOff: true } })
const seen = (s: AppState): AppState => ({ ...s, meta: { ...s.meta, seenStorageNotice: true } })

describe('storage notice', () => {
  it('starts unseen and never asked; the notice is pending', () => {
    const s = fresh()
    expect(s.meta).toEqual({ lastPlayedKey: null, seenStorageNotice: false, persistGranted: null })
    expect(s.ui.addToDockPending).toBe(false)
    expect(visibleBanner(s)).toBe('storageNotice')
  })

  it('"Got it" sets meta.seenStorageNotice and nothing else; the notice goes', () => {
    const s = fresh()
    const next = reducer(s, { type: 'storageNoticeAcknowledged' })
    expect(next.meta).toEqual({ ...s.meta, seenStorageNotice: true })
    expect(next.ui).toBe(s.ui)
    expect(next.album).toBe(s.album)
    expect(next.sessions).toBe(s.sessions)
    expect(next.settings).toBe(s.settings)
    expect(visibleBanner(next)).toBeNull()
    expect(reducer(next, { type: 'storageNoticeAcknowledged' })).toBe(next)
  })

  it('a read-only tab only hides it for the page (meta unchanged)', () => {
    const s = readOnly(fresh())
    const next = reducer(s, { type: 'storageNoticeAcknowledged' })
    expect(next.meta).toBe(s.meta)
    expect(next.ui.dismissed).toEqual(['storageNotice'])
    expect(reducer(next, { type: 'storageNoticeAcknowledged' })).toBe(next)
    expect(visibleBanner({ ...next, ui: { ...next.ui, dismissed: ['readOnly', 'storageNotice'] } })).toBeNull()
  })

  it('a saving-off tab only dismisses it (meta unchanged)', () => {
    const s = savingOff(fresh())
    const next = reducer(s, { type: 'storageNoticeAcknowledged' })
    expect(next.meta).toBe(s.meta)
    expect(next.ui.dismissed).toEqual(['storageNotice'])
  })

  it('applies while a Postcard waits to be revealed', () => {
    const s = { ...fresh(), album: [{ cityId: 'europe-near-1', collectedOn: '2026-10-07', revealed: false }] }
    expect(reducer(s, { type: 'storageNoticeAcknowledged' }).meta.seenStorageNotice).toBe(true)
  })
})

describe('persistResolved', () => {
  it('granted: persistGranted true, no Add to Dock banner (even in Safari)', () => {
    const next = reducer(seen(fresh()), { type: 'persistResolved', granted: true, safari: true })
    expect(next.meta.persistGranted).toBe(true)
    expect(next.ui.addToDockPending).toBe(false)
    expect(visibleBanner(next)).toBeNull()
  })

  it('refused in Safari: persistGranted false and the Add to Dock banner', () => {
    const next = reducer(seen(fresh()), { type: 'persistResolved', granted: false, safari: true })
    expect(next.meta.persistGranted).toBe(false)
    expect(next.ui.addToDockPending).toBe(true)
    expect(visibleBanner(next)).toBe('addToDock')
  })

  it('refused elsewhere: persistGranted false, nothing shown', () => {
    const s = seen(fresh())
    const next = reducer(s, { type: 'persistResolved', granted: false, safari: false })
    expect(next.meta.persistGranted).toBe(false)
    expect(next.ui).toBe(s.ui)
    expect(visibleBanner(next)).toBeNull()
  })

  it('the same answer again changes nothing; a later grant clears the tip', () => {
    const refused = reducer(seen(fresh()), { type: 'persistResolved', granted: false, safari: true })
    expect(reducer(refused, { type: 'persistResolved', granted: false, safari: true })).toBe(refused)
    const granted = reducer(refused, { type: 'persistResolved', granted: true, safari: false })
    expect(granted.meta.persistGranted).toBe(true)
    expect(granted.ui.addToDockPending).toBe(false)
    expect(reducer(granted, { type: 'persistResolved', granted: true, safari: false })).toBe(granted)
  })

  it('a dismissed tip shows again on a later Safari refusal (the first Postcard)', () => {
    const refused = reducer(seen(fresh()), { type: 'persistResolved', granted: false, safari: true })
    const dismissed = reducer(refused, { type: 'bannerDismissed', banner: 'addToDock' })
    expect(visibleBanner(dismissed)).toBeNull()
    const again = reducer(dismissed, { type: 'persistResolved', granted: false, safari: true })
    expect(visibleBanner(again)).toBe('addToDock')
  })

  it('a read-only tab records nothing', () => {
    const s = readOnly(seen(fresh()))
    expect(reducer(s, { type: 'persistResolved', granted: false, safari: true })).toBe(s)
    expect(reducer(s, { type: 'persistResolved', granted: true, safari: false })).toBe(s)
  })

  it('a saving-off tab records nothing', () => {
    const s = savingOff(seen(fresh()))
    expect(reducer(s, { type: 'persistResolved', granted: false, safari: true })).toBe(s)
    expect(reducer(s, { type: 'persistResolved', granted: true, safari: false })).toBe(s)
  })

  it('the storage notice outranks the Add to Dock tip', () => {
    const next = reducer(fresh(), { type: 'persistResolved', granted: false, safari: true })
    expect(visibleBanner(next)).toBe('storageNotice')
  })
})
