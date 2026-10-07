import { bit } from '../candidates.ts'
import { UNITS, unitAt } from '../grid.ts'
import type { Technique } from '../step.ts'

/** A digit that fits only one empty cell of a unit. Scans units in order, digits 1–9. */
export const hiddenSingle: Technique = (grid, candidates) => {
  for (let u = 0; u < UNITS.length; u++) {
    const cells = UNITS[u]
    for (let digit = 1; digit <= 9; digit++) {
      if (cells.some((c) => grid[c] === digit)) continue
      const spots = cells.filter((c) => grid[c] === 0 && (candidates[c] & bit(digit)) !== 0)
      if (spots.length !== 1) continue
      const [cell] = spots
      return {
        technique: 'hiddenSingle',
        placements: [{ cell, digit }],
        eliminations: [],
        focusCells: [cell],
        unit: unitAt(u),
      }
    }
  }
  return null
}
