import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CITIES, cityById, type City, type Region, type Tier } from '../../src/content/cities.ts'
import {
  award,
  cityKey,
  cityOfKey,
  difficultyForTier,
  isDateString,
  isReachable,
  openingRegion,
  pendingPostcard,
  postcardCount,
  regionCities,
  slotPosition,
  slotState,
  TIER_DIFFICULTY,
} from '../../src/game/journey.ts'
import { createInitialState, createSession } from '../../src/game/session.ts'
import type { Album, AppState, Postcard } from '../../src/game/types.ts'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

function sources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sources(full))
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('game/journey', () => {
  it('maps Near → Easy, Mid → Medium, Far → Hard', () => {
    expect(TIER_DIFFICULTY).toEqual({ near: 'easy', mid: 'medium', far: 'hard' })
    expect(difficultyForTier('near')).toBe('easy')
    expect(difficultyForTier('mid')).toBe('medium')
    expect(difficultyForTier('far')).toBe('hard')
    expect(Object.isFrozen(TIER_DIFFICULTY)).toBe(true)
  })

  it('holds the only Tier → Difficulty map in src/ and scripts/', () => {
    const MAP_LITERAL = /['"]?near['"]?\s*:\s*['"]easy['"]/
    const files = [...sources(join(ROOT, 'src')), ...sources(join(ROOT, 'scripts'))]
      .filter((f) => MAP_LITERAL.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f).replace(/\\/g, '/'))
    expect(files).toEqual(['src/game/journey.ts'])
  })
})

const card = (cityId: string, collectedOn = '2026-10-06'): Postcard => ({ cityId, collectedOn, revealed: true })
const album = (...ids: string[]): Album => ids.map((id) => card(id))
const city = (id: string): City => cityById(id)!
const ids = (region: Region, tier: Tier) => CITIES.filter((c) => c.region === region && c.tier === tier).map((c) => c.id)

const EU_NEAR = ids('europe', 'near')
const EU_MID = ids('europe', 'mid')
const EU_FAR = ids('europe', 'far')
const ASIA_NEAR = ids('asia', 'near')

