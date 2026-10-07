export type CellKind = 'given' | 'player' | 'empty'

/** User-facing strings, kept in one place. */
export const copy = {
  solvedSample: 'Solved.',
  digitPadLabel: 'Digits',
  gridLabel: 'Sudoku grid',
  /** e.g. "Row 4, column 6, 7, given" / "…, 7, your digit" / "…, empty". Row and column are 1-based. */
  cellLabel: (row: number, col: number, value: string, kind: CellKind): string => {
    const where = `Row ${row}, column ${col}`
    if (kind === 'empty') return `${where}, empty`
    return `${where}, ${value}, ${kind === 'given' ? 'given' : 'your digit'}`
  },
} as const
