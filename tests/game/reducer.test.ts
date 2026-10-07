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
    expect(state.ui).toEqual({
      screen: 'puzzle',
      selectedCell: null,
      entryMode: 'digit',
      inputMode: 'cellFirst',
      currentDigit: null,
      undo: [],
      restartConfirming: false,
      announcement: null,
      freePlay: { picked: 'easy', requestId: 0, status: 'idle', confirmingReplace: false },
    })
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

describe('Undo and Restart', () => {
  const undo: Action = { type: 'undoRequested' }
  const restartRequested: Action = { type: 'restartRequested' }
  const restartCancelled: Action = { type: 'restartCancelled' }
  const restartConfirmed: Action = { type: 'restartConfirmed' }
  const secondEmpty = emptyCells[1]
  const zeros = Array(81).fill(0)
  const grid = (s: AppState) => ({ digits: s.sessions.free.digits, notes: s.sessions.free.notes })

  /** A digit and a Note on the grid. */
  const messy = () =>
    deepFreeze(run(fresh(), select(firstEmpty), enter(5), notesMode, select(secondEmpty), enter(3), digitMode))

  it('undo chain: each Undo reverts exactly one change, in reverse, back to the Givens', () => {
    const s1 = run(fresh(), select(firstEmpty), enter(5))
    const s2 = run(s1, select(secondEmpty), enter(8))
    const s3 = run(s2, notesMode, select(emptyCells[2]), enter(3))
    const s4 = run(s3, digitMode, select(secondEmpty), enter(8))
    expect(s4.sessions.free.digits[secondEmpty]).toBe('0')
    expect(s4.ui.undo).toHaveLength(4)

    const u1 = reducer(deepFreeze(s4), undo)
    expect(grid(u1)).toEqual(grid(s3))
    const u2 = reducer(deepFreeze(u1), undo)
    expect(grid(u2)).toEqual(grid(s2))
    const u3 = reducer(deepFreeze(u2), undo)
    expect(grid(u3)).toEqual(grid(s1))
    const u4 = reducer(deepFreeze(u3), undo)
    expect(u4.sessions.free.digits).toBe(givens)
    expect(u4.sessions.free.notes).toEqual(zeros)
    expect(u4.ui.undo).toEqual([])
    expect(u4.sessions.free.status).toBe('inProgress')
    expect(u4.meta.lastPlayedKey).toBe('free')
  })

  it('undo never touches the selection or the modes', () => {
    const state = deepFreeze(
      run(fresh(), select(firstEmpty), enter(5), toggleInput, notesMode, enter(4), select(secondEmpty)),
    )
    const undone = reducer(state, undo)
    expect(undone.ui).toEqual({ ...state.ui, undo: [] })
  })

  it('no-op records nothing: digit on a Given, cellSelected, mode switch', () => {
    const state = deepFreeze(run(fresh(), select(firstEmpty), enter(5), select(firstGiven)))
    expect(state.ui.undo).toHaveLength(1)
    expect(reducer(state, enter(3))).toBe(state)
    expect(reducer(state, select(firstGiven))).toBe(state)
    expect(reducer(state, digitMode)).toBe(state)
    expect(reducer(state, select(firstEmpty)).ui.undo).toBe(state.ui.undo)
    expect(reducer(state, notesMode).ui.undo).toBe(state.ui.undo)
    expect(reducer(state, toggleInput).ui.undo).toBe(state.ui.undo)
  })

  it('empty history: undoRequested returns the same state object', () => {
    const state = fresh()
    expect(reducer(state, undo)).toBe(state)
  })

  it('confirm open / keep going: toggles ui.restartConfirming, sessions untouched', () => {
    const state = messy()
    const open = deepFreeze(reducer(state, restartRequested))
    expect(open.ui.restartConfirming).toBe(true)
    expect(open.sessions).toBe(state.sessions)
    expect(open.ui.undo).toBe(state.ui.undo)
    expect(reducer(open, restartRequested)).toBe(open)
    const closed = reducer(open, restartCancelled)
    expect(closed.ui.restartConfirming).toBe(false)
    expect(closed.sessions).toBe(state.sessions)
    expect(reducer(state, restartCancelled)).toBe(state)
  })

  it('restart: Givens, every mask 0, inProgress; confirm closed; one snapshot pushed', () => {
    const state = deepFreeze(reducer(messy(), restartRequested))
    const restarted = reducer(state, restartConfirmed)
    expect(restarted.sessions.free.digits).toBe(givens)
    expect(restarted.sessions.free.notes).toEqual(zeros)
    expect(restarted.sessions.free.status).toBe('inProgress')
    expect(restarted.ui.restartConfirming).toBe(false)
    expect(restarted.ui.undo).toHaveLength(state.ui.undo.length + 1)
    expect(restarted.ui.undo.at(-1)).toEqual(grid(state))
    expect(restarted.ui.selectedCell).toBe(state.ui.selectedCell)
  })

  it('undo restart: one Undo brings the full pre-restart digits and Notes back', () => {
    const state = messy()
    const back = run(state, restartRequested, restartConfirmed, undo)
    expect(grid(back)).toEqual(grid(state))
    expect(back.ui.undo).toEqual(state.ui.undo)
  })

  it('restart on a clean grid: confirm closes, no undo entry', () => {
    const open = deepFreeze(reducer(fresh(), restartRequested))
    const closed = reducer(open, restartConfirmed)
    expect(closed.ui.restartConfirming).toBe(false)
    expect(closed.ui.undo).toBe(open.ui.undo)
    expect(closed.sessions).toBe(open.sessions)
  })

  it('restart with Notes only: resets every mask to 0, pushes one snapshot; Undo restores the Notes', () => {
    const noted = deepFreeze(run(fresh(), notesMode, select(firstEmpty), enter(2), enter(6), digitMode))
    expect(noted.sessions.free.digits).toBe(givens)
    expect(noted.sessions.free.notes[firstEmpty]).toBe((1 << 1) | (1 << 5))
    const restarted = deepFreeze(run(noted, restartRequested, restartConfirmed))
    expect(restarted.sessions.free.notes).toEqual(zeros)
    expect(restarted.ui.undo).toHaveLength(noted.ui.undo.length + 1)
    const back = reducer(restarted, undo)
    expect(back.sessions.free.notes).toEqual(noted.sessions.free.notes)
  })

  it('confirm open + a placed digit: the confirm closes', () => {
    const open = deepFreeze(run(messy(), restartRequested, select(emptyCells[3])))
    expect(open.ui.restartConfirming).toBe(true)
    const placed = reducer(open, enter(7))
    expect(placed.sessions.free.digits[emptyCells[3]]).toBe('7')
    expect(placed.ui.restartConfirming).toBe(false)
  })

  it('confirm open + Undo: the confirm closes', () => {
    const open = deepFreeze(reducer(messy(), restartRequested))
    const undone = reducer(open, undo)
    expect(undone.ui.restartConfirming).toBe(false)
    expect(undone.ui.undo).toHaveLength(open.ui.undo.length - 1)
  })

  it('confirm open + the final correct digit: solved, and the confirm closes', () => {
    const last = emptyCells[emptyCells.length - 1]
    const open = deepFreeze(run(fillAllBut(fresh(), last), select(last), restartRequested))
    expect(open.ui.restartConfirming).toBe(true)
    const solved = reducer(open, enter(Number(solution[last])))
    expect(solved.sessions.free.status).toBe('solved')
    expect(solved.ui.restartConfirming).toBe(false)
  })

  it('solved: undoRequested / restartRequested / restartConfirmed return the same state object', () => {
    const last = emptyCells[emptyCells.length - 1]
    const solved = deepFreeze(run(fillAllBut(fresh(), last), select(last), enter(Number(solution[last]))))
    expect(solved.ui.undo.length).toBeGreaterThan(0)
    expect(reducer(solved, undo)).toBe(solved)
    expect(reducer(solved, restartRequested)).toBe(solved)
    expect(reducer(solved, restartConfirmed)).toBe(solved)
    expect(solved.sessions.free.status).toBe('solved')
  })
})

