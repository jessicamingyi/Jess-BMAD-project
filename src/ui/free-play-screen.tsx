import { useEffect, useId, useRef, type RefObject } from 'react'
import { copy } from '../content/copy.ts'
import type { Difficulty, FreePlayUi, Session } from '../game/types.ts'
import { useEscape } from './keyboard.ts'
import { Segmented } from './mode-indicator.tsx'
import './puzzle.css'

type Props = {
  freePlay: FreePlayUi
  /** The current Free Play Session, if any. */
  session: Session | undefined
  /** The page heading; focused (tabIndex -1) when the entry opens from the nav. */
  headingRef: RefObject<HTMLHeadingElement | null>
  onPick: (difficulty: Difficulty) => void
  onStart: (difficulty: Difficulty) => void
  onCarryOn: () => void
  onReplace: () => void
  onCancelReplace: () => void
}

const DIFFICULTIES = (['easy', 'medium', 'hard'] as const).map((value) => ({
  value,
  label: copy.difficultyName(value),
}))

/**
 * Free Play entry (UX-DR15): heading, Difficulty picker, then one of
 * "Start a Puzzle" / "Carry on" + "Start a new one" (inline replace confirm) /
 * "Finding a fair Puzzle…". A failed generation shows one calm line. No modal,
 * no spinner; the nav stays usable while generating.
 */
export function FreePlayScreen({ freePlay, session, headingRef, onPick, onStart, onCarryOn, onReplace, onCancelReplace }: Props) {
  const { picked, status, confirmingReplace } = freePlay
  const generating = status === 'generating'
  const inProgress = session?.status === 'inProgress'
  const screenRef = useRef<HTMLElement>(null)
  const startNewRef = useRef<HTMLButtonElement>(null)
  const keepGoingRef = useRef<HTMLButtonElement>(null)
  const was = useRef({ confirmingReplace, generating })
  const questionId = useId()

  useEscape(screenRef, confirmingReplace ? onCancelReplace : null)

  // Confirm opens → "Keep going"; closes → "Start a new one"; a start → the heading (the buttons give way to the status line).
  useEffect(() => {
    const prev = was.current
    was.current = { confirmingReplace, generating }
    if (generating && !prev.generating) headingRef.current?.focus()
    else if (confirmingReplace && !prev.confirmingReplace) keepGoingRef.current?.focus()
    else if (!confirmingReplace && prev.confirmingReplace) startNewRef.current?.focus()
  }, [confirmingReplace, generating, headingRef])

  let actions
  if (generating) {
    actions = null
  } else if (inProgress && confirmingReplace) {
    actions = (
      <div className="action-row action-row--confirm" role="group" aria-label={copy.freePlayReplaceLabel}>
        <p className="action-row-text" id={questionId}>
          {copy.freePlayReplaceText}
        </p>
        <div className="action-row-buttons">
          <button type="button" className="button" aria-describedby={questionId} onClick={() => onStart(picked)}>
            <span className="button-label">{copy.freePlayStartNew}</span>
          </button>
          <button
            type="button"
            className="button button--primary"
            ref={keepGoingRef}
            aria-describedby={questionId}
            onClick={onCancelReplace}
          >
            <span className="button-label">{copy.keepGoing}</span>
          </button>
        </div>
      </div>
    )
  } else if (inProgress) {
    actions = (
      <div className="action-row-buttons">
        <button type="button" className="button button--primary" onClick={onCarryOn}>
          <span className="button-label">{copy.freePlayCarryOn}</span>
        </button>
        <button type="button" className="button" ref={startNewRef} onClick={onReplace}>
          <span className="button-label">{copy.freePlayStartNew}</span>
        </button>
      </div>
    )
  } else {
    actions = (
      <div className="action-row-buttons">
        <button type="button" className="button button--primary" onClick={() => onStart(picked)}>
          <span className="button-label">{copy.freePlayStart}</span>
        </button>
      </div>
    )
  }

  return (
    <section className="free-play-screen" ref={screenRef}>
      <h1 className="free-play-heading" tabIndex={-1} ref={headingRef}>
        {copy.freePlayHeading}
      </h1>
      <Segmented<Difficulty>
        label={copy.difficultyPickerLabel}
        segments={DIFFICULTIES}
        active={picked}
        onChoose={onPick}
        disabled={generating}
      />
      {actions}
      <div role="status">
        {generating && <p className="free-play-status">{copy.freePlayGenerating}</p>}
        {status === 'failed' && <p className="free-play-error">{copy.freePlayFailed}</p>}
      </div>
    </section>
  )
}
