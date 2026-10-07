import { copy, type CellKind } from '../content/copy.ts'
import { hasNote, noteDigits } from '../game/notes.ts'
import type { Session } from '../game/types.ts'

type Props = {
  session: Session
  selectedCell: number | null
  onClick: (cell: number) => void
}

const CELLS = Array.from({ length: 81 }, (_, i) => i)
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** 3×3 mini-grid: Note n sits in slot n; blank slots stay so positions never shift. */
function NoteGrid({ mask }: { mask: number }) {
  return (
    <span className="cell-note" aria-hidden="true">
      {DIGITS.map((d) => (
        <span key={d} className="note">
          {hasNote(mask, d) ? d : ''}
        </span>
      ))}
    </span>
  )
}

export function SudokuGrid({ session, selectedCell, onClick }: Props) {
  return (
    <div className="grid-card">
      <div className="sudoku-grid" role="group" aria-label={copy.gridLabel}>
        {CELLS.map((cell) => {
          const row = Math.floor(cell / 9)
          const col = cell % 9
          const value = session.digits[cell]
          const mask = session.notes[cell] ?? 0
          const isGiven = session.givens[cell] !== '0'
          // A placed digit hides Notes; the mask itself is kept.
          const kind: CellKind = isGiven ? 'given' : value !== '0' ? 'player' : mask !== 0 ? 'notes' : 'empty'
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
              aria-label={copy.cellLabel(row + 1, col + 1, value, kind, kind === 'notes' ? noteDigits(mask) : [])}
              aria-current={cell === selectedCell ? 'true' : undefined}
              onClick={() => onClick(cell)}
            >
              {kind === 'notes' ? <NoteGrid mask={mask} /> : value === '0' ? '' : value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
