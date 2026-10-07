import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cellMarks } from '../../src/game/assists.ts'
import { createSession, DEFAULT_SETTINGS } from '../../src/game/session.ts'
import type { Session, Settings } from '../../src/game/types.ts'

const { givens, solution } = samplePuzzle
const base = createSession('free', samplePuzzle)
const put = (s: Session, cell: number, d: string): Session => ({
  ...s,
  digits: s.digits.slice(0, cell) + d + s.digits.slice(cell + 1),
})
const on = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...patch })
const where = (flags: readonly boolean[]) => flags.flatMap((f, i) => (f ? [i] : []))
const cellsOf = (fn: (row: number, col: number, box: number) => boolean) =>
  Array.from({ length: 81 }, (_, i) => i).filter((i) => {
    const row = Math.floor(i / 9)
    const col = i % 9
    return fn(row, col, Math.floor(row / 3) * 3 + Math.floor(col / 3))
  })

describe('game/assists cellMarks', () => {
  it('unit highlight: cell 40 lights row 4, column 4 (0-based) and the centre box (box 5) with ticks', () => {
    const marks = cellMarks(base, 40, DEFAULT_SETTINGS)
    expect(marks.units).toEqual({ row: 4, col: 4, box: 4 })
    expect(where(marks.cells.map((m) => m.highlight))).toEqual(
      cellsOf((r, c, b) => r === 4 || c === 4 || b === 4),
    )
  })

  it('unit highlight Off or nothing selected: no fills, no ticks', () => {
    for (const marks of [cellMarks(base, 40, on({ unitHighlighting: false })), cellMarks(base, null, DEFAULT_SETTINGS)]) {
      expect(marks.units).toBeNull()
      expect(marks.cells.some((m) => m.highlight)).toBe(false)
    }
  })

  it('same digit: a selected Given 7 marks every 7, Givens and player digits alike', () => {
    const given7 = givens.indexOf('7')
    const empty = [...givens].findIndex((ch, i) => ch === '0' && solution[i] === '7')
    const session = put(base, empty, '7')
    const marks = cellMarks(session, given7, DEFAULT_SETTINGS)
    const sevens = [...session.digits].flatMap((ch, i) => (ch === '7' ? [i] : []))
    expect(sevens).toContain(empty)
    expect(where(marks.cells.map((m) => m.sameDigit))).toEqual(sevens)
  })

  it('same digit: a selected player 7 marks every 7', () => {
    const empty = [...givens].findIndex((ch) => ch === '0')
    const session = put(base, empty, '7')
    const marks = cellMarks(session, empty, DEFAULT_SETTINGS)
    expect(where(marks.cells.map((m) => m.sameDigit))).toEqual(
      [...session.digits].flatMap((ch, i) => (ch === '7' ? [i] : [])),
    )
  })

  it('same digit: an empty selected cell or the Assist Off marks nothing', () => {
    const empty = givens.indexOf('0')
    expect(cellMarks(base, empty, DEFAULT_SETTINGS).cells.some((m) => m.sameDigit)).toBe(false)
    expect(cellMarks(base, givens.indexOf('7'), on({ sameDigitHighlighting: false })).cells.some((m) => m.sameDigit)).toBe(false)
    expect(cellMarks(base, null, DEFAULT_SETTINGS).cells.some((m) => m.sameDigit)).toBe(false)
  })

  it('Mistake: a player 5 where the solution is 3 is marked only with the Assist On', () => {
    const cell = [...givens].findIndex((ch, i) => ch === '0' && solution[i] === '3')
    const session = put(base, cell, '5')
    expect(where(cellMarks(session, null, on({ mistakeHighlighting: true })).cells.map((m) => m.mistake))).toEqual([cell])
    expect(cellMarks(session, null, DEFAULT_SETTINGS).cells.some((m) => m.mistake)).toBe(false)
  })

  it('Mistake ignores Notes: an empty cell whose Note is a wrong digit is not a Mistake', () => {
    const cell = givens.indexOf('0')
    const wrongDigit = (Number(solution[cell]) % 9) + 1
    const notes = base.notes.slice()
    notes[cell] = 1 << (wrongDigit - 1)
    const marks = cellMarks({ ...base, notes }, null, on({ mistakeHighlighting: true }))
    expect(marks.cells[cell].mistake).toBe(false)
    expect(marks.cells.some((m) => m.mistake)).toBe(false)
  })

  it('Mistake never marks a Given, even when digits disagree with the solution there', () => {
    const given = givens.indexOf('5')
    const wrongDigit = String((Number(solution[given]) % 9) + 1)
    const marks = cellMarks(put(base, given, wrongDigit), null, on({ mistakeHighlighting: true }))
    expect(marks.cells[given].mistake).toBe(false)
    expect(marks.cells.some((m) => m.mistake)).toBe(false)
  })

  it('stacked: a selected Mistake 7 is same digit, highlighted and a Mistake', () => {
    const cell = [...givens].findIndex((ch, i) => ch === '0' && solution[i] !== '7')
    const session = put(base, cell, '7')
    const all = on({ mistakeHighlighting: true })
    expect(cellMarks(session, cell, all).cells[cell]).toEqual({ highlight: true, sameDigit: true, mistake: true })
  })
})
