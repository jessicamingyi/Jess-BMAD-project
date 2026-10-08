import { describe, expect, it } from 'vitest'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { Action, AppState } from '../../src/game/types.ts'

/*
 * Story 3.5: `meta.lastPlayedKey` follows changes to a Session's digits or Notes,
 * never opening a Session, selecting a cell or switching a mode.
 */

const D = '2026-10-08'
const PARIS = 'europe-near-1'
const LONDON = 'europe-near-2'
const PARIS_KEY = cityKey(PARIS)
const OTHER_KEY = cityKey(LONDON)
const puzzle = cityPuzzle(PARIS)!
const EMPTY = puzzle.givens.indexOf('0')
const RIGHT = Number(puzzle.solution[EMPTY])

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const select: Action = { type: 'cellSelected', cell: EMPTY }
const enter: Action = { type: 'digitEntered', digit: RIGHT, date: D }

/**
 * Paris open on the Puzzle screen, with London and Free Play also in progress,
 * after `setup`; `lastPlayedKey` is then pinned to London so a change is visible.
 */
function playing(...setup: Action[]): AppState {
  const base = createInitialState()
  const start: AppState = {
    ...base,
    sessions: {
      [OTHER_KEY]: createSession(OTHER_KEY, cityPuzzle(LONDON)!),
      [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle),
    },
  }
  const opened = run(start, { type: 'cityChosen', cityId: PARIS }, ...setup)
  expect(opened.ui.activeKey).toBe(PARIS_KEY)
  return { ...opened, meta: { lastPlayedKey: OTHER_KEY } }
}

describe('lastPlayedKey is set by every action that changes digits or Notes', () => {
  const H: Action = { type: 'hintRequested' }
  it.each<[string, AppState, Action[]]>([
    ['digitEntered (Digit mode)', playing(select), [enter]],
    ['digitEntered (Notes mode)', playing({ type: 'entryModeChosen', mode: 'notes' }, select), [enter]],
    ['cellCleared', playing(select, enter), [{ type: 'cellCleared' }]],
    ['hintApplied', playing(H, H), [{ type: 'hintApplied', date: D }]],
    ['undoRequested', playing(select, enter), [{ type: 'undoRequested' }]],
    ['restartConfirmed', playing(select, enter, { type: 'restartRequested' }), [{ type: 'restartConfirmed' }]],
  ])('%s', (_, state, actions) => {
    const next = run(state, ...actions)
    const before = state.sessions[PARIS_KEY]
    const after = next.sessions[PARIS_KEY]
    // The action really changed the grid…
    expect(after.digits !== before.digits || after.notes.some((m, i) => m !== before.notes[i])).toBe(true)
    // …and Paris is now the last-played Puzzle.
    expect(next.meta.lastPlayedKey).toBe(PARIS_KEY)
  })
})

describe('lastPlayedKey is left alone by opening, selecting and mode switches', () => {
  it.each<[string, Action[]]>([
    ['cityChosen (a fresh City)', [{ type: 'screenChosen', screen: 'album' }, { type: 'cityChosen', cityId: 'europe-near-3' }]],
    ['cityChosen ("Carry on")', [{ type: 'screenChosen', screen: 'album' }, { type: 'cityChosen', cityId: LONDON }]],
    ['freePlayResumed', [{ type: 'freePlayResumed' }]],
    ['cellClicked (a selection)', [{ type: 'cellClicked', cell: EMPTY, date: D }]],
    ['cellSelected', [select]],
    ['entryModeChosen', [{ type: 'entryModeChosen', mode: 'notes' }]],
    ['entryModeToggled', [{ type: 'entryModeToggled' }]],
    ['inputModeChosen', [{ type: 'inputModeChosen', mode: 'numberFirst' }]],
    ['inputModeToggled', [{ type: 'inputModeToggled' }]],
    ['screenChosen', [{ type: 'screenChosen', screen: 'settings' }, { type: 'screenChosen', screen: 'puzzle' }]],
  ])('%s', (_, actions) => {
    const state = playing()
    const next = run(state, ...actions)
    expect(next).not.toBe(state)
    expect(next.meta).toBe(state.meta)
    expect(next.meta.lastPlayedKey).toBe(OTHER_KEY)
  })
})

describe('look-alike actions leave lastPlayedKey alone', () => {
  const GIVEN = puzzle.givens.search(/[1-9]/)
  it.each<[string, AppState, Action[]]>([
    ['hintRequested', playing(select, enter), [{ type: 'hintRequested' }]],
    ['restartRequested', playing(select, enter), [{ type: 'restartRequested' }]],
    ['restartCancelled', playing(select, enter, { type: 'restartRequested' }), [{ type: 'restartCancelled' }]],
    ['a refused digitEntered on a Given', playing({ type: 'cellSelected', cell: GIVEN }), [{ type: 'digitEntered', digit: 1, date: D }]],
  ])('%s', (_, state, actions) => {
    const next = run(state, ...actions)
    expect(next.sessions[PARIS_KEY]).toBe(state.sessions[PARIS_KEY])
    expect(next.meta.lastPlayedKey).toBe(OTHER_KEY)
  })
})

describe('Story 1.8: a new Free Play Puzzle opened from the entry', () => {
  it('foreground freePlayGenerated sets lastPlayedKey to free', () => {
    const state = run(playing(), { type: 'screenChosen', screen: 'freePlay' }, { type: 'freePlayRequested', requestId: 1, difficulty: 'easy' })
    const next = run(state, { type: 'freePlayGenerated', requestId: 1, puzzle: samplePuzzle })
    expect(next.ui.activeKey).toBe(FREE_PLAY_KEY)
    expect(next.meta.lastPlayedKey).toBe(FREE_PLAY_KEY)
  })
})
