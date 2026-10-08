import { useEffect, useId, useRef } from 'react'
import { copy } from '../content/copy.ts'
import type { City } from '../content/cities.ts'
import { useDocumentEscape, useEscape } from './keyboard.ts'
import { Postmark, Stamp } from './stamp.tsx'
import './postcard.css'

type Props = {
  /** A collected City: only a City in the Album may pass here, so its line never shows early. */
  city: City
  /** The Postcard's `collectedOn`, 'YYYY-MM-DD' (the Postmark date). */
  collectedOn: string
  /** The one primary button: "Add to Album" on the reveal ("Play again" in the Story 3.4 viewer). */
  actionLabel: string
  onAction: () => void
  /** Esc inside the Postcard. */
  onEscape: () => void
  /** A modal reveal: Esc anywhere on the page too (focus may have left it after a click outside). */
  modal?: boolean
}

/**
 * A Postcard (DESIGN › Postcard): a `card` with the airmail-stripe border,
 * tilted −1°. Left half: the City's line. Right half: the Postmark over the
 * small Stamp and three ruled address lines. One primary button below it,
 * described by the line. Focuses its button on mount; Esc calls `onEscape`.
 * There is no other way out (clicking outside does nothing).
 */
export function Postcard({ city, collectedOn, actionLabel, onAction, onEscape, modal = false }: Props) {
  const ref = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const lineId = useId()
  useEscape(ref, onEscape)
  useDocumentEscape(modal ? onEscape : null)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <section
      className="postcard"
      role={modal ? 'dialog' : undefined}
      aria-modal={modal ? 'true' : undefined}
      aria-label={copy.postcardFrom(city.name)}
      ref={ref}
    >
      <div className="postcard-face">
        <p className="postcard-line" id={lineId}>
          {city.line}
        </p>
        <div className="postcard-divider" aria-hidden="true" />
        <div className="postcard-address">
          <div className="postcard-marks">
            <Postmark name={city.name} date={collectedOn} />
            <Stamp city={city} size="postcard" />
          </div>
          <p className="postcard-address-line">{copy.addressTo}</p>
          <p className="postcard-address-line">{copy.addressAlbum(city.region)}</p>
          <p className="postcard-address-line">{copy.addressCity(city.name, city.country)}</p>
        </div>
      </div>
      <div className="postcard-actions">
        <button
          type="button"
          className="button button--primary"
          aria-describedby={lineId}
          ref={buttonRef}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    </section>
  )
}