describe('keyboard actions (Story 1.5)', () => {
  const clear: Action = { type: 'cellCleared' }
  const place: Action = { type: 'currentDigitPlaced' }
  const toggleEntry: Action = { type: 'entryModeToggled' }
  const undo: Action = { type: 'undoRequested' }
  const free = (s: AppState) => s.sessions.free

  it('cellCleared clears a player digit and records Undo', () => {
    const placed = deepFreeze(run(fresh(), select(firstEmpty), enter(7)))
    const cleared = reducer(placed, clear)
    expect(free(cleared).digits[firstEmpty]).toBe('0')
    expect(cleared.ui.undo).toHaveLength(2)
    expect(free(reducer(cleared, undo)).digits[firstEmpty]).toBe('7')
  })

  it('cellCleared clears the Notes of an empty cell, undoably', () => {
    const noted = deepFreeze(run(fresh(), select(firstEmpty), notesMode, enter(3), enter(5)))
    const cleared = reducer(noted, clear)
    expect(free(cleared).notes[firstEmpty]).toBe(0)
    expect(cleared.ui.undo).toHaveLength(3)
    expect(free(reducer(cleared, undo)).notes[firstEmpty]).toBe(free(noted).notes[firstEmpty])
  })

  it('cellCleared on a player digit keeps the hidden Notes', () => {
    const s = run(fresh(), select(firstEmpty), notesMode, enter(3), digitMode, enter(7), clear)
    expect(free(s).digits[firstEmpty]).toBe('0')
    expect(free(s).notes[firstEmpty]).toBe(1 << 2)
  })

  it('cellCleared returns the same object on a Given, a clean empty cell, no selection, or once solved', () => {
    const onGiven = deepFreeze(run(fresh(), select(firstGiven)))
    expect(reducer(onGiven, clear)).toBe(onGiven)
    const onEmpty = deepFreeze(run(fresh(), select(firstEmpty)))
    expect(reducer(onEmpty, clear)).toBe(onEmpty)
    const none = fresh()
    expect(reducer(none, clear)).toBe(none)
    const last = emptyCells[emptyCells.length - 1]
    const solved = deepFreeze(run(fillAllBut(fresh(), last), select(last), enter(Number(solution[last]))))
    expect(free(solved).status).toBe('solved')
    expect(reducer(solved, clear)).toBe(solved)
  })

  it('currentDigitPlaced applies the current digit to the selected cell in number-first', () => {
    const s = deepFreeze(run(fresh(), toggleInput, enter(7), select(firstEmpty), place))
    expect(free(s).digits[firstEmpty]).toBe('7')
    expect(s.ui.undo).toHaveLength(1)
    // The same digit again clears, as with the mouse.
    expect(free(reducer(s, place)).digits[firstEmpty]).toBe('0')
  })

  it('currentDigitPlaced toggles Notes in Notes mode', () => {
    const s = run(fresh(), toggleInput, notesMode, enter(4), select(firstEmpty), place)
    expect(free(s).notes[firstEmpty]).toBe(1 << 3)
  })

  it('currentDigitPlaced returns the same object without a digit or selection, in cell-first, or on a Given', () => {
    const noDigit = deepFreeze(run(fresh(), toggleInput, select(firstEmpty)))
    expect(reducer(noDigit, place)).toBe(noDigit)
    const noCell = deepFreeze(run(fresh(), toggleInput, enter(7)))
    expect(reducer(noCell, place)).toBe(noCell)
    const cellFirst = deepFreeze(run(fresh(), toggleInput, enter(7), toggleInput, select(firstEmpty)))
    expect(reducer(cellFirst, place)).toBe(cellFirst)
    const given = deepFreeze(run(fresh(), toggleInput, enter(7), select(firstGiven)))
    expect(reducer(given, place)).toBe(given)
  })

  it('entryModeToggled flips Digit and Notes without recording Undo', () => {
    const notes = reducer(fresh(), toggleEntry)
    expect(notes.ui.entryMode).toBe('notes')
    expect(reducer(notes, toggleEntry).ui.entryMode).toBe('digit')
    expect(notes.ui.undo).toEqual([])
  })

  it('starts with no announcement', () => {
    expect(fresh().ui.announcement).toBeNull()
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

describe('settings and screens (Story 1.6)', () => {
  const toggle = (setting: 'mistakeHighlighting' | 'sameDigitHighlighting' | 'unitHighlighting' | 'lamplight'): Action => ({
    type: 'settingToggled',
    setting,
  })

  it('defaults: Mistake Off, same digit On, row/column/box On, Lamplight Off; Puzzle screen', () => {
    const state = fresh()
    expect(state.settings).toEqual({
      mistakeHighlighting: false,
      sameDigitHighlighting: true,
      unitHighlighting: true,
      lamplight: false,
      freePlayDifficulty: null,
    })
    expect(state.ui.screen).toBe('puzzle')
  })

  it('settingToggled flips one switch and back', () => {
    const once = run(fresh(), toggle('mistakeHighlighting'))
    expect(once.settings).toEqual({ ...fresh().settings, mistakeHighlighting: true })
    expect(run(once, toggle('mistakeHighlighting')).settings).toEqual(fresh().settings)
    expect(run(fresh(), toggle('lamplight')).settings.lamplight).toBe(true)
    expect(run(fresh(), toggle('sameDigitHighlighting')).settings.sameDigitHighlighting).toBe(false)
    expect(run(fresh(), toggle('unitHighlighting')).settings.unitHighlighting).toBe(false)
  })

  it('settingToggled records no Undo and leaves the Session untouched', () => {
    const played = run(fresh(), select(firstEmpty), enter(Number(solution[firstEmpty])))
    const next = run(played, toggle('mistakeHighlighting'), toggle('lamplight'))
    expect(next.ui.undo).toBe(played.ui.undo)
    expect(next.sessions).toBe(played.sessions)
    expect(next.meta).toBe(played.meta)
  })

  it('settingToggled ignores unknown settings', () => {
    const state = fresh()
    expect(reducer(state, { type: 'settingToggled', setting: 'toString' } as unknown as Action)).toBe(state)
  })

  it('screenChosen switches screens with no Undo; choosing the current screen is a no-op', () => {
    const state = fresh()
    expect(reducer(state, { type: 'screenChosen', screen: 'puzzle' })).toBe(state)
    const settings = reducer(state, { type: 'screenChosen', screen: 'settings' })
    expect(settings.ui.screen).toBe('settings')
    expect(settings.ui.undo).toBe(state.ui.undo)
    expect(settings.sessions).toBe(state.sessions)
    expect(reducer(state, { type: 'screenChosen', screen: 'album' } as unknown as Action)).toBe(state)
  })

  it('screenChosen closes an open Restart confirm; choosing the current screen leaves it', () => {
    const played = run(fresh(), select(firstEmpty), enter(Number(solution[firstEmpty])), { type: 'restartRequested' })
    expect(played.ui.restartConfirming).toBe(true)
    expect(reducer(played, { type: 'screenChosen', screen: 'puzzle' })).toBe(played)
    const away = reducer(played, { type: 'screenChosen', screen: 'settings' })
    expect(away.ui.restartConfirming).toBe(false)
    expect(away.sessions).toBe(played.sessions)
    expect(away.ui.undo).toBe(played.ui.undo)
  })

  it('round trip keeps the grid, Notes, selection and Undo history', () => {
    const played = run(
      fresh(),
      select(firstEmpty),
      enter(Number(solution[firstEmpty])),
      select(emptyCells[1]),
      notesMode,
      enter(3),
    )
    const back = run(played, { type: 'screenChosen', screen: 'settings' }, { type: 'screenChosen', screen: 'puzzle' })
    expect(back.sessions).toBe(played.sessions)
    expect(back.ui).toEqual(played.ui)
    expect(run(back, { type: 'undoRequested' }).sessions.free.notes[emptyCells[1]]).toBe(0)
  })
})
