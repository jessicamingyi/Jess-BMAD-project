export type CellKind = 'given' | 'player' | 'notes' | 'empty'

/** User-facing strings, kept in one place. */
export const copy = {
  solvedSample: 'Solved.',
  digitPadLabel: 'Digits',
  gridLabel: 'Sudoku grid',
  /**
   * e.g. "Row 4, column 6, 7, given" / "…, 7, your digit" / "…, notes 3, 7" / "…, empty".
   * Row and column are 1-based; `notes` is only read for kind 'notes'.
   */
  cellLabel: (row: number, col: number, value: string, kind: CellKind, notes: readonly number[] = []): string => {
    const where = `Row ${row}, column ${col}`
    if (kind === 'empty') return `${where}, empty`
    if (kind === 'notes') return `${where}, notes ${notes.join(', ')}`
    return `${where}, ${value}, ${kind === 'given' ? 'given' : 'your digit'}`
  },

  /** Digit pad captions and accessible names. */
  padRemaining: (n: number): string => `${n} left`,
  padDone: 'Done',
  padKeyLabel: (digit: number, remaining: number): string =>
    remaining === 0 ? `${digit}, all placed` : `${digit}, ${remaining} left`,

  /** Mode indicator: "Digit | Notes (N)" and "Cell first | Number first". */
  entryModeLabel: 'Entry mode',
  entryDigit: 'Digit',
  entryNotes: 'Notes',
  entryModeKey: '(N)',
  inputModeLabel: 'Input mode',
  inputCellFirst: 'Cell first',
  inputNumberFirst: 'Number first',

  /** Status line, e.g. "cell-first · Notes · row 4, column 6" or "number-first · Digit · 7". */
  statusLine: (input: string, entry: string, target: string): string => `${input} · ${entry} · ${target}`,
  statusCellFirst: 'cell-first',
  statusNumberFirst: 'number-first',
  statusCell: (row: number, col: number): string => `row ${row}, column ${col}`,
  statusChooseCell: 'choose a cell',
  statusChooseDigit: 'choose a digit',
} as const
