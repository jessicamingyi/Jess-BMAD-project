import { computeCandidates } from './candidates.ts'
import { parseGrid, type Grid } from './grid.ts'
import { mistakeCells } from './mistakes.ts'
import { applyStep, nextStep } from './solver.ts'
import type { Step } from './step.ts'

/**
 * What a Hint found. `chain`: elimination-only Steps first, ending with the one
 * Step that places a digit. `none`: the Techniques find no placement from here.
 * `mistake`: a player digit that differs from the solution (`digit` is the
 * player's digit in `cell`); its move clears that cell.
 */
export type HintResult =
  | { readonly kind: 'chain'; readonly chain: readonly Step[] }
  | { readonly kind: 'none' }
  | { readonly kind: 'mistake'; readonly cell: number; readonly digit: number }

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

/**
 * The Hint for a Session's grid (81-char digit strings, 0 = empty): the first
 * Mistake in row-major order (never a Given, never from Notes), else
 * `findHint` on the digits. Pure; never throws.
 */
export function hintFor(givens: string, digits: string, solution: string): HintResult {
  const cell = mistakeCells(givens, digits, solution).indexOf(true)
  if (cell >= 0) return { kind: 'mistake', cell, digit: Number(digits[cell]) }
  return findHint(parseGrid(digits))
}
