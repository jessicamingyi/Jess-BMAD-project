import { describe, expect, it } from 'vitest'
import { CITIES } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey, openingRegion } from '../../src/game/journey.ts'
import { launch } from '../../src/game/launch.ts'
import { createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { Album, AppState, Session } from '../../src/game/types.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

const PARIS = 'europe-near-1'
const LONDON = 'europe-near-2'
const TOKYO = 'asia-near-1'

const city = (id: string, status: Session['status'] = 'inProgress'): Session => ({
  ...createSession(cityKey(id), cityPuzzle(id)!),
  status,
})
const free = (status: Session['status'] = 'inProgress'): Session => ({ ...createSession(FREE_PLAY_KEY, samplePuzzle), status })

/** A frozen launch state: the empty start plus `sessions`, `lastPlayedKey` and `album`. */
function at(sessions: Record<string, Session>, lastPlayedKey: string | null, album: Album = []): AppState {
  const base = createInitialState()
  return deepFreeze({ ...base, album, sessions, meta: { lastPlayedKey } })
}

const opened = (s: AppState) => ({ screen: s.ui.screen, activeKey: s.ui.activeKey })

describe('launch: last played in progress', () => {
  it('opens the Puzzle screen on the lastPlayedKey Session', () => {
    const state = at({ [cityKey(PARIS)]: city(PARIS), [cityKey(LONDON)]: city(LONDON) }, cityKey(LONDON))
    expect(opened(launch(state))).toEqual({ screen: 'puzzle', activeKey: cityKey(LONDON) })
  })

  it('opens Free Play when it was last played, even with a City in progress', () => {
    const state = at({ [cityKey(PARIS)]: city(PARIS), [FREE_PLAY_KEY]: free() }, FREE_PLAY_KEY)
    expect(opened(launch(state))).toEqual({ screen: 'puzzle', activeKey: FREE_PLAY_KEY })
  })

  it('keeps digits and Notes exactly as stored (the Session is the same reference)', () => {
    const s = city(PARIS)
    const notes = [...s.notes]
    notes[0] = 0b101
    const played = { ...s, digits: '5' + s.digits.slice(1), notes }
    const state = at({ [cityKey(PARIS)]: played }, cityKey(PARIS))
    expect(launch(state).sessions[cityKey(PARIS)]).toBe(played)
  })
})

describe('launch: last played unusable', () => {
  const others = { [cityKey(TOKYO)]: city(TOKYO), [cityKey(LONDON)]: city(LONDON), [FREE_PLAY_KEY]: free() }

  it.each([
    ['solved', { [cityKey(PARIS)]: city(PARIS, 'solved') }, cityKey(PARIS)],
    ['missing', {}, cityKey(PARIS)],
    ['null', {}, null],
    ['an unknown City id', { 'city:atlantis': { ...city(PARIS), key: 'city:atlantis' } }, 'city:atlantis'],
    ['not a Puzzle key', { other: { ...city(PARIS), key: 'other' } }, 'other'],
  ])('lastPlayedKey %s: the first in-progress City in catalogue order', (_, extra, last) => {
    const state = at({ ...extra, ...others }, last)
    // London (Europe) comes before Tokyo (Asia) in CITIES.
    expect(opened(launch(state))).toEqual({ screen: 'puzzle', activeKey: cityKey(LONDON) })
  })

  it('a City earlier in CITIES wins, whatever the object key order', () => {
    const ids = [CITIES[0].id, CITIES[5].id, CITIES[CITIES.length - 1].id]
    const forwards = Object.fromEntries(ids.map((id) => [cityKey(id), city(id)]))
    const backwards = Object.fromEntries([...ids].reverse().map((id) => [cityKey(id), city(id)]))
    expect(launch(at(forwards, null)).ui.activeKey).toBe(cityKey(ids[0]))
    expect(launch(at(backwards, null)).ui.activeKey).toBe(cityKey(ids[0]))
  })

  it('Free Play only when no City is in progress', () => {
    const solvedCity = { [cityKey(PARIS)]: city(PARIS, 'solved') }
    expect(launch(at({ [FREE_PLAY_KEY]: free(), ...solvedCity }, cityKey(PARIS))).ui.activeKey).toBe(FREE_PLAY_KEY)
    expect(launch(at({ [FREE_PLAY_KEY]: free(), [cityKey(TOKYO)]: city(TOKYO) }, null)).ui.activeKey).toBe(cityKey(TOKYO))
  })

  it('ignores unknown City keys in progress', () => {
    const state = at({ 'city:nope': { ...city(PARIS), key: 'city:nope' }, [FREE_PLAY_KEY]: free() }, null)
    expect(opened(launch(state))).toEqual({ screen: 'puzzle', activeKey: FREE_PLAY_KEY })
    const none = at({ 'city:nope': { ...city(PARIS), key: 'city:nope' } }, null)
    expect(opened(launch(none))).toEqual({ screen: 'album', activeKey: null })
  })
})

describe('launch: nothing in progress', () => {
  const album: Album = [
    { cityId: PARIS, collectedOn: '2026-10-01', revealed: true },
    { cityId: TOKYO, collectedOn: '2026-10-02', revealed: true },
  ]

  it('opens the Album on the latest Postcard’s Region with the Album seen', () => {
    const next = launch(at({}, null, album))
    expect(next.ui.screen).toBe('album')
    expect(next.ui.albumRegion).toBe(openingRegion(album))
    expect(next.ui.albumRegion).toBe('asia')
    expect(next.ui.albumSeen).toBe(2)
  })

  it('opens on Europe with an empty Album, and nothing current', () => {
    const next = launch(at({}, null))
    expect(next.ui).toMatchObject({ screen: 'album', activeKey: null, albumRegion: 'europe', albumSeen: 0 })
  })

  it('the lastPlayedKey Session, even solved, is the current Puzzle', () => {
    const state = at({ [cityKey(PARIS)]: city(PARIS, 'solved') }, cityKey(PARIS), album)
    expect(opened(launch(state))).toEqual({ screen: 'album', activeKey: cityKey(PARIS) })
    const freeSolved = at({ [FREE_PLAY_KEY]: free('solved') }, FREE_PLAY_KEY)
    expect(opened(launch(freeSolved))).toEqual({ screen: 'album', activeKey: FREE_PLAY_KEY })
  })

  it.each([
    ['missing', {}, cityKey(PARIS)],
    ['an unknown City', { 'city:atlantis': { ...city(PARIS, 'solved'), key: 'city:atlantis' } }, 'city:atlantis'],
  ])('nothing is current when the lastPlayedKey Session is %s', (_, sessions, last) => {
    expect(opened(launch(at(sessions, last)))).toEqual({ screen: 'album', activeKey: null })
  })

  it('replaces a stale screen and activeKey from the given state', () => {
    const base = at({ [cityKey(PARIS)]: city(PARIS, 'solved') }, null)
    const stale = deepFreeze({ ...base, ui: { ...base.ui, screen: 'settings' as const, activeKey: cityKey(PARIS) } })
    expect(opened(launch(stale))).toEqual({ screen: 'album', activeKey: null })
  })
})

describe('launch: purity', () => {
  it.each([
    ['puzzle', at({ [cityKey(PARIS)]: city(PARIS) }, cityKey(PARIS))],
    ['album', at({ [cityKey(PARIS)]: city(PARIS, 'solved') }, cityKey(PARIS), [{ cityId: PARIS, collectedOn: '2026-10-01', revealed: true }])],
  ])('(%s) never mutates its input; album, sessions and meta keep their references; only four ui fields change', (_, state) => {
    const before = JSON.stringify(state)
    const next = launch(state)
    expect(JSON.stringify(state)).toBe(before)
    expect(next.album).toBe(state.album)
    expect(next.sessions).toBe(state.sessions)
    expect(next.meta).toBe(state.meta)
    expect(next.settings).toBe(state.settings)
    const { screen, activeKey, albumRegion, albumSeen } = state.ui
    expect({ ...next.ui, screen, activeKey, albumRegion, albumSeen }).toEqual(state.ui)
  })
})
