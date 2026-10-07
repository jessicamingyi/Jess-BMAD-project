import { useRef } from 'react'
import { copy } from '../content/copy.ts'
import { cellMarks } from '../game/assists.ts'
import { remainingByDigit } from '../game/digit-counts.ts'
import { FREE_PLAY_KEY } from '../game/session.ts'
import type { Action, AppState } from '../game/types.ts'
import { ActionRow } from './action-row.tsx'
import { DigitPad } from './digit-pad.tsx'
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
  useKeyboard(screenRef, dispatch, {
    inputMode: ui.inputMode,
    selectedCell: ui.selectedCell,
    restartConfirming: ui.restartConfirming,
    isMac,
  })

  return (
    <div className="puzzle-screen" ref={screenRef}>
      <SudokuGrid
        session={session}
        selectedCell={ui.selectedCell}
        marks={cellMarks(session, ui.selectedCell, state.settings)}
        onClick={(cell) => dispatch({ type: 'cellClicked', cell })}
        onFocusCell={(cell) => dispatch({ type: 'cellSelected', cell })}
      />
      <div className="side-column">
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
          onUndo={() => dispatch({ type: 'undoRequested' })}
          onRestart={() => dispatch({ type: 'restartRequested' })}
          onCancel={() => dispatch({ type: 'restartCancelled' })}
          onConfirm={() => dispatch({ type: 'restartConfirmed' })}
        />
        {session.status === 'solved' && <p className="puzzle-status">{copy.solvedSample}</p>}
      </div>
    </div>
  )
}