describe('journey keys and Regions', () => {
  it('cityKey is city:<id>; cityOfKey reads it back, and nothing else', () => {
    expect(cityKey('lisbon')).toBe('city:lisbon')
    expect(cityOfKey('city:lisbon')?.name).toBe('Lisbon')
    expect(cityOfKey('free')).toBeUndefined()
    expect(cityOfKey(null)).toBeUndefined()
    expect(cityOfKey('city:atlantis')).toBeUndefined()
  })

  it('regionCities gives each Region its 10 Cities in catalogue order, Near → Mid → Far', () => {
    for (const region of ['europe', 'asia', 'americas'] as const) {
      const cities = regionCities(region)
      expect(cities).toHaveLength(10)
      expect(cities.map((c) => c.tier)).toEqual(['near', 'near', 'near', 'near', 'mid', 'mid', 'mid', 'far', 'far', 'far'])
      expect(cities).toEqual(CITIES.filter((c) => c.region === region))
    }
  })

  it('slotPosition is the 1–10 place in the Region (Lisbon is 5)', () => {
    expect(slotPosition(city('lisbon'))).toBe(5)
    expect(slotPosition(city(EU_NEAR[0]))).toBe(1)
    expect(slotPosition(city(EU_FAR[2]))).toBe(10)
    for (const region of ['europe', 'asia', 'americas'] as const) {
      expect(regionCities(region).map(slotPosition)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    }
  })
})

describe('postcardCount', () => {
  it('counts known Cities per Region and Tier, ignoring unknown ids and repeats', () => {
    const a = album(EU_NEAR[0], EU_NEAR[1], 'atlantis', ASIA_NEAR[0], EU_NEAR[0], 'lisbon')
    expect(postcardCount(a, 'europe')).toBe(3)
    expect(postcardCount(a, 'europe', 'near')).toBe(2)
    expect(postcardCount(a, 'europe', 'mid')).toBe(1)
    expect(postcardCount(a, 'asia')).toBe(1)
    expect(postcardCount(a, 'americas')).toBe(0)
    expect(postcardCount([], 'europe')).toBe(0)
  })
})

describe('isReachable (the unlock matrix)', () => {
  const reach = (a: Album, id: string) => isReachable(a, city(id))

  it('every Near City is reachable from the start; no Mid or Far is', () => {
    for (const c of CITIES) expect(isReachable([], c), c.id).toBe(c.tier === 'near')
  })

  it.each([
    [0, false],
    [1, false],
    [2, false],
    [3, true],
    [4, true],
  ])('Mid opens at 3 Near Postcards in the Region (%i → %s)', (n, open) => {
    const a = album(...EU_NEAR.slice(0, n))
    for (const id of EU_MID) expect(reach(a, id), id).toBe(open)
    for (const id of EU_FAR) expect(reach(a, id), id).toBe(false)
  })

  it.each([
    [2, false],
    [3, true],
  ])('Far opens at 3 Mid Postcards in the Region (%i → %s)', (n, open) => {
    const a = album(...EU_NEAR.slice(0, 3), ...EU_MID.slice(0, n))
    for (const id of EU_FAR) expect(reach(a, id), id).toBe(open)
  })

  it('Near Postcards alone never open Far', () => {
    const a = album(...EU_NEAR)
    for (const id of EU_FAR) expect(reach(a, id), id).toBe(false)
  })

  it("one Region's Postcards never unlock another's", () => {
    const a = album(...EU_NEAR, ...EU_MID)
    for (const c of CITIES.filter((c) => c.region !== 'europe')) expect(isReachable(a, c), c.id).toBe(c.tier === 'near')
  })

  it('unknown ids never count towards an unlock', () => {
    const a = album(EU_NEAR[0], EU_NEAR[1], 'atlantis', 'europe-near-99')
    expect(reach(a, 'lisbon')).toBe(false)
  })
})

describe('openingRegion', () => {
  it('is Europe with no Postcards', () => {
    expect(openingRegion([])).toBe('europe')
  })

  it("is the latest Postcard's Region", () => {
    expect(openingRegion(album(EU_NEAR[0], ASIA_NEAR[0]))).toBe('asia')
    expect(openingRegion(album(ASIA_NEAR[0], 'americas-near-1'))).toBe('americas')
    expect(openingRegion(album(ASIA_NEAR[0], EU_NEAR[0]))).toBe('europe')
  })

  it('skips Postcards with unknown ids', () => {
    expect(openingRegion(album(ASIA_NEAR[0], 'atlantis'))).toBe('asia')
    expect(openingRegion(album('atlantis'))).toBe('europe')
  })
})

describe('slotState', () => {
  const withSession = (state: AppState, id: string, status: 'inProgress' | 'solved'): AppState => {
    const key = cityKey(id)
    const puzzle = { givens: '0'.repeat(81), solution: '1'.repeat(81), difficulty: 'easy' as const }
    return { ...state, sessions: { ...state.sessions, [key]: { ...createSession(key, puzzle), status } } }
  }

  it('fresh: Near reachable, Mid and Far locked', () => {
    const s = createInitialState()
    expect(regionCities('europe').map((c) => slotState(s, c))).toEqual([
      ...Array(4).fill('reachable'),
      ...Array(6).fill('locked'),
    ])
  })

  it('collected beats in progress; in progress beats reachable; solved without a Postcard is reachable again', () => {
    const base = { ...createInitialState(), album: album(EU_NEAR[0], EU_NEAR[1], EU_NEAR[2]) }
    const s = withSession(withSession(withSession(base, EU_NEAR[1], 'solved'), EU_NEAR[3], 'inProgress'), 'lisbon', 'solved')
    expect(slotState(s, city(EU_NEAR[0]))).toBe('collected')
    expect(slotState(s, city(EU_NEAR[1]))).toBe('collected')
    expect(slotState(s, city(EU_NEAR[3]))).toBe('inProgress')
    expect(slotState(s, city('lisbon'))).toBe('reachable')
    expect(slotState(s, city(EU_MID[1]))).toBe('reachable')
    expect(slotState(s, city(EU_FAR[0]))).toBe('locked')
  })

  it('collectedReplay: collected with a replay in progress; solving it again is plain collected', () => {
    const base = { ...createInitialState(), album: album(EU_NEAR[0]) }
    expect(slotState(withSession(base, EU_NEAR[0], 'inProgress'), city(EU_NEAR[0]))).toBe('collectedReplay')
    expect(slotState(withSession(base, EU_NEAR[0], 'solved'), city(EU_NEAR[0]))).toBe('collected')
    expect(slotState(base, city(EU_NEAR[0]))).toBe('collected')
  })
})

describe('award', () => {
  const D = '2026-10-07'
  const withAlbum = (a: Album): AppState => ({ ...createInitialState(), album: a })

  it('appends { cityId, collectedOn, revealed: false } for an uncollected City', () => {
    const s = withAlbum(album('europe-near-1'))
    const next = award(s, cityKey('lisbon'), D)
    expect(next.album).toEqual([...s.album, { cityId: 'lisbon', collectedOn: D, revealed: false }])
    expect(next.sessions).toBe(s.sessions)
    expect(next.ui).toBe(s.ui)
  })

  it('keeps the order collected', () => {
    let s = withAlbum([])
    for (const id of ['asia-near-2', 'europe-near-1', 'americas-near-3']) s = award(s, cityKey(id), D)
    expect(s.album.map((p) => p.cityId)).toEqual(['asia-near-2', 'europe-near-1', 'americas-near-3'])
  })

  it('adds nothing (the same state) for Free Play, a collected City, an unknown City or a malformed key', () => {
    const s = withAlbum(album('europe-near-1'))
    expect(award(s, 'free', D)).toBe(s)
    expect(award(s, cityKey('europe-near-1'), D)).toBe(s)
    expect(award(withAlbum([{ cityId: 'europe-near-1', collectedOn: D, revealed: false }]), cityKey('europe-near-1'), D).album).toHaveLength(1)
    expect(award(s, cityKey('atlantis'), D)).toBe(s)
    expect(award(s, 'europe-near-2', D)).toBe(s)
  })

  it('isDateString: only YYYY-MM-DD (the reducer checks it before an awarding step)', () => {
    expect(isDateString('2026-10-07')).toBe(true)
    for (const bad of ['', '2026-1-07', '07/10/2026', '2026-13-01', '2026-10-32', '2026-10-07T00:00', undefined]) {
      expect(isDateString(bad), String(bad)).toBe(false)
    }
  })
})

describe('pendingPostcard', () => {
  const unrevealed = (cityId: string): Postcard => ({ cityId, collectedOn: '2026-10-07', revealed: false })

  it('is undefined for an empty Album or when every Postcard is revealed', () => {
    expect(pendingPostcard([])).toBeUndefined()
    expect(pendingPostcard(album('europe-near-1', 'lisbon'))).toBeUndefined()
  })

  it('is the first unrevealed Postcard, oldest first', () => {
    const a = [card('europe-near-1'), unrevealed('asia-near-1'), unrevealed('europe-near-2')]
    expect(pendingPostcard(a)).toBe(a[1])
  })

  it('skips unknown Cities', () => {
    const a = [unrevealed('atlantis'), unrevealed('europe-near-3')]
    expect(pendingPostcard(a)).toBe(a[1])
    expect(pendingPostcard([unrevealed('atlantis')])).toBeUndefined()
  })
})
