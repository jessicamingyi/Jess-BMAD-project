import { useEffect, useRef } from 'react'
import { copy, type CellKind } from '../content/copy.ts'
import { hasNote, noteDigits } from '../game/notes.ts'
import type { Session } from '../game/types.ts'

type Props = {
  session: Session
  selectedCell: number | null
  onClick: (cell: number) => void
  /** A cell received focus (Tab, arrows, click); selects it. */
  onFocusCell?: (cell: number) => void
}

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
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

/**
 * ARIA grid (UX-DR61): 9 rows of gridcell buttons with a roving tabindex. The
 * selected cell (or cell 0) is the one tab stop; selection moves focus there,
 * and focusing a cell selects it. Keys are handled by `ui/keyboard`, not here.
 */
export function SudokuGrid({ session, selectedCell, onClick, onFocusCell }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const lastSelected = useRef(selectedCell)
  const tabStop = selectedCell ?? 0

  useEffect(() => {
    if (lastSelected.current === selectedCell) return
    lastSelected.current = selectedCell
    if (selectedCell === null) return
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${selectedCell}"]`)
    if (cell && cell !== document.activeElement) cell.focus()
  }, [selectedCell])

  return (
    <div className="grid-card">
      <div className="sudoku-grid" role="grid" aria-label={copy.gridLabel} ref={gridRef}>
        {ROWS.map((row) => (
          <div key={row} className="sudoku-row" role="row">
            {ROWS.map((col) => {
              const cell = row * 9 + col
              const value = session.digits[cell]
              const mask = session.notes[cell] ?? 0
              const isGiven = session.givens[cell] !== '0'
              // A placed digit hides Notes; the mask itself is kept.
              const kind: CellKind = isGiven ? 'given' : value !== '0' ? 'player' : mask !== 0 ? 'notes' : 'empty'
              const selected = cell === selectedCell
              const classes = [
                'sudoku-cell',
                `sudoku-cell--${kind}`,
                selected && 'sudoku-cell--selected',
                col > 0 && (col % 3 === 0 ? 'sudoku-cell--box-left' : 'sudoku-cell--thin-left'),
                row > 0 && (row % 3 === 0 ? 'sudoku-cell--box-top' : 'sudoku-cell--thin-top'),
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={cell}
                  type="button"
                  role="gridcell"
                  className={classes}
                  data-cell={cell}
                  tabIndex={cell === tabStop ? 0 : -1}
                  aria-label={copy.cellLabel(row + 1, col + 1, value, kind, kind === 'notes' ? noteDigits(mask) : [])}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onClick(cell)}
                  onFocus={() => onFocusCell?.(cell)}
                >
                  {kind === 'notes' ? <NoteGrid mask={mask} /> : value === '0' ? '' : value}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
