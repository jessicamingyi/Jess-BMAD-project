import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { countSolutions } from '../../src/engine/brute.ts'
import { formatGrid, grade, parseGrid, solve } from '../../src/engine/index.ts'

describe('sample Puzzle', () => {
  const givens = parseGrid(samplePuzzle.givens)

  it('has exactly one solution', () => {
    expect(countSolutions(givens, 2)).toBe(1)
  })

  it('the solver reaches the declared solution', () => {
    expect(formatGrid(solve(givens).grid)).toBe(samplePuzzle.solution)
  })

  it('is graded as its declared Difficulty', () => {
    expect(grade(givens)).toBe(samplePuzzle.difficulty)
  })
})
