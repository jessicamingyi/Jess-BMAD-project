import { computeCandidates } from './candidates.ts'
import type { Grid } from './grid.ts'
import { applyStep, nextStep } from './solver.ts'
import type { Step } from './step.ts'

/**
 * What a Hint found. `chain`: elimination-only Steps first, ending with the one
 * Step that places a digit. `none`: the Techniques find no placement from here.
 * (Story 2.4 adds `kind: 'mistake'`.)
 */
export type HintResult = { readonly kind: 'chain'; readonly chain: readonly Step[] } | { readonly kind: 'none' }

/**
 * The next move from `grid` (digits only, never Notes): run the ordered Technique
 * solver from fresh candidates until the first Step with a placement, and return
 * every Step up to and including it. Pure; never throws. Never uses `brute`.
 */
export function findHint(grid: Grid): HintResult {
  let current: Grid = grid
  let candidates = computeCandidates(current)
  const chain: Step[] = []
  // Every elimination Step removes a live candidate, so the loop ends.
  for (;;) {
    const step = nextStep(current, candidates)
    if (!step) return { kind: 'none' }
    chain.push(step)
    if (step.placements.length > 0) return { kind: 'chain', chain }
    const next = applyStep(current, candidates, step)
    current = next.grid
    candidates = next.candidates
  }
}
