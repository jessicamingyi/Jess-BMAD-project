import { useCallback, useEffect, useId, useRef, type RefObject } from 'react'
import { copy } from '../content/copy.ts'
import { cityById, type City, type Region } from '../content/cities.ts'
import { postcardCount, regionCities, REGIONS, slotState, UNLOCK_COUNT } from '../game/journey.ts'
import type { AppState } from '../game/types.ts'
import { useDocumentEscape } from './keyboard.ts'
import { Postcard } from './postcard.tsx'
import './controls.css'
import './album.css'

type Props = {
  state: AppState
  /** The page heading; focused (tabIndex -1) when the Album opens. */
  headingRef: RefObject<HTMLHeadingElement | null>
  onRegion: (region: Region) => void
  /** A Reachable or In progress slot, or a Collected slot's "Carry on". */
  onCity: (cityId: string) => void
  /** A Collected slot's face: open its Postcard in the viewer (or switch it to that City). */
  onView: (cityId: string) => void
  /** Esc, "Close", a click outside the viewer, or the open slot's own face. */
  onCloseViewer: () => void
  /** The viewer's "Play again". */
  onPlayAgain: () => void
  /** The replay confirm's "Start fresh". */
  onStartFresh: () => void
  /** The replay confirm's "Keep going". */
  onKeepGoing: () => void
}

/**
 * The Album, also the destination chooser (no map). Heading, Region tabs with
 * counts, then the Region's 10 slots Near → Mid → Far in a 5-column grid.
 * Tabs and slots are native buttons (no key handlers). Only a Collected slot
 * renders its City's Postcard line, so a line can't leak for an uncollected City.
 * A Collected slot opens the non-blocking Postcard viewer over the top of the
 * slots (its face toggles it; another face switches it).
 */
export function AlbumScreen({ state, headingRef, onRegion, onCity, onView, onCloseViewer, onPlayAgain, onStartFresh, onKeepGoing }: Props) {
  const { album } = state
  const region = state.ui.albumRegion
  const regionName = copy.regionName(region)
  const screenRef = useRef<HTMLElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  // The viewer shows only a revealed Postcard of a known City.
  const viewer = state.ui.viewer
  const viewedCity = viewer ? cityById(viewer.cityId) : undefined
  const viewed = viewedCity ? album.find((p) => p.cityId === viewedCity.id && p.revealed) : undefined
  const open = viewedCity !== undefined && viewed !== undefined
  const openId = open ? viewedCity.id : null

  // The latest close callback, so the document listeners register once per open viewer.
  const closeRef = useRef(onCloseViewer)
  useEffect(() => {
    closeRef.current = onCloseViewer
  })
  const close = useCallback(() => closeRef.current(), [])

  // Esc anywhere on the page closes the viewer (the Postcard's own Esc handles it first when focus is inside).
  useDocumentEscape(open ? close : null)

  // One click outside closes the viewer, and the click still does its own action:
  // the capture phase closes first, then the target's handler runs. A Collected
  // face is left to its own handler, which toggles or switches the viewer.
  useEffect(() => {
    if (openId === null) return
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && viewerRef.current?.contains(e.target)) return
      if (e.target instanceof Element && e.target.closest('.album-slot--collected')) return
      close()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [openId, close])

  // On close, focus returns to the opener's face, unless the click outside put it on another control.
  const wasOpen = useRef(openId)
  useEffect(() => {
    const prev = wasOpen.current
    wasOpen.current = openId
    if (prev === null || openId !== null) return
    const focused = document.activeElement
    if (focused !== null && focused !== document.body) return
    screenRef.current?.querySelector<HTMLElement>(`.album-slot[data-city="${prev}"]`)?.focus()
  }, [openId])

  return (
    <section className="album-screen" ref={screenRef}>
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
      <div className="album-slots-area">
        <ul className="album-slots" aria-label={regionName}>
          {regionCities(region).map((city) => (
            <li key={city.id} className="album-slot-item">
              <Slot state={state} city={city} openId={openId} onCity={onCity} onView={onView} onClose={close} />
            </li>
          ))}
        </ul>
        {open && (
          <div className="album-viewer" ref={viewerRef}>
            <Postcard
              key={viewedCity.id}
              city={viewedCity}
              collectedOn={viewed.collectedOn}
              actionLabel={copy.playAgain}
              onAction={onPlayAgain}
              onEscape={close}
              onClose={close}
              confirm={
                viewer?.confirming ? (
                  <ReplayConfirm city={viewedCity} onStartFresh={onStartFresh} onKeepGoing={onKeepGoing} />
                ) : undefined
              }
            />
          </div>
        )}
      </div>
    </section>
  )
}

