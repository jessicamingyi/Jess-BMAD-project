/**
 * Grid primitives for the engine. Pure and deterministic.
 *
 * A Grid is 81 digits, cells 0–80 row-major, 0 = empty.
 */
export type Grid = readonly number[]

/** Where a Step happened: a row, column or box (index 0–8), or a single cell (index 0–80). */
export type Unit = {
  readonly kind: 'row' | 'column' | 'box' | 'cell'
  readonly index: number
}

/** Parse an 81-char digit string ('0' or '.' = empty). Malformed input is a programming error. */
export function parseGrid(s: string): Grid {
  if (s.length !== 81) throw new RangeError(`parseGrid: expected 81 chars, got ${s.length}`)
  const out: number[] = []
  for (const ch of s) {
    if (ch === '.') out.push(0)
    else if (ch >= '0' && ch <= '9') out.push(ch.charCodeAt(0) - 48)
    else throw new RangeError(`parseGrid: unexpected character '${ch}'`)
  }
  return out
}

/** The 81-char digit string for a Grid, 0 = empty. */
export function formatGrid(g: Grid): string {
  return g.join('')
}

export const rowOf = (cell: number): number => Math.floor(cell / 9)
export const colOf = (cell: number): number => cell % 9
export const boxOf = (cell: number): number => Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3)

function buildUnits(): readonly (readonly number[])[] {
  const units: number[][] = []
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c))
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c))
  for (let b = 0; b < 9; b++) {
    const r0 = Math.floor(b / 3) * 3
    const c0 = (b % 3) * 3
    units.push(Array.from({ length: 9 }, (_, i) => (r0 + Math.floor(i / 3)) * 9 + c0 + (i % 3)))
  }
  return units
}

/** The 27 units, in scan order: rows 0–8, then columns 0–8, then boxes 0–8. Cells ascend in each. */
export const UNITS: readonly (readonly number[])[] = buildUnits()

/** The Unit for UNITS[i]. */
export function unitAt(i: number): Unit {
  if (i < 9) return { kind: 'row', index: i }
  if (i < 18) return { kind: 'column', index: i - 9 }
  return { kind: 'box', index: i - 18 }
}

/** The 20 peers of each cell (same row, column or box, excluding itself), ascending. */
export const PEERS: readonly (readonly number[])[] = Array.from({ length: 81 }, (_, cell) => {
  const out: number[] = []
  for (let other = 0; other < 81; other++) {
    if (other === cell) continue
    if (rowOf(other) === rowOf(cell) || colOf(other) === colOf(cell) || boxOf(other) === boxOf(cell)) {
      out.push(other)
    }
  }
  return out
})
