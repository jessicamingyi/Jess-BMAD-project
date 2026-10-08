import { copy } from '../content/copy.ts'
import type { City } from '../content/cities.ts'
import './stamp.css'

type StampProps = {
  city: City
  /** 'header': 74×88 in the City Puzzle header. 'postcard': 52×62 on a Postcard (Story 3.3). */
  size?: 'header' | 'postcard'
}

/**
 * A City's Stamp: airmail-red face with country, glyph and Tier in card ink,
 * perforated edge, tilted +3°. Decorative (`aria-hidden`); the header text says it all.
 */
export function Stamp({ city, size = 'header' }: StampProps) {
  return (
    <div className={`stamp stamp--${size}`} aria-hidden="true" data-city={city.id}>
      <span className="stamp-country">{city.country}</span>
      <span className="stamp-glyph">{city.glyph}</span>
      <span className="stamp-tier">{copy.tierName(city.tier)}</span>
    </div>
  )
}

type PostmarkProps = {
  /** The City name round the top of the mark. */
  name: string
  /** 'YYYY-MM-DD', shown as "06 OCT 26". */
  date: string
}

/** A Postmark: double circle in `postmark` at 75% opacity with the City and date. Decorative (`aria-hidden`). */
export function Postmark({ name, date }: PostmarkProps) {
  return (
    <div className="postmark" aria-hidden="true">
      <span className="postmark-city">{name}</span>
      <span className="postmark-date">{copy.postmarkDate(date)}</span>
    </div>
  )
}
