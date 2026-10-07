import { describe, expect, it } from 'vitest'
import { parseGrid } from '../../src/engine/grid.ts'
import { findHint, type HintResult } from '../../src/engine/hints.ts'
import { countSolutions } from '../../src/engine/brute.ts'
import type { Step } from '../../src/engine/step.ts'
import { TECHNIQUES } from '../../src/engine/techniques/index.ts'
import { HINT_POSITIONS, PUZZLES } from './fixtures.ts'


const chainOf = (digits: string): readonly Step[] => {
  const r = findHint(parseGrid(digits))
  if (r.kind !== 'chain') throw new Error(`expected a chain for ${digits}`)
  return r.chain
}

describe('findHint', () => {
  it('returns { kind: "none" } without throwing when the Techniques find no placement (Inkala)', () => {
    expect(() => findHint(parseGrid(PUZZLES.beyondMvp.givens))).not.toThrow()
    expect(findHint(parseGrid(PUZZLES.beyondMvp.givens))).toEqual({ kind: 'none' })
  })

  it('returns none for a full grid', () => {
    expect(findHint(parseGrid(PUZZLES.sample.solution))).toEqual({ kind: 'none' })
  })

  it('reads only the digits it is given and never mutates them; same digits, same result', () => {
    const grid = parseGrid(HINT_POSITIONS.pointing)
    const copy = [...grid]
    const a = findHint(grid)
    expect(grid).toEqual(copy)
    expect(findHint(parseGrid(HINT_POSITIONS.pointing))).toEqual(a)
  })

  it('every chain: elimination-only Steps first, and only the last Step places', () => {
    for (const [name, digits] of Object.entries(HINT_POSITIONS)) {
      const chain = chainOf(digits)
      expect(chain.length, name).toBeGreaterThan(0)
      chain.slice(0, -1).forEach((s) => {
        expect(s.placements, name).toEqual([])
        expect(s.eliminations.length, name).toBeGreaterThan(0)
      })
      expect(chain[chain.length - 1].placements.length, name).toBeGreaterThan(0)
    }
  })

  it('naked and hidden single: the last (only) Step names the Technique', () => {
    for (const id of ['nakedSingle', 'hiddenSingle'] as const) {
      const chain = chainOf(HINT_POSITIONS[id])
      expect(chain[chain.length - 1].technique, id).toBe(id)
    }
    expect(chainOf(HINT_POSITIONS.nakedSingle)).toEqual([
      { technique: 'nakedSingle', placements: [{ cell: 40, digit: 5 }], eliminations: [], focusCells: [40], unit: { kind: 'cell', index: 40 } },
    ])
    expect(chainOf(HINT_POSITIONS.hiddenSingle)[0]).toMatchObject({ placements: [{ cell: 2, digit: 3 }], unit: { kind: 'row', index: 0 } })
  })

  it('naked pair, pointing and claiming: the first Step names the Technique and the chain ends in a placement', () => {
    for (const id of ['nakedPair', 'pointing', 'claiming'] as const) {
      const chain = chainOf(HINT_POSITIONS[id])
      expect(chain[0].technique, id).toBe(id)
      expect(chain.length, id).toBeGreaterThan(1)
      expect(chain[chain.length - 1].placements.length, id).toBe(1)
    }
    expect(chainOf(HINT_POSITIONS.pointing).map((s) => s.technique)).toEqual(['pointing', 'pointing', 'nakedSingle'])
  })

  it('the placement is sound: the position keeps exactly one solution with it placed', () => {
    for (const [name, digits] of Object.entries(HINT_POSITIONS)) {
      const grid = [...parseGrid(digits)]
      expect(countSolutions(grid), name).toBe(1)
      const chain = chainOf(digits)
      for (const { cell, digit } of chain[chain.length - 1].placements) grid[cell] = digit
      expect(countSolutions(grid), name).toBe(1)
    }
  })

  it('every Step has exactly the five keys and no display text', () => {
    const ids = new Set(TECHNIQUES.map((t) => t.id))
    const results: HintResult[] = Object.values(HINT_POSITIONS).map((d) => findHint(parseGrid(d)))
    for (const r of results) {
      if (r.kind !== 'chain') throw new Error('expected a chain')
      for (const s of r.chain) {
        expect(Object.keys(s).sort()).toEqual(['eliminations', 'focusCells', 'placements', 'technique', 'unit'])
        expect(ids.has(s.technique)).toBe(true)
        expect(Object.keys(s.unit).sort()).toEqual(['index', 'kind'])
        // The only strings are the Technique id and the unit kind.
        const strings: string[] = []
        JSON.stringify(s, (_k, v: unknown) => {
          if (typeof v === 'string') strings.push(v)
          return v
        })
        expect(strings.sort()).toEqual([s.technique, s.unit.kind].sort())
      }
    }
  })
})
