import { useEffect, useId, useRef, type FocusEvent } from 'react'
import { copy } from '../content/copy.ts'

type Props = {
  /** The line's "Hint": the same action as every other Hint control (`hintAction`). */
  onHint: () => void
  /** Move focus to the grid's tab-stop cell. */
  focusGrid: () => void
}

/**
 * "Something doesn't fit yet — want a hint?" with a default-style "Hint" button:
 * the calm inline line for a full grid that isn't the solution. It sits in the
 * side column below the action row (the solved line's slot), never over the grid.
 * Not aria-live: the cue is announced once through the shared LiveRegion.
 *
 * Focus: when the line goes away (a cell emptied, or solved) while focus is inside
 * it, focus goes to the grid; otherwise it stays put.
 */
export function FullGridLine({ onHint, focusGrid }: Props) {
  /** Tracked with focus events, as in HintPanel: activeElement drops to <body> once the line unmounts. */
  const focusInLine = useRef(false)
  const focusGridRef = useRef(focusGrid)
  /** The button is described by the line, so it isn't just a second "Hint" to a screen reader. */
  const textId = useId()

  useEffect(() => {
    focusGridRef.current = focusGrid
  }, [focusGrid])

  useEffect(
    () => () => {
      if (focusInLine.current) {
        focusInLine.current = false
        focusGridRef.current()
      }
    },
    [],
  )

  return (
    <p
      className="puzzle-status full-grid-line"
      onFocus={() => {
        focusInLine.current = true
      }}
      // A null relatedTarget means focus went nowhere (e.g. the line unmounted): keep it counted as inside.
      onBlur={(e: FocusEvent<HTMLParagraphElement>) => {
        const to = e.relatedTarget as Node | null
        if (to && !e.currentTarget.contains(to)) focusInLine.current = false
      }}
    >
      <span id={textId}>{copy.fullNotSolved}</span>
      <button type="button" className="button" aria-describedby={textId} onClick={onHint}>
        <span className="button-label">{copy.hint}</span>
      </button>
    </p>
  )
}
