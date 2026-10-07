import { bit } from '../candidates.ts'
import { UNITS, colOf, rowOf } from '../grid.ts'
import type { CellDigit, Technique } from '../step.ts'

/**
 * Within a box, a digit's candidates (two or more) all lie on one row or column:
 * the digit leaves that line outside the box. Scans boxes 0–8, digits 1–9.
 * Two or more cells can share at most one line, so each (box, digit) has at most
 * one line to check. `unit` is the box; `focusCells` are the box cells holding the digit.
 */
export const pointing: Technique = (grid, candidates) => {
  for (let box = 0; box < 9; box++) {
    const boxCells = UNITS[18 + box]
    for (let digit = 1; digit <= 9; digit++) {
      const b = bit(digit)
      const spots = boxCells.filter((c) => grid[c] === 0 && (candidates[c] & b) !== 0)
      if (spots.length < 2) continue
      let line: number
      if (spots.every((c) => rowOf(c) === rowOf(spots[0]))) line = rowOf(spots[0])
      else if (spots.every((c) => colOf(c) === colOf(spots[0]))) line = 9 + colOf(spots[0])
      else continue
      const eliminations: CellDigit[] = UNITS[line]
        .filter((c) => !boxCells.includes(c) && grid[c] === 0 && (candidates[c] & b) !== 0)
        .map((cell) => ({ cell, digit }))
      if (eliminations.length === 0) continue
      return { technique: 'pointing', placements: [], eliminations, focusCells: spots, unit: { kind: 'box', index: box } }
    }
  }
  return null
}
