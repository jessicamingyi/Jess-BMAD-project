import { describe, expect, it } from 'vitest'
import { countSolutions } from '../../src/engine/brute.ts'
import { parseGrid } from '../../src/engine/grid.ts'
import { PUZZLES } from './fixtures.ts'

describe('engine/brute', () => {
  it.each(Object.entries(PUZZLES))('counts solutions of %s (limit 2)', (_name, p) => {
    expect(countSolutions(parseGrid(p.givens), 2)).toBe(p.solutions)
  })

  it('returns 0 for conflicting givens without throwing', () => {
    expect(() => countSolutions(parseGrid(PUZZLES.conflicting.givens))).not.toThrow()
    expect(countSolutions(parseGrid(PUZZLES.conflicting.givens))).toBe(0)
  })

  it('defaults to limit 2 and respects a lower limit', () => {
    const multi = parseGrid(PUZZLES.multiSolution.givens)
    expect(countSolutions(multi)).toBe(2)
    expect(countSolutions(multi, 1)).toBe(1)
  })

  it('every unique fixture solution is itself a single full, valid grid', () => {
    for (const p of Object.values(PUZZLES)) {
      if (!p.solution) continue
      expect(p.solution).not.toContain('0')
      expect(countSolutions(parseGrid(p.solution), 2)).toBe(1)
      ;[...p.givens].forEach((ch, i) => {
        if (ch !== '0') expect(ch).toBe(p.solution[i])
      })
    }
  })

  it('is deterministic', () => {
    for (const p of Object.values(PUZZLES)) {
      expect(countSolutions(parseGrid(p.givens), 2)).toBe(countSolutions(parseGrid(p.givens), 2))
    }
  })
})
