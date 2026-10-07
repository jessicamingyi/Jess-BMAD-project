import { bit } from '../candidates.ts'
import { UNITS, boxOf, unitAt } from '../grid.ts'
import type { CellDigit, Technique } from '../step.ts'

/**
 * Within a row or column, a digit's candidates (two or more) all lie in one box:
 * the digit leaves that box outside the line. Scans rows 0–8, then columns 0–8,
 * digits 1–9. `unit` is the line; `focusCells` are the line cells holding the digit.
 */
export const claiming: Technique = (grid, candidates) => {
  for (let line = 0; line < 18; line++) {
    const lineCells = UNITS[line]
    for (let digit = 1; digit <= 9; digit++) {
      const b = bit(digit)
      const spots = lineCells.filter((c) => grid[c] === 0 && (candidates[c] & b) !== 0)
      if (spots.length < 2) continue
      const box = boxOf(spots[0])
      if (!spots.every((c) => boxOf(c) === box)) continue
      const eliminations: CellDigit[] = UNITS[18 + box]
        .filter((c) => !lineCells.includes(c) && grid[c] === 0 && (candidates[c] & b) !== 0)
        .map((cell) => ({ cell, digit }))
      if (eliminations.length === 0) continue
      return { technique: 'claiming', placements: [], eliminations, focusCells: spots, unit: unitAt(line) }
    }
  }
  return null
}
