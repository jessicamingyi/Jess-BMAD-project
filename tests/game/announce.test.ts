import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { announce, withAnnouncement } from '../../src/game/announce.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { Action, AppState } from '../../src/game/types.ts'

const run = (state: AppState, ...actions: Action[]) => actions.reduce(withAnnouncement, state)
const select = (cell: number): Action => ({ type: 'cellSelected', cell })
const enter = (digit: number): Action => ({ type: 'digitEntered', digit })
const notesMode: Action = { type: 'entryModeChosen', mode: 'notes' }
const toggleInput: Action = { type: 'inputModeToggled' }
const toggleEntry: Action = { type: 'entryModeToggled' }
const clear: Action = { type: 'cellCleared' }
const place: Action = { type: 'currentDigitPlaced' }

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
const firstEmpty = emptyCells[0]
const firstGiven = givens.indexOf('5')
const fresh = () => createInitialState(samplePuzzle)
const GIVEN = "Given, can't change"

/** What `announce` says for `action` applied to `state`. */
function message(state: AppState, action: Action): string | null {
  return announce(state, reducer(state, action), action)
}

describe('announce', () => {
  it('says the digit entered, and "cleared" when the same digit clears it', () => {
    const s = run(fresh(), select(firstEmpty))
    expect(message(s, enter(7))).toBe('7')
    expect(message(run(s, enter(7)), enter(7))).toBe('cleared')
  })

  it('says "note 7 added" and "note 7 removed"', () => {
    const s = run(fresh(), select(firstEmpty), notesMode)
    expect(message(s, enter(7))).toBe('note 7 added')
    expect(message(run(s, enter(7)), enter(7))).toBe('note 7 removed')
  })

  it('refuses a Given out loud for digits, Backspace and number-first placement', () => {
    const onGiven = run(fresh(), select(firstGiven))
    expect(message(onGiven, enter(7))).toBe(GIVEN)
    expect(message(onGiven, clear)).toBe(GIVEN)
    const numberFirst = run(fresh(), toggleInput, enter(7), select(firstGiven))
    expect(message(numberFirst, place)).toBe(GIVEN)
    expect(message(numberFirst, { type: 'cellClicked', cell: firstGiven })).toBe(GIVEN)
  })

  it('says "cleared" for Backspace on a digit or Notes; silent on a clean empty cell', () => {
    expect(message(run(fresh(), select(firstEmpty), enter(7)), clear)).toBe('cleared')
    expect(message(run(fresh(), select(firstEmpty), notesMode, enter(3)), clear)).toBe('cleared')
    expect(message(run(fresh(), select(firstEmpty)), clear)).toBeNull()
  })

  it('names mode switches', () => {
    const s = fresh()
    expect(message(s, toggleEntry)).toBe('Notes')
    expect(message(run(s, toggleEntry), toggleEntry)).toBe('Digit')
    expect(message(s, toggleInput)).toBe('number-first')
    expect(message(run(s, toggleInput), toggleInput)).toBe('cell-first')
    expect(message(s, { type: 'entryModeChosen', mode: 'digit' })).toBeNull()
  })

  it('says "current digit 7" when number-first chooses a digit, then "7" when it is placed', () => {
    const s = run(fresh(), toggleInput)
    expect(message(s, enter(7))).toBe('current digit 7')
    const ready = run(s, enter(7), select(firstEmpty))
    expect(message(ready, enter(7))).toBeNull()
    expect(message(ready, place)).toBe('7')
    expect(message(ready, { type: 'cellClicked', cell: firstEmpty })).toBe('7')
  })

  it('says "Solved" when the last digit solves the Puzzle', () => {
    let s = fresh()
    for (const c of emptyCells.slice(1)) s = reducer(reducer(s, select(c)), enter(Number(solution[c])))
    s = reducer(s, select(firstEmpty))
    expect(message(s, enter(Number(solution[firstEmpty])))).toBe('Solved')
  })

  it('is silent for selection, Undo and Restart', () => {
    const s = run(fresh(), select(firstEmpty), enter(7))
    expect(message(s, select(firstEmpty + 1))).toBeNull()
    expect(message(s, { type: 'undoRequested' })).toBeNull()
    expect(message(s, { type: 'restartConfirmed' })).toBeNull()
  })
})

describe('withAnnouncement', () => {
  it('stores the message with an increasing seq, so repeats re-announce', () => {
    const a = run(fresh(), select(firstEmpty), enter(7))
    expect(a.ui.announcement).toEqual({ text: '7', seq: 1 })
    const b = run(a, select(emptyCells[1]), enter(7))
    expect(b.ui.announcement).toEqual({ text: '7', seq: 2 })
  })

  it('announces a refused Given without changing the grid or recording Undo', () => {
    const s = run(fresh(), select(firstGiven))
    const next = withAnnouncement(s, enter(7))
    expect(next.ui.announcement?.text).toBe(GIVEN)
    expect(next.sessions).toBe(s.sessions)
    expect(next.ui.undo).toBe(s.ui.undo)
  })

  it('returns the same object for silent no-ops', () => {
    const s = run(fresh(), select(firstEmpty))
    expect(withAnnouncement(s, select(firstEmpty))).toBe(s)
    expect(withAnnouncement(s, clear)).toBe(s)
  })

  it('never records announcements in Undo', () => {
    const s = run(fresh(), select(firstEmpty), enter(7), toggleEntry)
    expect(s.ui.undo).toHaveLength(1)
    expect(s.ui.undo[0]).toEqual({ digits: givens, notes: s.ui.undo[0].notes })
    const undone = withAnnouncement(s, { type: 'undoRequested' })
    expect(undone.ui.announcement).toEqual(s.ui.announcement)
  })
})
