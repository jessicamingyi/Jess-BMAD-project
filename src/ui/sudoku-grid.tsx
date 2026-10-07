import { copy, type CellKind } from '../content/copy.ts'
import type { Session } from '../game/types.ts'

type Props = {
  session: Session
  selectedCell: number | null
  onSelect: (cell: number) => void
}

const CELLS = Array.from({ length: 81 }, (_, i) => i)

export function SudokuGrid({ session, selectedCell, onSelect }: Props) {
  return (
    <div className="grid-card">
      <div className="sudoku-grid" role="group" aria-label={copy.gridLabel}>
        {CELLS.map((cell) => {
          const row = Math.floor(cell / 9)
          const col = cell % 9
          const value = session.digits[cell]
          const isGiven = session.givens[cell] !== '0'
          const kind: CellKind = isGiven ? 'given' : value !== '0' ? 'player' : 'empty'
          const classes = [
            'sudoku-cell',
            `sudoku-cell--${kind}`,
            cell === selectedCell && 'sudoku-cell--selected',
            col > 0 && (col % 3 === 0 ? 'sudoku-cell--box-left' : 'sudoku-cell--thin-left'),
            row > 0 && (row % 3 === 0 ? 'sudoku-cell--box-top' : 'sudoku-cell--thin-top'),
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={cell}
              type="button"
              className={classes}
              aria-label={copy.cellLabel(row + 1, col + 1, value, kind)}
              aria-current={cell === selectedCell ? 'true' : undefined}
              onClick={() => onSelect(cell)}
            >
              {value === '0' ? '' : value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
