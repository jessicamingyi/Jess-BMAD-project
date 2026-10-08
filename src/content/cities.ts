import raw from './cities.json' with { type: 'json' }

export type Region = 'europe' | 'asia' | 'americas'

/** How far off the usual route a City is. Sets the City Puzzle's Difficulty (see game/journey). */
export type Tier = 'near' | 'mid' | 'far'

export type City = {
  /** Neutral slot id (e.g. `europe-near-1`); never changes, even when the name or line does. */
  readonly id: string
  readonly name: string
  readonly country: string
  readonly region: Region
  readonly tier: Tier
  /** Single-colour Unicode Stamp glyph. */
  readonly glyph: string
  /** Postcard line. Starts "PLACEHOLDER" while the real line is pending (TS-40). */
  readonly line: string
  /** `true` while the Postcard line is not written yet; absent otherwise. */
  readonly placeholder?: true
}

/** The 30 Cities in catalogue order (planning-artifacts/cities.md). */
export const CITIES: readonly City[] = raw as readonly City[]

export function cityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id)
}
