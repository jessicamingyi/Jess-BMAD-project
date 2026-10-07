import { useEffect, useId, useRef, type FocusEvent } from 'react'
import { copy } from '../content/copy.ts'

type Props = {
  /** Show the inline Restart confirm in place of Undo · Restart. */
  confirming: boolean
  /** Undo key caption, e.g. "Ctrl+Z" or "⌘Z" (see `keyCaption`). */
  undoCaption: string
  onUndo: () => void
  onRestart: () => void
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Undo · Restart (UX-DR13). Restart's confirm replaces the row inline: no overlay,
 * and the row keeps its height so the grid never moves. Focus goes to "Keep going"
 * when the confirm opens, and back to "Restart" when it closes if focus was in the row.
 */
export function ActionRow({ confirming, undoCaption, onUndo, onRestart, onCancel, onConfirm }: Props) {
  const restartRef = useRef<HTMLButtonElement>(null)
  const keepGoingRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(confirming)
  /**
   * Whether focus is inside the row container. This is tracked with focus events
   * because document.activeElement drops to <body> once the focused button unmounts
   * (Keep going), and the lint rules forbid reading refs during render.
   */
  const focusInRow = useRef(false)
  const questionId = useId()
  const rowFocus = {
    onFocus: () => {
      focusInRow.current = true
    },
    // A null relatedTarget means focus went nowhere (e.g. the focused button unmounted):
    // keep it counted as in the row. Only focus landing elsewhere clears it.
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      const to = e.relatedTarget as Node | null
      if (to && !e.currentTarget.contains(to)) focusInRow.current = false
    },
  }

  useEffect(() => {
    if (wasConfirming.current === confirming) return
    wasConfirming.current = confirming
    if (confirming) keepGoingRef.current?.focus()
    else if (focusInRow.current) restartRef.current?.focus()
  }, [confirming])

  if (confirming) {
    return (
      <div
        {...rowFocus}
        className="action-row action-row--confirm"
        role="group"
        aria-label={copy.restartConfirmLabel}
      >
        <p className="action-row-text" id={questionId}>
          {copy.restartConfirmText}
        </p>
        <div className="action-row-buttons">
          <button type="button" className="button" aria-describedby={questionId} onClick={onConfirm}>
            <span className="button-label">{copy.restart}</span>
          </button>
          <button
            type="button"
            className="button button--primary"
            ref={keepGoingRef}
            aria-describedby={questionId}
            onClick={onCancel}
          >
            <span className="button-label">{copy.keepGoing}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div {...rowFocus} className="action-row" role="group" aria-label={copy.actionRowLabel}>
      <div className="action-row-buttons">
        <button type="button" className="button" onClick={onUndo}>
          <span className="button-label">{copy.undo}</span>
          <span className="button-caption" aria-hidden="true">
            {undoCaption}
          </span>
        </button>
        <button type="button" className="button" ref={restartRef} onClick={onRestart}>
          <span className="button-label">{copy.restart}</span>
        </button>
      </div>
    </div>
  )
}
