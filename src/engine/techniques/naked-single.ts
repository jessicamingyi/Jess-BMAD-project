import { digitsOf, popcount } from '../candidates.ts'
import type { Technique } from '../step.ts'

/** An empty cell with exactly one candidate. Scans cells 0–80. */
export const nakedSingle: Technique = (grid, candidates) => {
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell] !== 0 || popcount(candidates[cell]) !== 1) continue
    return {
      technique: 'nakedSingle',
      placements: [{ cell, digit: digitsOf(candidates[cell])[0] }],
      eliminations: [],
      focusCells: [cell],
      unit: { kind: 'cell', index: cell },
    }
  }
  return null
}
