import { useEffect, useId, useRef, type FocusEvent } from 'react'
import { copy } from '../content/copy.ts'
import type { HintView } from '../game/hint.ts'
import type { HintStep } from '../game/types.ts'

type Props = {
  /** The Hint's step, or null when the panel is closed (nothing renders). */
  step: HintStep | null
  view: HintView
  /** The step button does nothing (solved, or no Hint was found). */
  disabled: boolean
  onAdvance: () => void
  /** The "What's a…" definition is open (shown only while `view.technique` is set). */
  definitionOpen: boolean
  /** Open (true) or close (false) the definition. */
  onDefinition: (open: boolean) => void
  /** Move focus to the grid's tab-stop cell. */
  focusGrid: () => void
}

/**
 * The Hint panel, first in the side column and never over the grid. A labelled
 * region with the step label, the nudge or explanation text, one stable step
 * button and the "Esc to set aside" caption. Not aria-live: the step text is
 * announced once through the shared LiveRegion.
 *
 * At steps 1 and 2 a "What's a {technique}?" link toggles the Technique's
 * definition, shown inline below it (never over the grid) with a "Close" control.
 *
 * Focus: when the panel resets to idle (including after the move is placed) or
 * closes while focus is inside it, focus goes to the grid; otherwise it stays put.
 * Opening the definition focuses it; closing it at the same step returns focus to
 * the link if focus was inside the panel, otherwise it stays put.
 */
export function HintPanel({ step, view, disabled, onAdvance, definitionOpen, onDefinition, focusGrid }: Props) {
  /** Tracked with focus events, as in ActionRow: activeElement drops to <body> once the panel unmounts. */
  const focusInPanel = useRef(false)
  const lastStep = useRef(step)
  const open = definitionOpen && view.technique !== null
  const lastOpen = useRef(open)
  const linkRef = useRef<HTMLButtonElement>(null)
  const definitionRef = useRef<HTMLDivElement>(null)
  const definitionId = useId()
  const titleId = useId()

  useEffect(() => {
    const was = lastStep.current
    const wasOpen = lastOpen.current
    lastStep.current = step
    lastOpen.current = open
    if (was !== step) {
      const shown = was === 'nudge' || was === 'explain'
      const leftPanel = step === null || (shown && step === 'idle')
      if (leftPanel) {
        if (focusInPanel.current) {
          focusInPanel.current = false
          focusGrid()
        }
        return
      }
    }
    if (wasOpen === open) return
    if (open) definitionRef.current?.focus()
    else if (was === step && focusInPanel.current) linkRef.current?.focus()
  }, [step, open, focusGrid])

  if (step === null) return null

  return (
    <div
      className="hint-panel"
      role="region"
      aria-label={copy.hintPanelLabel}
      onFocus={() => {
        focusInPanel.current = true
      }}
      // A null relatedTarget means focus went nowhere (e.g. the panel unmounted): keep it counted as inside.
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        const to = e.relatedTarget as Node | null
        if (to && !e.currentTarget.contains(to)) focusInPanel.current = false
      }}
    >
      <p className="hint-panel-label">{view.label}</p>
      {view.text !== '' && <p className="hint-panel-text">{view.text}</p>}
      {view.technique && (
        <button
          ref={linkRef}
          type="button"
          className="link-button hint-panel-link"
          aria-expanded={open}
          aria-controls={open ? definitionId : undefined}
          onClick={() => onDefinition(!open)}
        >
          {view.technique.link}
        </button>
      )}
      {open && view.technique && (
        <div
          ref={definitionRef}
          id={definitionId}
          className="hint-panel-definition"
          role="region"
          aria-labelledby={titleId}
          tabIndex={-1}
        >
          <p id={titleId} className="hint-panel-definition-title">
            {view.technique.title}
          </p>
          <p className="hint-panel-definition-text">{view.technique.definition}</p>
          <button type="button" className="link-button hint-panel-definition-close" onClick={() => onDefinition(false)}>
            {copy.hintDefinitionClose}
          </button>
        </div>
      )}
      <div className="hint-panel-actions">
        <button
          type="button"
          className="button"
          aria-disabled={disabled ? 'true' : undefined}
          onClick={() => {
            if (!disabled) onAdvance()
          }}
        >
          <span className="button-label">{view.button}</span>
        </button>
        <span className="hint-panel-caption" aria-hidden="true">
          {copy.hintSetAside}
        </span>
      </div>
    </div>
  )
}
