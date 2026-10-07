import { describe, expect, it } from 'vitest'
import { grade } from '../../src/engine/grader.ts'
import { parseGrid } from '../../src/engine/grid.ts'
import { solve } from '../../src/engine/solver.ts'
import { PUZZLES } from './fixtures.ts'

const used = (givens: string) => new Set(solve(parseGrid(givens)).steps.map((s) => s.technique))

describe('engine/grader', () => {
  it.each(Object.entries(PUZZLES))('grades %s as declared', (_name, p) => {
    expect(grade(parseGrid(p.givens))).toBe(p.grade)
  })

  it('Easy uses singles only, including a hidden single', () => {
    const t = used(PUZZLES.easy.givens)
    expect(t.has('hiddenSingle')).toBe(true)
    expect([...t].every((x) => x === 'nakedSingle' || x === 'hiddenSingle')).toBe(true)
  })

  it('Medium needs a naked pair and nothing harder', () => {
    const t = used(PUZZLES.medium.givens)
    expect(t.has('nakedPair')).toBe(true)
    expect(t.has('pointing') || t.has('claiming')).toBe(false)
  })

  it('Hard needs pointing or claiming', () => {
    expect(used(PUZZLES.hardPointing.givens).has('pointing')).toBe(true)
    expect(used(PUZZLES.hardPointing.givens).has('claiming')).toBe(false)
    expect(used(PUZZLES.hardClaiming.givens).has('claiming')).toBe(true)
  })

  it('a Puzzle beyond the five Techniques is notGradeable, without throwing', () => {
    expect(() => grade(parseGrid(PUZZLES.beyondMvp.givens))).not.toThrow()
    expect(grade(parseGrid(PUZZLES.beyondMvp.givens))).toBe('notGradeable')
  })

  it('a grid filled completely but invalid is notGradeable', () => {
    expect(grade(parseGrid(PUZZLES.conflictingFilled.givens))).toBe('notGradeable')
  })

  it('is deterministic', () => {
    for (const p of Object.values(PUZZLES)) expect(grade(parseGrid(p.givens))).toBe(grade(parseGrid(p.givens)))
  })
})
