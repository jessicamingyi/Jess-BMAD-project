import { bit, computeCandidates, popcount } from './candidates.ts'
import { PEERS, type Grid } from './grid.ts'

/**
 * Solution counter for the generator and build verification only. Never used by
 * the solver, grader or Hints (enforced by tests/architecture).
 *
 * Deterministic backtracking: fewest-candidates empty cell first (lowest index on
 * ties), digits 1–9. Stops at `limit`. Conflicting givens → 0. Never throws.
 */
export function countSolutions(grid: Grid, limit = 2): number {
  for (let cell = 0; cell < 81; cell++) {
    const d = grid[cell]
    if (d !== 0 && PEERS[cell].some((p) => grid[p] === d)) return 0
  }
  const g = [...grid]
  let count = 0

  const search = (cand: readonly number[]): void => {
    let best = -1
    let bestCount = 10
    for (let cell = 0; cell < 81; cell++) {
      if (g[cell] !== 0) continue
      const n = popcount(cand[cell])
      if (n < bestCount) {
        best = cell
        bestCount = n
        if (n === 0) return
      }
    }
    if (best === -1) {
      count++
      return
    }
    for (let digit = 1; digit <= 9 && count < limit; digit++) {
      if ((cand[best] & bit(digit)) === 0) continue
      const next = [...cand]
      g[best] = digit
      next[best] = 0
      for (const peer of PEERS[best]) next[peer] &= ~bit(digit)
      search(next)
      g[best] = 0
    }
  }

  if (limit > 0) search(computeCandidates(g))
  return count
}
