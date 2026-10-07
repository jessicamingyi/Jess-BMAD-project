import { describe, expect, it } from 'vitest'
import { countSolutions } from '../../src/engine/brute.ts'
import { computeCandidates } from '../../src/engine/candidates.ts'
import { parseGrid } from '../../src/engine/grid.ts'
import type { Technique, TechniqueId } from '../../src/engine/step.ts'
import { TECHNIQUES } from '../../src/engine/techniques/index.ts'
import { NO_HIDDEN_SINGLE, POINTING_ROW, TECHNIQUE_FIXTURES } from './fixtures.ts'

const IDS: TechniqueId[] = ['nakedSingle', 'hiddenSingle', 'nakedPair', 'pointing', 'claiming']

describe('TECHNIQUES registry', () => {
  it('lists exactly the five Techniques in order, ranks 1–5', () => {
    expect(TECHNIQUES).toHaveLength(5)
    expect(TECHNIQUES.map((t) => t.id)).toEqual(IDS)
    expect(TECHNIQUES.map((t) => t.rank)).toEqual([1, 2, 3, 4, 5])
  })

  it('each find is typed Technique', () => {
    const finds: Technique[] = TECHNIQUES.map((t) => t.find)
    expect(finds.every((f) => typeof f === 'function')).toBe(true)
  })
})

describe.each(IDS)('%s', (id) => {
  const fx = TECHNIQUE_FIXTURES[id]
  const find = TECHNIQUES.find((t) => t.id === id)!.find

  it('fixture positions are valid and unique, and agree with the solution', () => {
    const grid = parseGrid(fx.applies)
    expect(countSolutions(grid, 2)).toBe(1)
    expect(countSolutions(parseGrid(fx.solution), 2)).toBe(1)
    grid.forEach((d, cell) => {
      if (d !== 0) expect(d).toBe(Number(fx.solution[cell]))
    })
    expect(countSolutions(parseGrid(fx.none), 2)).toBe(1)
  })

  it('returns the exact Step where it applies', () => {
    const grid = parseGrid(fx.applies)
    expect(find(grid, computeCandidates(grid))).toEqual(fx.step)
  })

  it('the Step is sound: placements match the solution, eliminations remove live non-solution candidates', () => {
    const grid = parseGrid(fx.applies)
    const cands = computeCandidates(grid)
    const step = find(grid, cands)!
    expect(step.placements.length + step.eliminations.length).toBeGreaterThan(0)
    for (const { cell, digit } of step.placements) {
      expect(grid[cell]).toBe(0)
      expect(digit).toBe(Number(fx.solution[cell]))
    }
    for (const { cell, digit } of step.eliminations) {
      expect(cands[cell] & (1 << (digit - 1))).not.toBe(0)
      expect(digit).not.toBe(Number(fx.solution[cell]))
    }
  })

  it('returns null where it does not apply', () => {
    const grid = parseGrid(fx.none)
    expect(find(grid, computeCandidates(grid))).toBeNull()
  })

  it('is deterministic', () => {
    const grid = parseGrid(fx.applies)
    expect(find(grid, computeCandidates(grid))).toEqual(find(grid, computeCandidates(grid)))
  })
})

describe('pointing along a row', () => {
  const grid = parseGrid(POINTING_ROW.applies)
  const cands = computeCandidates(grid)
  const step = TECHNIQUES.find((t) => t.id === 'pointing')!.find(grid, cands)

  it('returns the exact row-direction Step (unit box, eliminations on the row outside the box)', () => {
    expect(countSolutions(grid, 2)).toBe(1)
    expect(step).toEqual(POINTING_ROW.step)
  })

  it('is sound', () => {
    for (const { cell, digit } of step!.eliminations) {
      expect(Math.floor(cell / 9)).toBe(1)
      expect(cands[cell] & (1 << (digit - 1))).not.toBe(0)
      expect(digit).not.toBe(Number(POINTING_ROW.solution[cell]))
    }
  })
})

describe('the hidden-single-free position', () => {
  it('has no single, pair or pointing; only claiming applies', () => {
    const grid = parseGrid(NO_HIDDEN_SINGLE)
    const cands = computeCandidates(grid)
    const hits = TECHNIQUES.filter((t) => t.find(grid, cands) !== null).map((t) => t.id)
    expect(hits).toEqual(['claiming'])
  })
})

describe('elimination-only Techniques', () => {
  it("once a Step's eliminations are gone, the next Step differs and still removes live candidates", () => {
    for (const id of ['nakedPair', 'pointing', 'claiming'] as const) {
      const fx = TECHNIQUE_FIXTURES[id]
      const find = TECHNIQUES.find((t) => t.id === id)!.find
      const grid = parseGrid(fx.applies)
      const cands = computeCandidates(grid)
      for (const { cell, digit } of fx.step.eliminations) cands[cell] &= ~(1 << (digit - 1))
      const next = find(grid, cands)
      expect(next).not.toBeNull()
      expect(next).not.toEqual(fx.step)
      expect(next!.eliminations.length).toBeGreaterThan(0)
      expect(next!.eliminations.every(({ cell, digit }) => (cands[cell] & (1 << (digit - 1))) !== 0)).toBe(true)
    }
  })
})
