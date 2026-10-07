import { countSolutions } from './brute.ts'
import { bit } from './candidates.ts'
import { grade, type Difficulty } from './grader.ts'
import { formatGrid, PEERS, type Grid } from './grid.ts'
import { createRng, shuffle } from './random.ts'

export type GeneratedPuzzle = {
  /** 81-char digit strings, cells 0–80 row-major, 0 = empty. */
  readonly givens: string
  readonly solution: string
  readonly difficulty: Difficulty
}

export type GenerateResult = { readonly ok: true; readonly puzzle: GeneratedPuzzle } | { readonly ok: false }

const RANK: Readonly<Record<Difficulty, number>> = { easy: 1, medium: 2, hard: 3 }
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
const CELLS = Array.from({ length: 81 }, (_, i) => i)

/** A full, valid solution grid by randomized backtracking (digit order shuffled per cell). */
function fillSolution(rng: () => number): number[] {
  const g: number[] = Array.from({ length: 81 }, () => 0)
  const place = (cell: number): boolean => {
    if (cell === 81) return true
    const cand = candidatesAt(g, cell)
    for (const d of shuffle(rng, DIGITS)) {
      if ((cand & bit(d)) === 0) continue
      g[cell] = d
      if (place(cell + 1)) return true
    }
    g[cell] = 0
    return false
  }
  place(0)
  return g
}

/** Candidates of one cell from its peers' digits. */
function candidatesAt(g: Grid, cell: number): number {
  let mask = 0x1ff
  for (const peer of PEERS[cell]) if (g[peer] !== 0) mask &= ~bit(g[peer])
  return mask
}

/**
 * One attempt: from a fresh solution, visit the cells in shuffled order and keep
 * each removal only while the Puzzle stays unique and gradeable at or below the
 * target. Returns the Givens and their final grade.
 */
function attempt(rng: () => number, target: Difficulty): { givens: number[]; solution: number[]; graded: string } {
  const solution = fillSolution(rng)
  const givens = [...solution]
  for (const cell of shuffle(rng, CELLS)) {
    const removed = givens[cell]
    givens[cell] = 0
    // Brute first: it rejects faster than a full Technique solve.
    if (countSolutions(givens, 2) !== 1) {
      givens[cell] = removed
      continue
    }
    const g = grade(givens)
    if (g === 'notGradeable' || RANK[g] > RANK[target]) givens[cell] = removed
  }
  return { givens, solution, graded: grade(givens) }
}

/**
 * Generate a Free Play Puzzle. Pure and deterministic per `(seed, difficulty)`:
 * one seeded rng stream drives every attempt. Accepts a Puzzle only when it has
 * exactly one solution and grades exactly to `difficulty`. Never throws; gives
 * up with `{ ok: false }` after `maxAttempts`.
 */
export function generate(seed: number, difficulty: Difficulty, maxAttempts = 40): GenerateResult {
  if (!Object.hasOwn(RANK, difficulty)) return { ok: false }
  const rng = createRng(seed)
  for (let i = 0; i < maxAttempts; i++) {
    const { givens, solution, graded } = attempt(rng, difficulty)
    if (graded === difficulty && countSolutions(givens, 2) === 1) {
      return { ok: true, puzzle: { givens: formatGrid(givens), solution: formatGrid(solution), difficulty } }
    }
  }
  return { ok: false }
}
