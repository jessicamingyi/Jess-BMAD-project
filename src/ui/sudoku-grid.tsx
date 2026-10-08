import { useEffect, useRef, type ReactNode } from 'react'
import { copy, type CellKind } from '../content/copy.ts'
import type { CSSProperties } from 'react'
import type { GridMarks } from '../game/assists.ts'
import { hasNote, noteDigits } from '../game/notes.ts'
import type { Session } from '../game/types.ts'

type Props = {
  session: Session
  selectedCell: number | null
  /** Assist marks from `game/assists` `cellMarks`; omitted means no Assist marks. */
  marks?: GridMarks
  /** Cells a Hint names (`game/hint` `hintFocusCells`): dashed ring and ", hint" in the name. */
  hintCells?: ReadonlySet<number>
  onClick: (cell: number) => void
  /** A cell received focus (Tab, arrows, click); selects it. */
  onFocusCell?: (cell: number) => void
  /** Drawn on the grid card, outside the grid (a City Puzzle's Postmark). */
  decoration?: ReactNode
  /** The Postcard reveal: the card keeps its look but takes no input or focus. */
  inert?: boolean
}

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** The L-shaped box tick a cell carries when it sits in a corner of the active box, or null. */
function boxCorner(cell: number, box: number): string | null {
  const row = Math.floor(cell / 9)
  const col = cell % 9
  if (Math.floor(row / 3) * 3 + Math.floor(col / 3) !== box) return null
  const v = row % 3 === 0 ? 't' : row % 3 === 2 ? 'b' : null
  const h = col % 3 === 0 ? 'l' : col % 3 === 2 ? 'r' : null
  return v && h ? `sudoku-cell--box-corner-${v}${h}` : null
}

/** Position of a frame tick: index 0–8 along the edge (CSS computes the offset from tokens). */
const tickStyle = (index: number) => ({ '--tick-index': index, '--tick-box-rules': Math.floor(index / 3) }) as CSSProperties

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
export function SudokuGrid({ session, selectedCell, marks, hintCells, onClick, onFocusCell, decoration, inert = false }: Props) {
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
    <div className="grid-card" inert={inert}>
      {decoration}
      {marks?.units && (
        <>
          <span className="frame-tick frame-tick--row" aria-hidden="true" style={tickStyle(marks.units.row)} />
          <span className="frame-tick frame-tick--col" aria-hidden="true" style={tickStyle(marks.units.col)} />
        </>
      )}
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
              const mark = marks?.cells[cell]
              // Marks only apply to the cells they describe: same digit to digits, Mistakes to player digits.
              const sameDigit = !!mark?.sameDigit && (kind === 'given' || kind === 'player')
              const mistake = !!mark?.mistake && kind === 'player'
              const hint = hintCells?.has(cell) ?? false
              const classes = [
                'sudoku-cell',
                `sudoku-cell--${kind}`,
                mark?.highlight && 'sudoku-cell--highlight',
                sameDigit && 'sudoku-cell--same-digit',
                mistake && 'sudoku-cell--mistake',
                selected && 'sudoku-cell--selected',
                hint && 'sudoku-cell--hint-focus',
                marks?.units && boxCorner(cell, marks.units.box),
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
                  aria-label={copy.cellLabel(
                    row + 1,
                    col + 1,
                    value,
                    kind,
                    kind === 'notes' ? noteDigits(mask) : [],
                    mistake,
                    hint,
                  )}
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
