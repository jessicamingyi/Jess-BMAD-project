import type { RefObject } from 'react'
import { copy } from '../content/copy.ts'
import type { City, Region } from '../content/cities.ts'
import { postcardCount, regionCities, REGIONS, slotState, UNLOCK_COUNT } from '../game/journey.ts'
import type { AppState } from '../game/types.ts'
import './album.css'

type Props = {
  state: AppState
  /** The page heading; focused (tabIndex -1) when the Album opens. */
  headingRef: RefObject<HTMLHeadingElement | null>
  onRegion: (region: Region) => void
  onCity: (cityId: string) => void
}

/**
 * The Album, also the destination chooser (no map). Heading, Region tabs with
 * counts, then the Region's 10 slots Near → Mid → Far in a 5-column grid.
 * Tabs and slots are native buttons (no key handlers). Only a Collected slot
 * renders its City's Postcard line, so a line can't leak for an uncollected City.
 */
export function AlbumScreen({ state, headingRef, onRegion, onCity }: Props) {
  const { album } = state
  const region = state.ui.albumRegion
  const regionName = copy.regionName(region)
  return (
    <section className="album-screen">
      <h1 className="album-heading" tabIndex={-1} ref={headingRef}>
        {album.length === 0 ? copy.albumHeadingEmpty : copy.albumHeading}
      </h1>
      <div className="album-tabs" role="group" aria-label={copy.albumRegionsLabel}>
        {REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            className="album-tab"
            aria-pressed={r === region}
            onClick={() => {
              if (r !== region) onRegion(r)
            }}
          >
            {copy.regionTabCount(r, postcardCount(album, r), regionCities(r).length)}
          </button>
        ))}
      </div>
      <ul className="album-slots" aria-label={regionName}>
        {regionCities(region).map((city) => (
          <li key={city.id} className="album-slot-item">
            <Slot state={state} city={city} onCity={onCity} />
          </li>
        ))}
      </ul>
    </section>
  )
}

type SlotProps = { state: AppState; city: City; onCity: (cityId: string) => void }

function Slot({ state, city, onCity }: SlotProps) {
  const slot = slotState(state, city)
  const caption = copy.slotCaption(city.country, city.tier)
  switch (slot) {
    case 'collected': {
      // A Postcard face in miniature: stripe top edge, City, caption and its line. "just arrived" until the next visit.
      const arrived = state.ui.justArrived.includes(city.id)
      return (
        <div
          className={arrived ? 'album-slot album-slot--collected album-slot--just-arrived' : 'album-slot album-slot--collected'}
          data-city={city.id}
        >
          <span className="album-slot-name">{city.name}</span>
          <span className="album-slot-caption">{caption}</span>
          <span className="album-slot-line">{city.line}</span>
          {arrived && <span className="album-slot-arrived">{copy.justArrived}</span>}
        </div>
      )
    }
    case 'locked': {
      // Focusable for its line; no City name and no fill. Locked Cities are always Mid or Far.
      const waitTier = city.tier === 'far' ? 'mid' : 'near'
      const have = postcardCount(state.album, city.region, waitTier)
      return (
        <button
          type="button"
          className="album-slot album-slot--locked"
          aria-disabled="true"
          aria-label={copy.slotLockedLabel(city.tier, waitTier, have, UNLOCK_COUNT)}
          data-city={city.id}
        >
          <span className="album-slot-locked">{copy.slotLocked(waitTier, UNLOCK_COUNT)}</span>
        </button>
      )
    }
    default:
      return (
        <button
          type="button"
          className={slot === 'inProgress' ? 'album-slot album-slot--in-progress' : 'album-slot album-slot--reachable'}
          aria-label={copy.slotLabel(city.name, city.country, city.tier, slot === 'inProgress' ? copy.slotCarryOn : copy.slotTravel)}
          data-city={city.id}
          onClick={() => onCity(city.id)}
        >
          <span className="album-slot-name">{city.name}</span>
          <span className="album-slot-caption">{caption}</span>
          <span className="album-slot-action">{slot === 'inProgress' ? copy.slotCarryOn : copy.slotTravel}</span>
        </button>
      )
  }
}