type ReplayConfirmProps = { city: City; onStartFresh: () => void; onKeepGoing: () => void }

/** "Start {City} again?": the inline replay confirm (Free Play's replace confirm markup). Focus starts on "Keep going". */
function ReplayConfirm({ city, onStartFresh, onKeepGoing }: ReplayConfirmProps) {
  const keepGoingRef = useRef<HTMLButtonElement>(null)
  const textId = useId()
  useEffect(() => {
    keepGoingRef.current?.focus()
  }, [])
  return (
    <div className="action-row action-row--confirm" role="group" aria-label={copy.replayConfirmLabel(city.name)}>
      <p className="action-row-text" id={textId}>
        {copy.replayConfirmText}
      </p>
      <div className="action-row-buttons">
        <button type="button" className="button" aria-describedby={textId} onClick={onStartFresh}>
          <span className="button-label">{copy.startFresh}</span>
        </button>
        <button type="button" className="button button--primary" ref={keepGoingRef} aria-describedby={textId} onClick={onKeepGoing}>
          <span className="button-label">{copy.keepGoing}</span>
        </button>
      </div>
    </div>
  )
}

type SlotProps = {
  state: AppState
  city: City
  /** The City whose Postcard the viewer shows, or null. */
  openId: string | null
  onCity: (cityId: string) => void
  onView: (cityId: string) => void
  onClose: () => void
}

function Slot({ state, city, openId, onCity, onView, onClose }: SlotProps) {
  const slot = slotState(state, city)
  const describedId = useId()
  const caption = copy.slotCaption(city.country, city.tier)
  switch (slot) {
    case 'collected':
    case 'collectedReplay': {
      // A Postcard face in miniature: stripe top edge, City, caption and its line. "just arrived" until the next visit.
      // The face opens the viewer (closes it if it is this City's); a replay in progress adds a sibling "Carry on".
      // Its name is "… — See Postcard"; the line and "just arrived" describe it.
      const arrived = state.ui.justArrived.includes(city.id)
      const replay = slot === 'collectedReplay'
      const classes = ['album-slot', 'album-slot--collected']
      if (arrived) classes.push('album-slot--just-arrived')
      if (replay) classes.push('album-slot--replay')
      return (
        <>
          <button
            type="button"
            className={classes.join(' ')}
            aria-label={copy.slotLabel(city.name, city.country, city.tier, copy.slotSeePostcard)}
            aria-describedby={arrived ? `${describedId}-line ${describedId}-arrived` : `${describedId}-line`}
            aria-haspopup="dialog"
            aria-expanded={openId === city.id}
            data-city={city.id}
            onClick={() => (openId === city.id ? onClose() : onView(city.id))}
          >
            <span className="album-slot-name">{city.name}</span>
            <span className="album-slot-caption">{caption}</span>
            <span className="album-slot-line" id={`${describedId}-line`}>
              {city.line}
            </span>
            {arrived && (
              <span className="album-slot-arrived" id={`${describedId}-arrived`}>
                {copy.justArrived}
              </span>
            )}
          </button>
          {replay && (
            <button
              type="button"
              className="album-slot-carry-on"
              aria-label={copy.slotLabel(city.name, city.country, city.tier, copy.slotCarryOn)}
              onClick={() => onCity(city.id)}
            >
              {copy.slotCarryOn}
            </button>
          )}
        </>
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
