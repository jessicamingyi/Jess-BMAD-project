import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { reducer } from '../../src/game/reducer.ts'
import { remainingByDigit } from '../../src/game/digit-counts.ts'
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
const click = (cell: number): Action => ({ type: 'cellClicked', cell })
const notesMode: Action = { type: 'entryModeChosen', mode: 'notes' }
const digitMode: Action = { type: 'entryModeChosen', mode: 'digit' }
const toggleInput: Action = { type: 'inputModeToggled' }

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
    expect(state.ui).toEqual({ selectedCell: null, entryMode: 'digit', inputMode: 'cellFirst', currentDigit: null })
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

describe('Notes and number-first entry', () => {
  const secondEmpty = emptyCells[1]
  const thirdEmpty = emptyCells[2]
  const notesOf = (s: AppState, cell: number) => s.sessions.free.notes[cell]

  it('note toggle: Notes mode, digitEntered(7) twice sets then clears bit 6', () => {
    const on = deepFreeze(run(fresh(), notesMode, select(firstEmpty), enter(7)))
    expect(notesOf(on, firstEmpty)).toBe(1 << 6)
    expect(on.sessions.free.digits).toBe(givens)
    expect(on.meta.lastPlayedKey).toBe('free')
    const off = reducer(on, enter(7))
    expect(notesOf(off, firstEmpty)).toBe(0)
  })

  it('note mask stays an integer 0–511 across many toggles', () => {
    let state = run(fresh(), notesMode, select(firstEmpty))
    for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 1, 5, 5, 2, 8]) {
      state = reducer(deepFreeze(state), enter(d))
      const mask = notesOf(state, firstEmpty)
      expect(Number.isInteger(mask)).toBe(true)
      expect(mask).toBeGreaterThanOrEqual(0)
      expect(mask).toBeLessThanOrEqual(511)
    }
    expect(notesOf(state, firstEmpty)).toBe(0b0_0111_1100) // Notes 3, 4, 5, 6, 7 remain
    expect(state.sessions.free.notes).toHaveLength(81)
  })

  it('note refused: Given or player-digit cell returns the same state', () => {
    const onGiven = deepFreeze(run(fresh(), notesMode, select(firstGiven)))
    expect(reducer(onGiven, enter(3))).toBe(onGiven)
    const onPlayer = deepFreeze(run(fresh(), select(firstEmpty), enter(5), notesMode))
    expect(reducer(onPlayer, enter(3))).toBe(onPlayer)
  })

  it('hide/restore: placing and clearing a digit leaves the Notes mask untouched', () => {
    const noted = run(fresh(), notesMode, select(firstEmpty), enter(3), enter(7))
    const mask = notesOf(noted, firstEmpty)
    expect(mask).toBe((1 << 2) | (1 << 6))
    const placed = deepFreeze(run(noted, digitMode, enter(5)))
    expect(placed.sessions.free.digits[firstEmpty]).toBe('5')
    expect(notesOf(placed, firstEmpty)).toBe(mask)
    const cleared = reducer(placed, enter(5))
    expect(cleared.sessions.free.digits[firstEmpty]).toBe('0')
    expect(notesOf(cleared, firstEmpty)).toBe(mask)
  })

  it('number-first choose: digitEntered(7) sets ui.currentDigit, no cell changes', () => {
    const before = deepFreeze(run(fresh(), select(firstEmpty), toggleInput))
    const chosen = reducer(before, enter(7))
    expect(chosen.ui.currentDigit).toBe(7)
    expect(chosen.sessions).toBe(before.sessions)
    expect(chosen.meta).toBe(before.meta)
    expect(reducer(deepFreeze(chosen), enter(7))).toBe(chosen)
  })

  it('number-first place: cellClicked places 7 in each empty cell; 7 stays current', () => {
    const state = run(fresh(), toggleInput, enter(7), click(firstEmpty), click(secondEmpty), click(thirdEmpty))
    for (const c of [firstEmpty, secondEmpty, thirdEmpty]) expect(state.sessions.free.digits[c]).toBe('7')
    expect(state.ui.currentDigit).toBe(7)
    expect(state.ui.selectedCell).toBe(thirdEmpty)
    expect(state.meta.lastPlayedKey).toBe('free')
  })

  it('number-first clear / Given: player 7 is cleared; a Given is selected only', () => {
    const placed = deepFreeze(run(fresh(), toggleInput, enter(7), click(firstEmpty)))
    const cleared = reducer(placed, click(firstEmpty))
    expect(cleared.sessions.free.digits[firstEmpty]).toBe('0')
    const onGiven = reducer(placed, click(firstGiven))
    expect(onGiven.ui.selectedCell).toBe(firstGiven)
    expect(onGiven.sessions).toBe(placed.sessions)
  })

  it('no current digit: number-first cellClicked only selects', () => {
    const state = deepFreeze(run(fresh(), toggleInput))
    const clicked = reducer(state, click(firstEmpty))
    expect(clicked.ui.selectedCell).toBe(firstEmpty)
    expect(clicked.sessions).toBe(state.sessions)
    expect(reducer(deepFreeze(clicked), click(firstEmpty))).toBe(clicked)
  })

  it('number-first Notes: current 4, cellClicked on an empty cell toggles Note 4', () => {
    const on = run(fresh(), notesMode, toggleInput, enter(4), click(firstEmpty))
    expect(notesOf(on, firstEmpty)).toBe(1 << 3)
    expect(on.sessions.free.digits).toBe(givens)
    const off = reducer(deepFreeze(on), click(firstEmpty))
    expect(notesOf(off, firstEmpty)).toBe(0)
  })

  it('cell-first cellClicked only selects, even with a remembered current digit', () => {
    const state = deepFreeze(run(fresh(), toggleInput, enter(7), toggleInput))
    const clicked = reducer(state, click(firstEmpty))
    expect(clicked.ui.selectedCell).toBe(firstEmpty)
    expect(clicked.sessions).toBe(state.sessions)
  })

  it('mode toggles are ui-only; choosing the active entry mode is a no-op', () => {
    const state = fresh()
    const notes = reducer(state, notesMode)
    expect(notes.ui.entryMode).toBe('notes')
    expect(notes.sessions).toBe(state.sessions)
    expect(notes.meta).toBe(state.meta)
    expect(reducer(deepFreeze(notes), notesMode)).toBe(notes)
    expect(reducer(state, digitMode)).toBe(state)
    expect(reducer(state, { type: 'entryModeChosen', mode: 'pencil' } as unknown as Action)).toBe(state)
    const flipped = reducer(state, toggleInput)
    expect(flipped.ui.inputMode).toBe('numberFirst')
    expect(flipped.sessions).toBe(state.sessions)
    expect(flipped.meta).toBe(state.meta)
    expect(reducer(deepFreeze(flipped), toggleInput).ui.inputMode).toBe('cellFirst')
  })

  it('inputModeChosen: sets the mode; same state when already active or invalid; ui-only', () => {
    const state = fresh()
    expect(reducer(state, { type: 'inputModeChosen', mode: 'cellFirst' })).toBe(state)
    expect(reducer(state, { type: 'inputModeChosen', mode: 'sideways' } as unknown as Action)).toBe(state)
    const nf = deepFreeze(reducer(state, { type: 'inputModeChosen', mode: 'numberFirst' }))
    expect(nf.ui.inputMode).toBe('numberFirst')
    expect(nf.sessions).toBe(state.sessions)
    expect(nf.meta).toBe(state.meta)
    expect(reducer(nf, { type: 'inputModeChosen', mode: 'numberFirst' })).toBe(nf)
    expect(reducer(nf, { type: 'inputModeChosen', mode: 'cellFirst' }).ui.inputMode).toBe('cellFirst')
  })

  it('inputModeToggled: flips each time', () => {
    const once = deepFreeze(reducer(fresh(), toggleInput))
    expect(once.ui.inputMode).toBe('numberFirst')
    const twice = reducer(once, toggleInput)
    expect(twice.ui.inputMode).toBe('cellFirst')
    expect(twice).not.toBe(once)
  })

  it('number-first: cellSelected only moves the selection, never places', () => {
    const state = deepFreeze(run(fresh(), toggleInput, enter(7)))
    const moved = reducer(state, select(firstEmpty))
    expect(moved.ui).toEqual({ ...state.ui, selectedCell: firstEmpty })
    expect(moved.sessions).toBe(state.sessions)
    expect(moved.meta).toBe(state.meta)
  })

  it('number-first: cellClicked on a player 5 replaces it with the current 7', () => {
    const five = deepFreeze(run(fresh(), select(firstEmpty), enter(5), toggleInput, enter(7)))
    expect(five.sessions.free.digits[firstEmpty]).toBe('5')
    const replaced = reducer(five, click(firstEmpty))
    expect(replaced.sessions.free.digits[firstEmpty]).toBe('7')
    expect(replaced.ui.currentDigit).toBe(7)
  })

  it('number-first Notes: cellClicked on a player-digit cell leaves sessions untouched', () => {
    const state = deepFreeze(run(fresh(), select(firstEmpty), enter(5), toggleInput, notesMode, enter(4)))
    const clicked = reducer(state, click(secondEmpty))
    const back = reducer(deepFreeze(clicked), click(firstEmpty))
    expect(back.ui.selectedCell).toBe(firstEmpty)
    expect(back.sessions).toBe(clicked.sessions)
    expect(back.sessions.free.digits[firstEmpty]).toBe('5')
    expect(back.sessions.free.notes[firstEmpty]).toBe(0)
  })

  it('cellClicked guards: invalid cells return the same state object', () => {
    const state = deepFreeze(run(fresh(), toggleInput, enter(7)))
    for (const cell of [-1, 81, 1.5, Number.NaN]) {
      expect(reducer(state, click(cell)), `cell ${cell}`).toBe(state)
    }
  })

  it('after a solve, Notes and number-first placements change nothing', () => {
    const last = emptyCells[emptyCells.length - 1]
    const solved = deepFreeze(run(fillAllBut(fresh(), last), select(last), enter(Number(solution[last]))))
    expect(solved.sessions.free.status).toBe('solved')
    const after = run(solved, toggleInput, enter(1), click(firstEmpty), notesMode, click(firstEmpty))
    expect(after.sessions.free).toBe(solved.sessions.free)
  })
})

describe('remainingByDigit', () => {
  it('counts 9 minus placed digits, Mistakes included, never below 0', () => {
    const fromGivens = remainingByDigit(givens)
    for (let d = 1; d <= 9; d++) {
      const placed = [...givens].filter((ch) => ch === String(d)).length
      expect(fromGivens[d], `digit ${d}`).toBe(9 - placed)
    }
    expect(remainingByDigit(solution).slice(1)).toEqual(Array(9).fill(0))
    expect(remainingByDigit('7'.repeat(81))[7]).toBe(0)
    expect(remainingByDigit('7'.repeat(81))[1]).toBe(9)
    const mistake = givens.slice(0, firstEmpty) + '5' + givens.slice(firstEmpty + 1)
    expect(remainingByDigit(mistake)[5]).toBe(fromGivens[5] - 1)
  })
})
