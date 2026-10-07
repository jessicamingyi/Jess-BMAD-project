import { bit, computeCandidates } from './candidates.ts'
import { PEERS, UNITS, type Grid } from './grid.ts'
import type { Step } from './step.ts'
import { TECHNIQUES } from './techniques/index.ts'

export type SolveResult = {
  /** True only when the grid ends full and valid. */
  readonly solved: boolean
  /** The grid as far as the Techniques got. */
  readonly grid: Grid
  /** Every Step applied, in order. */
  readonly steps: readonly Step[]
}

/**
 * Apply a Step: set each placed digit (clearing its cell and removing it from
 * peers' candidates), then clear each elimination. Returns new arrays.
 */
export function applyStep(
  grid: Grid,
  candidates: readonly number[],
  step: Step,
): { grid: Grid; candidates: number[] } {
  const g = [...grid]
  const cand = [...candidates]
  for (const { cell, digit } of step.placements) {
    g[cell] = digit
    cand[cell] = 0
    for (const peer of PEERS[cell]) cand[peer] &= ~bit(digit)
  }
  for (const { cell, digit } of step.eliminations) cand[cell] &= ~bit(digit)
  return { grid: g, candidates: cand }
}

function isSolvedGrid(grid: Grid): boolean {
  if (grid.some((d) => d === 0)) return false
  return UNITS.every((unit) => new Set(unit.map((c) => grid[c])).size === 9)
}

function nextStep(grid: Grid, candidates: readonly number[]): Step | null {
  for (const { find } of TECHNIQUES) {
    const step = find(grid, candidates)
    if (step) return step
  }
  return null
}

/**
 * Solve with the five Techniques only: repeatedly apply the first registry hit
 * until the grid is full or nothing applies. Never throws; a grid beyond the
 * Techniques (or with conflicting givens) returns `solved: false` with its partial Steps.
 */
export function solve(start: Grid): SolveResult {
  let grid: Grid = [...start]
  let candidates = computeCandidates(grid)
  const steps: Step[] = []
  // Every Step places a digit or removes a live candidate, so the loop ends.
  while (grid.some((d) => d === 0)) {
    const step = nextStep(grid, candidates)
    if (!step) break
    steps.push(step)
    const next = applyStep(grid, candidates, step)
    grid = next.grid
    candidates = next.candidates
  }
  return { solved: isSolvedGrid(grid), grid, steps }
}
