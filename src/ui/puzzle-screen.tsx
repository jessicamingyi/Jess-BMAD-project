import { useCallback, useRef } from 'react'
import { copy } from '../content/copy.ts'
import { cellMarks } from '../game/assists.ts'
import { remainingByDigit } from '../game/digit-counts.ts'
import { activeHint, hintAction, hintFocusCells, hintTechnique, hintView } from '../game/hint.ts'
import { FREE_PLAY_KEY } from '../game/session.ts'
import type { Action, AppState } from '../game/types.ts'
import { ActionRow } from './action-row.tsx'
import { DigitPad } from './digit-pad.tsx'
import { HintPanel } from './hint-panel.tsx'
import { isMacPlatform, keyCaption } from './key-caption.ts'
import { useKeyboard } from './keyboard.ts'
import { ModeIndicator } from './mode-indicator.tsx'
import { SudokuGrid } from './sudoku-grid.tsx'
import './puzzle.css'

const platform = typeof navigator === 'undefined' ? '' : (navigator.platform ?? '')
const isMac = isMacPlatform(platform)

type Props = {
  /** AppState and dispatch are owned by `App`, so the Session outlives a visit to Settings. */
  state: AppState
  dispatch: (action: Action) => void
}

export function PuzzleScreen({ state, dispatch }: Props) {
  const session = state.sessions[FREE_PLAY_KEY]
  const { ui } = state
  const screenRef = useRef<HTMLDivElement>(null)
  const hint = activeHint(state, FREE_PLAY_KEY)
  // At step 2 every Hint control (H, the panel button, the action-row Hint) places the move.
  const hintNext = hintAction(hint)
  useKeyboard(screenRef, dispatch, {
    inputMode: ui.inputMode,
    selectedCell: ui.selectedCell,
    restartConfirming: ui.restartConfirming,
    hintOpen: hint !== null,
    definitionOpen: hint?.definitionOpen === true && hintTechnique(hint) !== null,
    hintAtMove: hintNext.type === 'hintApplied',
    isMac,
  })
  const focusGrid = useCallback(() => {
    screenRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus()
  }, [])

  // App renders this screen only with a Session; stay safe if it ever doesn't.
  if (!session) return null
  const solved = session.status === 'solved'

  return (
    <div className="puzzle-screen" ref={screenRef}>
      <SudokuGrid
        session={session}
        selectedCell={ui.selectedCell}
        marks={cellMarks(session, ui.selectedCell, state.settings)}
        hintCells={hintFocusCells(hint)}
        onClick={(cell) => dispatch({ type: 'cellClicked', cell })}
        onFocusCell={(cell) => dispatch({ type: 'cellSelected', cell })}
      />
      <div className="side-column">
        <HintPanel
          step={hint?.step ?? null}
          view={hintView(hint, session.digits)}
          disabled={solved || hint?.result?.kind === 'none'}
          onAdvance={() => dispatch(hintNext)}
          definitionOpen={hint?.definitionOpen === true}
          onDefinition={(open) => dispatch({ type: open ? 'techniqueDefinitionOpened' : 'techniqueDefinitionClosed' })}
          focusGrid={focusGrid}
        />
        <ModeIndicator
          entryMode={ui.entryMode}
          inputMode={ui.inputMode}
          currentDigit={ui.currentDigit}
          selectedCell={ui.selectedCell}
          onEntryMode={(mode) => dispatch({ type: 'entryModeChosen', mode })}
          onInputMode={(mode) => dispatch({ type: 'inputModeChosen', mode })}
        />
        <DigitPad
          remaining={remainingByDigit(session.digits)}
          currentDigit={ui.currentDigit}
          numberFirst={ui.inputMode === 'numberFirst'}
          onDigit={(digit) => dispatch({ type: 'digitEntered', digit })}
        />
        <ActionRow
          confirming={ui.restartConfirming}
          undoCaption={keyCaption(platform)}
          hintDisabled={solved}
          onUndo={() => dispatch({ type: 'undoRequested' })}
          onHint={() => dispatch(hintNext)}
          onRestart={() => dispatch({ type: 'restartRequested' })}
          onCancel={() => dispatch({ type: 'restartCancelled' })}
          onConfirm={() => dispatch({ type: 'restartConfirmed' })}
        />
        {solved && (
          <p className="puzzle-status">
            {copy.solvedFreePlay}{' '}
            <button type="button" className="link-button" onClick={() => dispatch({ type: 'screenChosen', screen: 'freePlay' })}>
              {copy.navFreePlay}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
