import type { Grid } from './grid.ts'
import { solve } from './solver.ts'
import { TECHNIQUES } from './techniques/index.ts'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Grade = Difficulty | 'notGradeable'

/** Highest Technique rank → Difficulty: singles Easy, naked pair Medium, pointing/claiming Hard. */
function difficultyForRank(rank: number): Difficulty {
  if (rank <= 2) return 'easy'
  if (rank === 3) return 'medium'
  return 'hard'
}

/**
 * Difficulty = the hardest Technique the solve needed; 'notGradeable' when the
 * five Techniques can't finish. Never throws.
 */
export function grade(grid: Grid): Grade {
  const { solved, steps } = solve(grid)
  if (!solved) return 'notGradeable'
  let highest = 1
  for (const step of steps) {
    const rank = TECHNIQUES.find((t) => t.id === step.technique)?.rank ?? 1
    if (rank > highest) highest = rank
  }
  return difficultyForRank(highest)
}
