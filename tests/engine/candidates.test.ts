import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { computeCandidates } from '../../src/engine/candidates.ts'
import { formatGrid, parseGrid, PEERS, UNITS } from '../../src/engine/grid.ts'

const mask = (...digits: number[]) => digits.reduce((m, d) => m | (1 << (d - 1)), 0)

describe('engine/grid', () => {
  it('round-trips an 81-char digit string', () => {
    const g = parseGrid(samplePuzzle.givens)
    expect(g).toHaveLength(81)
    expect(formatGrid(g)).toBe(samplePuzzle.givens)
  })

  it('has 27 units (rows, then columns, then boxes) and 20 peers per cell', () => {
    expect(UNITS).toHaveLength(27)
    expect(UNITS[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(UNITS[9]).toEqual([0, 9, 18, 27, 36, 45, 54, 63, 72])
    expect(UNITS[18]).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20])
    expect(UNITS[26]).toEqual([60, 61, 62, 69, 70, 71, 78, 79, 80])
    expect(PEERS.every((p) => p.length === 20)).toBe(true)
  })
})

describe('engine/candidates', () => {
  const givens = parseGrid(samplePuzzle.givens)
  const cands = computeCandidates(givens)

  it('returns 81 masks, 0 for filled cells', () => {
    expect(cands).toHaveLength(81)
    givens.forEach((d, cell) => {
      if (d !== 0) expect(cands[cell]).toBe(0)
      else expect(cands[cell]).toBeGreaterThan(0)
    })
  })

  it('cell 2 (r1c3) holds exactly {1, 2, 4}', () => {
    expect(cands[2]).toBe(mask(1, 2, 4))
  })

  it('every empty cell keeps its solution digit and no peer digit', () => {
    givens.forEach((d, cell) => {
      if (d !== 0) return
      expect(cands[cell] & mask(Number(samplePuzzle.solution[cell]))).not.toBe(0)
      for (const p of PEERS[cell]) if (givens[p] !== 0) expect(cands[cell] & mask(givens[p])).toBe(0)
    })
  })
})
