import { digitsOf, popcount } from '../candidates.ts'
import { UNITS, unitAt } from '../grid.ts'
import type { CellDigit, Technique } from '../step.ts'

/**
 * Two empty cells of a unit with the same two candidates: those digits leave the
 * unit's other cells. Scans units in order, then cell pairs in ascending order.
 * Only returns a Step that removes at least one live candidate.
 */
export const nakedPair: Technique = (grid, candidates) => {
  for (let u = 0; u < UNITS.length; u++) {
    const cells = UNITS[u].filter((c) => grid[c] === 0)
    for (let i = 0; i < cells.length; i++) {
      const a = cells[i]
      const mask = candidates[a]
      if (popcount(mask) !== 2) continue
      for (let j = i + 1; j < cells.length; j++) {
        const b = cells[j]
        if (candidates[b] !== mask) continue
        const eliminations: CellDigit[] = []
        for (const c of cells) {
          if (c === a || c === b) continue
          for (const digit of digitsOf(candidates[c] & mask)) eliminations.push({ cell: c, digit })
        }
        if (eliminations.length === 0) continue
        return { technique: 'nakedPair', placements: [], eliminations, focusCells: [a, b], unit: unitAt(u) }
      }
    }
  }
  return null
}
