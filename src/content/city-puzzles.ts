import raw from './city-puzzles.json' with { type: 'json' }

/**
 * One pre-built Puzzle per City, generated once by `npm run build:cities` and never
 * rewritten. 81-char digit strings, cells 0–80 row-major, 0 = empty.
 */
export type CityPuzzle = {
  readonly cityId: string
  readonly givens: string
  readonly solution: string
  readonly difficulty: 'easy' | 'medium' | 'hard'
}

export const CITY_PUZZLES: readonly CityPuzzle[] = raw as readonly CityPuzzle[]

/** Synchronous lookup: City Puzzles are read from content, never generated at runtime. */
export function cityPuzzle(id: string): CityPuzzle | undefined {
  return CITY_PUZZLES.find((p) => p.cityId === id)
}
