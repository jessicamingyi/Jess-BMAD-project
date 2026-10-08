import { CITIES, cityById, type City, type Region, type Tier } from '../content/cities.ts'
import { cityPuzzle } from '../content/city-puzzles.ts'
import type { Difficulty } from '../engine/index.ts'
import type { Album, AppState, Postcard } from './types.ts'

/*
 * The journey rules. Imports carry `.ts` extensions because scripts/build-cities
 * runs this file directly under Node.
 *
 * Reachability, counts and slot states are always computed from `album` and the
 * catalogue; none of them is ever stored.
 */

/** The only Tier → Difficulty map: Near is Easy, Mid is Medium, Far is Hard. */
export const TIER_DIFFICULTY: Readonly<Record<Tier, Difficulty>> = Object.freeze({
  near: 'easy',
  mid: 'medium',
  far: 'hard',
})

export function difficultyForTier(tier: Tier): Difficulty {
  return TIER_DIFFICULTY[tier]
}

export const REGIONS: readonly Region[] = Object.freeze(['europe', 'asia', 'americas'])

export const isRegion = (r: unknown): r is Region => REGIONS.includes(r as Region)

/** Postcards in a Tier needed to open the next Tier of the same Region. */
export const UNLOCK_COUNT = 3

const CITY_KEY_PREFIX = 'city:'

/** The Session key of a City: `city:<id>`. */
export function cityKey(id: string): string {
  return `${CITY_KEY_PREFIX}${id}`
}

/** The City a Session key belongs to, or undefined (Free Play, unknown ids, null). */
export function cityOfKey(key: string | null): City | undefined {
  if (key === null || !key.startsWith(CITY_KEY_PREFIX)) return undefined
  return cityById(key.slice(CITY_KEY_PREFIX.length))
}

/** A Region's 10 Cities in catalogue order (Near → Mid → Far). */
export function regionCities(region: Region): readonly City[] {
  return CITIES.filter((c) => c.region === region)
}

/** Postcards for known Cities in `region` (and `tier`, if given). Unknown ids are ignored; each City counts once. */
export function postcardCount(album: Album, region: Region, tier?: Tier): number {
  const counted = new Set<string>()
  for (const postcard of album) {
    const city = cityById(postcard.cityId)
    if (city && city.region === region && (tier === undefined || city.tier === tier)) counted.add(city.id)
  }
  return counted.size
}

/** True when the City's Album entry exists. */
export function isCollected(album: Album, city: City): boolean {
  return album.some((p) => p.cityId === city.id)
}

/**
 * Near is always reachable; Mid opens at 3 Near Postcards in the same Region,
 * Far at 3 Mid. One Region's Postcards never unlock another's.
 */
export function isReachable(album: Album, city: City): boolean {
  switch (city.tier) {
    case 'near':
      return true
    case 'mid':
      return postcardCount(album, city.region, 'near') >= UNLOCK_COUNT
    case 'far':
      return postcardCount(album, city.region, 'mid') >= UNLOCK_COUNT
    default:
      return false
  }
}

/** The City's place in its Region, 1–10 ("Postcard 5 of 10"). */
export function slotPosition(city: City): number {
  return regionCities(city.region).findIndex((c) => c.id === city.id) + 1
}

/** The Album opens on the Region of the latest Postcard with a known City, else Europe. */
export function openingRegion(album: Album): Region {
  for (let i = album.length - 1; i >= 0; i--) {
    const city = cityById(album[i].cityId)
    if (city) return city.region
  }
  return 'europe'
}

export type SlotState = 'collected' | 'inProgress' | 'reachable' | 'locked'

export function slotState(state: AppState, city: City): SlotState {
  if (isCollected(state.album, city)) return 'collected'
  if (state.sessions[cityKey(city.id)]?.status === 'inProgress') return 'inProgress'
  return isReachable(state.album, city) ? 'reachable' : 'locked'
}

/** A 'YYYY-MM-DD' calendar date (month 01–12, day 01–31). Only shape is checked; the shell supplies it. */
export function isDateString(date: unknown): date is string {
  return typeof date === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)
}

/**
 * The first solve of a City: append its Postcard `{ cityId, collectedOn, revealed: false }`
 * to the Album. Free Play keys, unknown Cities and Cities already in the Album
 * add nothing and return `state` itself, so nothing ever duplicates. The reducer
 * checks `collectedOn` (`isDateString`) before the step.
 */
export function award(state: AppState, key: string, collectedOn: string): AppState {
  const city = cityOfKey(key)
  if (!city || isCollected(state.album, city)) return state
  return { ...state, album: [...state.album, { cityId: city.id, collectedOn, revealed: false }] }
}

const isGrid = (s: unknown) => typeof s === 'string' && /^[0-9]{81}$/.test(s)

/**
 * A Postcard the reveal can show: unrevealed, for a known City whose pre-built
 * Puzzle is well formed (the reveal lies over its solved grid). The one rule for
 * the reveal gate, the reducer's block and the UI; anything else never blocks.
 */
export function isRevealable(postcard: Postcard): boolean {
  if (postcard.revealed || cityById(postcard.cityId) === undefined) return false
  const puzzle = cityPuzzle(postcard.cityId)
  return !!puzzle && isGrid(puzzle.givens) && isGrid(puzzle.solution)
}

/** The Postcard to reveal next: the first revealable one (oldest first), or undefined. */
export function pendingPostcard(album: Album): Postcard | undefined {
  return album.find(isRevealable)
}
