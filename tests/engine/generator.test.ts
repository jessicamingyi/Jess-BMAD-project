import { describe, expect, it } from 'vitest'
import { countSolutions } from '../../src/engine/brute.ts'
import { generate, grade, parseGrid, UNITS, type Difficulty } from '../../src/engine/index.ts'

/** Seeds that succeed on the first attempt (keeps the suite fast). At most three per Difficulty. */
const PINNED: Readonly<Record<Difficulty, readonly number[]>> = {
  easy: [1, 5, 6],
  medium: [6, 22, 42],
  hard: [6, 20, 21],
}

const cases = (Object.entries(PINNED) as [Difficulty, readonly number[]][]).flatMap(([d, seeds]) =>
  seeds.map((s) => [d, s] as const),
)

describe('engine/generator', () => {
  it.each(cases)('%s, seed %i: unique, graded to target, Givens ⊂ solution, valid, repeatable, first attempt', (difficulty, seed) => {
    const result = generate(seed, difficulty)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { givens, solution } = result.puzzle
    expect(result.puzzle.difficulty).toBe(difficulty)
    expect(givens).toMatch(/^[0-9]{81}$/)
    expect(solution).toMatch(/^[1-9]{81}$/)

    const g = parseGrid(givens)
    expect(countSolutions(g, 2)).toBe(1)
    expect(grade(g)).toBe(difficulty)
    for (let i = 0; i < 81; i++) if (givens[i] !== '0') expect(givens[i]).toBe(solution[i])
    const s = parseGrid(solution)
    for (const unit of UNITS) expect(new Set(unit.map((c) => s[c])).size).toBe(9)

    // Same rng stream, so a one-attempt run repeats the Puzzle exactly: repeatable, and the pin succeeds on attempt 1.
    const firstAttempt = generate(seed, difficulty, 1)
    expect(firstAttempt.ok).toBe(true)
    expect(firstAttempt).toEqual(result)
  }, 20_000)

  it('returns { ok: false } with maxAttempts 0, without throwing', () => {
    expect(generate(1, 'easy', 0)).toEqual({ ok: false })
  })

  it('returns { ok: false } for an unknown Difficulty', () => {
    expect(generate(1, 'impossible' as Difficulty)).toEqual({ ok: false })
  })
})
