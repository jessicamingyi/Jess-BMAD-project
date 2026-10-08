import { copy } from '../content/copy.ts'
import type { City } from '../content/cities.ts'
import { regionCities, slotPosition } from '../game/journey.ts'
import type { Difficulty } from '../game/types.ts'
import { Stamp } from './stamp.tsx'

type Props = {
  difficulty: Difficulty
  /** The City of a City Puzzle; absent in Free Play. */
  city?: City
}

/**
 * The Puzzle header title in city-title type.
 * Free Play: "Free Play · {Difficulty}", never a Stamp.
 * A City: "Lisbon · Mid · Medium", the meta line "Portugal — Europe, Postcard 5 of 10"
 * and the City's Stamp. Never the Postcard line.
 */
export function PuzzleTitle({ difficulty, city }: Props) {
  if (!city) return <h1 className="puzzle-title">{copy.freePlayTitle(difficulty)}</h1>
  return (
    <div className="city-header">
      <div className="city-header-text">
        <h1 className="puzzle-title">{copy.cityTitle(city.name, city.tier, difficulty)}</h1>
        <p className="city-meta">{copy.cityMeta(city.country, city.region, slotPosition(city), regionCities(city.region).length)}</p>
      </div>
      <Stamp city={city} />
    </div>
  )
}
