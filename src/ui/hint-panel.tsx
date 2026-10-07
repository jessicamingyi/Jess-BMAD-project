import { useEffect, useRef, type FocusEvent } from 'react'
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
  /** Move focus to the grid's tab-stop cell. */
  focusGrid: () => void
}

/**
 * The Hint panel, first in the side column and never over the grid. A labelled
 * region with the step label, the nudge or explanation text, one stable step
 * button and the "Esc to set aside" caption. Not aria-live: the step text is
 * announced once through the shared LiveRegion.
 *
 * Focus: when the panel resets to idle (including after the move is placed) or
 * closes while focus is inside it, focus goes to the grid; otherwise it stays put.
 */
export function HintPanel({ step, view, disabled, onAdvance, focusGrid }: Props) {
  /** Tracked with focus events, as in ActionRow: activeElement drops to <body> once the panel unmounts. */
  const focusInPanel = useRef(false)
  const lastStep = useRef(step)

  useEffect(() => {
    const was = lastStep.current
    lastStep.current = step
    if (was === step) return
    const shown = was === 'nudge' || was === 'explain'
    const leftPanel = step === null || (shown && step === 'idle')
    if (leftPanel && focusInPanel.current) {
      focusInPanel.current = false
      focusGrid()
    }
  }, [step, focusGrid])

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
