import { CITIES, cityById, type City, type Region, type Tier } from '../content/cities.ts'
import type { Difficulty } from '../engine/index.ts'
import type { Album, AppState } from './types.ts'

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
