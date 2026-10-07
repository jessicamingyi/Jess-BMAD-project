import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { Action, AppState } from '../../src/game/types.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const select = (cell: number): Action => ({ type: 'cellSelected', cell })
const enter = (digit: number): Action => ({ type: 'digitEntered', digit })

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
const firstEmpty = emptyCells[0]
const firstGiven = givens.indexOf('5')
const fresh = () => deepFreeze(createInitialState(samplePuzzle))

/** Fill every empty cell with the solution except `skip`, which is left empty. */
function fillAllBut(state: AppState, skip: number): AppState {
  return run(
    state,
    ...emptyCells.filter((c) => c !== skip).flatMap((c) => [select(c), enter(Number(solution[c]))]),
  )
}

describe('sample Puzzle fixture', () => {
  it('has a solution that is a valid Sudoku agreeing with every Given', () => {
    expect(givens).toMatch(/^[0-9]{81}$/)
    expect(solution).toMatch(/^[1-9]{81}$/)
    for (let i = 0; i < 81; i++) {
      if (givens[i] !== '0') expect(solution[i], `cell ${i}`).toBe(givens[i])
    }
    const units: number[][] = []
    for (let k = 0; k < 9; k++) {
      units.push(Array.from({ length: 9 }, (_, j) => k * 9 + j))
      units.push(Array.from({ length: 9 }, (_, j) => j * 9 + k))
      const r0 = Math.floor(k / 3) * 3
      const c0 = (k % 3) * 3
      units.push(Array.from({ length: 9 }, (_, j) => (r0 + Math.floor(j / 3)) * 9 + c0 + (j % 3)))
    }
    for (const unit of units) {
      expect(new Set(unit.map((c) => solution[c])).size).toBe(9)
    }
  })
})

describe('game reducer', () => {
  it('startup: builds sessions.free from the fixture', () => {
    const state = fresh()
    expect(state.sessions.free).toEqual({
      key: 'free',
      givens,
      solution,
      digits: givens,
      notes: Array(81).fill(0),
      status: 'inProgress',
      difficulty: 'easy',
      hintsUsed: 0,
    })
    expect(state.ui.selectedCell).toBeNull()
    expect(state.meta.lastPlayedKey).toBeNull()
  })

  it('select: sets ui.selectedCell, Givens included', () => {
    expect(run(fresh(), select(firstEmpty)).ui.selectedCell).toBe(firstEmpty)
    expect(run(fresh(), select(firstGiven)).ui.selectedCell).toBe(firstGiven)
  })

  it('place / replace: the cell holds 5, then 8', () => {
    const placed = run(fresh(), select(firstEmpty), enter(5))
    expect(placed.sessions.free.digits[firstEmpty]).toBe('5')
    expect(placed.meta.lastPlayedKey).toBe('free')
    const replaced = reducer(deepFreeze(placed), enter(8))
    expect(replaced.sessions.free.digits[firstEmpty]).toBe('8')
  })

  it('same digit clears the cell', () => {
    const placed = deepFreeze(run(fresh(), select(firstEmpty), enter(5)))
    const cleared = reducer(placed, enter(5))
    expect(cleared.sessions.free.digits[firstEmpty]).toBe('0')
    expect(cleared.sessions.free.digits).toBe(givens)
  })

  it('given: digitEntered returns the same state object', () => {
    const state = deepFreeze(run(fresh(), select(firstGiven)))
    expect(reducer(state, enter(3))).toBe(state)
  })

  it('no selection: digitEntered returns the same state object', () => {
    const state = fresh()
    expect(reducer(state, enter(3))).toBe(state)
  })

  it('mistake: a wrong digit is stored like any player digit and stays inProgress', () => {
    const right = Number(solution[firstEmpty])
    const wrong = right === 9 ? 1 : right + 1
    const state = run(fresh(), select(firstEmpty), enter(wrong))
    expect(state.sessions.free.digits[firstEmpty]).toBe(String(wrong))
    expect(state.sessions.free.status).toBe('inProgress')
  })

  it('full, wrong: filling the last cell with a wrong digit stays inProgress with input live', () => {
    const last = emptyCells[emptyCells.length - 1]
    const right = Number(solution[last])
    const wrong = right === 9 ? 1 : right + 1
    const full = deepFreeze(run(fillAllBut(fresh(), last), select(last), enter(wrong)))
    expect(full.sessions.free.digits).not.toContain('0')
    expect(full.sessions.free.status).toBe('inProgress')
    const fixed = reducer(full, enter(right))
    expect(fixed).not.toBe(full)
    expect(fixed.sessions.free.digits[last]).toBe(String(right))
  })

  it('solve: the last correct digit sets solved in the same step; later digitEntered is a no-op', () => {
    const last = emptyCells[emptyCells.length - 1]
    const almost = deepFreeze(run(fillAllBut(fresh(), last), select(last)))
    expect(almost.sessions.free.status).toBe('inProgress')
    const solved = deepFreeze(reducer(almost, enter(Number(solution[last]))))
    expect(solved.sessions.free.digits).toBe(solution)
    expect(solved.sessions.free.status).toBe('solved')
    expect(reducer(solved, enter(Number(solution[last])))).toBe(solved)
    expect(reducer(solved, enter(1))).toBe(solved)
    const otherCell = run(solved, select(firstEmpty))
    expect(reducer(otherCell, enter(1)).sessions.free).toBe(solved.sessions.free)
  })

  it('immutability: changing actions return new state and leave the frozen input untouched', () => {
    const input = fresh()
    const snapshot = structuredClone(input)
    const selected = reducer(input, select(firstEmpty))
    expect(selected).not.toBe(input)
    const placed = reducer(deepFreeze(selected), enter(4))
    expect(placed).not.toBe(selected)
    expect(input).toEqual(snapshot)
    expect(selected.sessions.free.digits).toBe(givens)
    expect(selected.meta.lastPlayedKey).toBeNull()
  })

  it('no-op guards: invalid or redundant actions return the same state object', () => {
    const state = fresh()
    for (const cell of [-1, 81, 1.5, Number.NaN]) {
      expect(reducer(state, select(cell)), `cell ${cell}`).toBe(state)
    }
    const selected = deepFreeze(run(fresh(), select(firstEmpty)))
    expect(reducer(selected, select(firstEmpty))).toBe(selected)
    for (const digit of [0, 10, 2.5]) {
      expect(reducer(selected, enter(digit)), `digit ${digit}`).toBe(selected)
    }
    expect(reducer(selected, { type: 'somethingElse' } as unknown as Action)).toBe(selected)
  })
})
