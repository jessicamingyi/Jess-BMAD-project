import { boxOf, colOf, rowOf } from '../engine/grid.ts'
import { mistakeCells } from '../engine/mistakes.ts'
import type { Session, Settings } from './types.ts'

/** The Assist marks on one cell. */
export type CellMark = {
  /** In the selected cell's row, column or box (row/column/box Assist). */
  readonly highlight: boolean
  /** Holds the same digit as the selected cell (same-digit Assist). */
  readonly sameDigit: boolean
  /** A player digit that differs from the solution (Mistake Assist, or the cell an open Mistake Hint names). */
  readonly mistake: boolean
}

/** The active row, column and box (0–8 each) for the frame ticks and box corner ticks. */
export type ActiveUnits = { readonly row: number; readonly col: number; readonly box: number }

export type GridMarks = {
  /** 81 marks, cells 0–80 row-major. */
  readonly cells: readonly CellMark[]
  /** null when nothing is selected or the row/column/box Assist is Off. */
  readonly units: ActiveUnits | null
}

const isCell = (c: number | null): c is number => c !== null && Number.isInteger(c) && c >= 0 && c < 81

/**
 * Assist marks for every cell, applying the Assist switches. Pure.
 * Highlight and same digit follow the selected cell only (in both input modes);
 * Mistakes come from `engine/mistakes` (digits, Givens, solution; never Notes).
 * `hintMistake` (from `hintMistakeCell`) is marked as a Mistake even with the Assist Off.
 */
export function cellMarks(
  session: Session,
  selectedCell: number | null,
  settings: Settings,
  hintMistake: number | null = null,
): GridMarks {
  const selected = isCell(selectedCell) ? selectedCell : null
  const units =
    selected !== null && settings.unitHighlighting
      ? { row: rowOf(selected), col: colOf(selected), box: boxOf(selected) }
      : null
  const selectedDigit = selected !== null ? session.digits[selected] : '0'
  const sameDigitOn = settings.sameDigitHighlighting && selectedDigit !== undefined && selectedDigit !== '0'
  const mistakes = settings.mistakeHighlighting
    ? mistakeCells(session.givens, session.digits, session.solution)
    : null

  const cells: CellMark[] = []
  for (let cell = 0; cell < 81; cell++) {
    cells.push({
      highlight: units !== null && (rowOf(cell) === units.row || colOf(cell) === units.col || boxOf(cell) === units.box),
      sameDigit: sameDigitOn && session.digits[cell] === selectedDigit,
      mistake: (mistakes !== null && mistakes[cell]) || cell === hintMistake,
    })
  }
  return { cells, units }
}
