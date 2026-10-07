import { describe, expect, it } from 'vitest'
import { computeCandidates } from '../../src/engine/candidates.ts'
import { formatGrid, parseGrid } from '../../src/engine/grid.ts'
import { applyStep, solve } from '../../src/engine/solver.ts'
import type { TechniqueId } from '../../src/engine/step.ts'
import { PUZZLES, TECHNIQUE_FIXTURES } from './fixtures.ts'

const IDS: readonly TechniqueId[] = ['nakedSingle', 'hiddenSingle', 'nakedPair', 'pointing', 'claiming']
const UNIT_KINDS = ['row', 'column', 'box', 'cell']
const STEP_KEYS = ['eliminations', 'focusCells', 'placements', 'technique', 'unit']

describe('engine/solver', () => {
  it.each(['sample', 'easy', 'medium', 'hardPointing', 'hardClaiming'] as const)('solves %s to its solution', (name) => {
    const p = PUZZLES[name]
    const result = solve(parseGrid(p.givens))
    expect(result.solved).toBe(true)
    expect(formatGrid(result.grid)).toBe(p.solution)
  })

  it('stops on a Puzzle beyond the five Techniques: solved false, no Steps, no throw', () => {
    const result = solve(parseGrid(PUZZLES.beyondMvp.givens))
    expect(result.solved).toBe(false)
    expect(result.steps).toHaveLength(0)
    expect(result.grid.some((d) => d === 0)).toBe(true)
  })

  it('returns the partial Steps when it gets stuck, and they replay onto the returned grid', () => {
    const givens = parseGrid(PUZZLES.conflicting.givens)
    const result = solve(givens)
    expect(result.solved).toBe(false)
    expect(result.steps.length).toBeGreaterThan(0)
    let grid = givens
    let cands = computeCandidates(grid)
    for (const step of result.steps) ({ grid, candidates: cands } = applyStep(grid, cands, step))
    expect(grid).toEqual(result.grid)
  })

  it.each(['conflicting', 'multiSolution'] as const)('returns solved false for %s without throwing', (name) => {
    expect(solve(parseGrid(PUZZLES[name].givens)).solved).toBe(false)
  })

  it('a grid the Techniques fill completely but that is invalid is not solved', () => {
    const result = solve(parseGrid(PUZZLES.conflictingFilled.givens))
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.grid.every((d) => d !== 0)).toBe(true)
    expect(result.solved).toBe(false)
  })

  it('every Step over every fixture has exactly the five fields and no display text', () => {
    const grids = [
      ...Object.values(PUZZLES).map((p) => p.givens),
      ...Object.values(TECHNIQUE_FIXTURES).flatMap((f) => [f.applies, f.none]),
    ]
    let seen = 0
    for (const s of grids) {
      for (const step of solve(parseGrid(s)).steps) {
        seen++
        expect(Object.keys(step).sort()).toEqual(STEP_KEYS)
        expect(IDS).toContain(step.technique)
        expect(Object.keys(step.unit).sort()).toEqual(['index', 'kind'])
        expect(UNIT_KINDS).toContain(step.unit.kind)
        expect(Number.isInteger(step.unit.index)).toBe(true)
        expect(step.focusCells.every(Number.isInteger)).toBe(true)
        for (const cd of [...step.placements, ...step.eliminations]) {
          expect(Object.keys(cd).sort()).toEqual(['cell', 'digit'])
          expect(Number.isInteger(cd.cell) && Number.isInteger(cd.digit)).toBe(true)
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('applyStep places digits, clears peers, removes eliminations, and does not mutate inputs', () => {
    const fx = TECHNIQUE_FIXTURES.nakedPair
    const grid = parseGrid(fx.applies)
    const cands = computeCandidates(grid)
    const before = [...cands]
    const out = applyStep(grid, cands, fx.step)
    expect(cands).toEqual(before)
    for (const { cell, digit } of fx.step.eliminations) expect(out.candidates[cell] & (1 << (digit - 1))).toBe(0)

    const single = TECHNIQUE_FIXTURES.nakedSingle
    const g2 = parseGrid(single.applies)
    const placed = applyStep(g2, computeCandidates(g2), single.step)
    expect(placed.grid[40]).toBe(5)
    expect(placed.candidates[40]).toBe(0)
    expect(placed.candidates[39] & (1 << 4)).toBe(0)
    expect(g2[40]).toBe(0)
  })

  it('is deterministic: two runs deep-equal', () => {
    for (const p of Object.values(PUZZLES)) {
      expect(solve(parseGrid(p.givens))).toEqual(solve(parseGrid(p.givens)))
    }
  })
})
