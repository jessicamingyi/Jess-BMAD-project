import { useReducer } from 'react'
import { copy } from '../content/copy.ts'
import { samplePuzzle } from '../content/sample-puzzle.ts'
import { reducer } from '../game/reducer.ts'
import { createInitialState, FREE_PLAY_KEY } from '../game/session.ts'
import { DigitPad } from './digit-pad.tsx'
import { SudokuGrid } from './sudoku-grid.tsx'
import './puzzle.css'

export function PuzzleScreen() {
  const [state, dispatch] = useReducer(reducer, samplePuzzle, createInitialState)
  const session = state.sessions[FREE_PLAY_KEY]

  return (
    <div className="puzzle-screen">
      <SudokuGrid
        session={session}
        selectedCell={state.ui.selectedCell}
        onSelect={(cell) => dispatch({ type: 'cellSelected', cell })}
      />
      <div className="side-column">
        <DigitPad onDigit={(digit) => dispatch({ type: 'digitEntered', digit })} />
        {session.status === 'solved' && <p className="puzzle-status">{copy.solvedSample}</p>}
      </div>
    </div>
  )
}
