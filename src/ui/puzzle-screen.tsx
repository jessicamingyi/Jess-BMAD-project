import { useReducer } from 'react'
import { copy } from '../content/copy.ts'
import { samplePuzzle } from '../content/sample-puzzle.ts'
import { remainingByDigit } from '../game/digit-counts.ts'
import { reducer } from '../game/reducer.ts'
import { createInitialState, FREE_PLAY_KEY } from '../game/session.ts'
import { ActionRow } from './action-row.tsx'
import { DigitPad } from './digit-pad.tsx'
import { keyCaption } from './key-caption.ts'
import { ModeIndicator } from './mode-indicator.tsx'
import { SudokuGrid } from './sudoku-grid.tsx'
import './puzzle.css'

const platform = typeof navigator === 'undefined' ? '' : (navigator.platform ?? '')

export function PuzzleScreen() {
  const [state, dispatch] = useReducer(reducer, samplePuzzle, createInitialState)
  const session = state.sessions[FREE_PLAY_KEY]
  const { ui } = state

  return (
    <div className="puzzle-screen">
      <SudokuGrid
        session={session}
        selectedCell={ui.selectedCell}
        onClick={(cell) => dispatch({ type: 'cellClicked', cell })}
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
