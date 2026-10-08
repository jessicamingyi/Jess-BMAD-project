import { describe, expect, it } from 'vitest'
import { cityById } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey, slotState } from '../../src/game/journey.ts'
import { reducer } from '../../src/game/reducer.ts'
import { activeSession, createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { Action, Album, AppState, Postcard, Session } from '../../src/game/types.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

const D = '2026-10-07'
const NEAR = 'europe-near-1'
const NEAR_2 = 'europe-near-2'
const KEY = cityKey(NEAR)
const puzzle = cityPuzzle(NEAR)!

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const view = (cityId = NEAR): Action => ({ type: 'postcardViewed', cityId })
const close: Action = { type: 'postcardViewerClosed' }
const replay: Action = { type: 'replayRequested' }
const confirm: Action = { type: 'replayConfirmed' }
const keep: Action = { type: 'replayKept' }
const choose = (cityId: string): Action => ({ type: 'cityChosen', cityId })
const select = (cell: number): Action => ({ type: 'cellSelected', cell })
const enter = (digit: number): Action => ({ type: 'digitEntered', digit, date: D })
const screen = (s: AppState['ui']['screen']): Action => ({ type: 'screenChosen', screen: s })

const revealed = (cityId: string): Postcard => ({ cityId, collectedOn: '2026-10-01', revealed: true })
const unrevealed = (cityId: string): Postcard => ({ cityId, collectedOn: D, revealed: false })

/** On the Album with `album`, optional Sessions, and Free Play in progress (another Session to leave alone). */
function onAlbum(album: Album, sessions: Record<string, Session> = {}): AppState {
  const base = createInitialState()
  const free = createSession(FREE_PLAY_KEY, samplePuzzle)
  return deepFreeze({
    ...base,
    album,
    sessions: { [FREE_PLAY_KEY]: free, ...sessions },
    meta: { lastPlayedKey: FREE_PLAY_KEY },
  })
}

/** NEAR's Session: every empty cell but the last `left` filled correctly. */
function partial(left = 1, status: Session['status'] = 'inProgress'): Session {
  const empty = [...puzzle.givens].flatMap((d, i) => (d === '0' ? [i] : []))
  const open = new Set(empty.slice(empty.length - left))
  const digits = status === 'solved' ? puzzle.solution : [...puzzle.solution].map((d, i) => (open.has(i) ? '0' : d)).join('')
  return { ...createSession(KEY, puzzle), digits, status }
}

const collected = () => onAlbum([revealed(NEAR)])
const collectedSolved = () => onAlbum([revealed(NEAR)], { [KEY]: partial(0, 'solved') })
const collectedReplay = () => onAlbum([revealed(NEAR)], { [KEY]: partial(3) })

describe('postcardViewed / postcardViewerClosed', () => {
  it('opens the viewer on a revealed Postcard', () => {
    const before = collected()
    const s = reducer(before, view())
    expect(s.ui.viewer).toEqual({ cityId: NEAR, confirming: false })
    expect(s.ui.screen).toBe('album')
    expect(s.sessions).toBe(before.sessions)
  })

  it.each([
    ['an uncollected City', onAlbum([revealed(NEAR_2)]), NEAR],
    ['an unrevealed Postcard', onAlbum([revealed('asia-near-1'), { ...unrevealed('atlantis') }, { ...revealed(NEAR), revealed: false }]), NEAR],
    ['an unknown City', onAlbum([revealed('atlantis')]), 'atlantis'],
    ['a non-string id', collected(), 42 as unknown as string],
  ])('%s: the same state', (_name, s, id) => {
    expect(reducer(s, view(id))).toBe(s)
  })

  it('already open on that City: the same state; another City switches', () => {
    const s = reducer(onAlbum([revealed(NEAR), revealed(NEAR_2)]), view())
    expect(reducer(s, view())).toBe(s)
    expect(reducer(s, view(NEAR_2)).ui.viewer).toEqual({ cityId: NEAR_2, confirming: false })
  })

  it('off the Album: the same state', () => {
    const s = deepFreeze({ ...collected(), ui: { ...collected().ui, screen: 'settings' as const } })
    expect(reducer(s, view())).toBe(s)
  })

  it('closes; already closed is the same state', () => {
    const s = run(collected(), view(), close)
    expect(s.ui.viewer).toBeNull()
    expect(reducer(s, close)).toBe(s)
  })

  it('viewing never touches the Album, Sessions, lastPlayedKey or Undo', () => {
    const before = collectedReplay()
    const s = run(before, view(), close, view())
    expect(s.album).toBe(before.album)
    expect(s.sessions).toBe(before.sessions)
    expect(s.meta).toBe(before.meta)
    expect(s.ui.undo).toBe(before.ui.undo)
  })
})

describe('replayRequested ("Play again")', () => {
  it.each([
    ['no Session', collected],
    ['a solved Session', collectedSolved],
  ])('with %s: a fresh Session opens on the Puzzle screen and the viewer closes', (_name, make) => {
    const before = make()
    const s = run(before, view(), replay)
    expect(s.sessions[KEY]).toEqual(createSession(KEY, puzzle))
    expect(s.ui.activeKey).toBe(KEY)
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.viewer).toBeNull()
    expect(s.ui.undo).toEqual([])
    expect(s.ui.selectedCell).toBeNull()
    expect(s.ui.currentDigit).toBeNull()
    expect(s.ui.restartConfirming).toBe(false)
    expect(s.album).toBe(before.album)
    expect(s.meta.lastPlayedKey).toBe(FREE_PLAY_KEY)
    expect(s.sessions[FREE_PLAY_KEY]).toBe(before.sessions[FREE_PLAY_KEY])
    expect(s.ui.announcement).toBeNull()
  })

  it('clears Undo, selection, current digit and that Session’s Hint, but keeps another Session’s Hint', () => {
    const base = collectedSolved()
    const dirty = deepFreeze({
      ...base,
      ui: {
        ...base.ui,
        undo: [{ digits: puzzle.givens, notes: Array(81).fill(0) }],
        selectedCell: 3,
        currentDigit: 4,
        hint: { sessionKey: KEY, step: 'idle' as const, result: null },
      },
    })
    const s = run(dirty, view(), replay)
    expect(s.ui.undo).toEqual([])
    expect(s.ui.selectedCell).toBeNull()
    expect(s.ui.currentDigit).toBeNull()
    expect(s.ui.hint).toBeNull()
    const other = deepFreeze({ ...dirty, ui: { ...dirty.ui, hint: { sessionKey: FREE_PLAY_KEY, step: 'idle' as const, result: null } } })
    expect(run(other, view(), replay).ui.hint).toBe(other.ui.hint)
  })

  it('removes the key from solvedAgain', () => {
    const base = collectedSolved()
    const s = deepFreeze({ ...base, ui: { ...base.ui, solvedAgain: [KEY, 'city:x'] } })
    expect(run(s, view(), replay).ui.solvedAgain).toEqual(['city:x'])
  })

  it('with a replay in progress: the confirm shows, nothing else changes', () => {
    const opened = reducer(collectedReplay(), view())
    const s = reducer(opened, replay)
    expect(s.ui.viewer).toEqual({ cityId: NEAR, confirming: true })
    expect(s.sessions).toBe(opened.sessions)
    expect(s.ui.screen).toBe('album')
    // Asking again while confirming: the same state.
    expect(reducer(s, replay)).toBe(s)
  })

  it('with an untouched replay in progress (only the Givens, no Notes): a fresh Session, no confirm', () => {
    const before = onAlbum([revealed(NEAR)], { [KEY]: createSession(KEY, puzzle) })
    const s = run(before, view(), replay)
    expect(s.ui.viewer).toBeNull()
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.activeKey).toBe(KEY)
    expect(s.sessions[KEY]).toEqual(createSession(KEY, puzzle))
    // A Note alone is something to lose: the confirm shows.
    const noted = onAlbum([revealed(NEAR)], { [KEY]: { ...createSession(KEY, puzzle), notes: [1, ...Array(80).fill(0)] } })
    expect(run(noted, view(), replay).ui.viewer).toEqual({ cityId: NEAR, confirming: true })
  })

  it('no viewer: the same state', () => {
    const s = collectedSolved()
    expect(reducer(s, replay)).toBe(s)
  })
})

describe('replayConfirmed ("Start fresh") / replayKept ("Keep going")', () => {
  it('Start fresh replaces the replay in progress with a fresh Session', () => {
    const before = collectedReplay()
    const s = run(before, view(), replay, confirm)
    expect(s.sessions[KEY]).toEqual(createSession(KEY, puzzle))
    expect(s.ui.activeKey).toBe(KEY)
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.viewer).toBeNull()
    expect(s.album).toBe(before.album)
    expect(s.meta.lastPlayedKey).toBe(FREE_PLAY_KEY)
    expect(s.sessions[FREE_PLAY_KEY]).toBe(before.sessions[FREE_PLAY_KEY])
  })

  it('Keep going opens the same Session on the Puzzle screen', () => {
    const before = collectedReplay()
    const s = run(before, view(), replay, keep)
    expect(s.sessions[KEY]).toBe(before.sessions[KEY])
    expect(s.ui.activeKey).toBe(KEY)
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.viewer).toBeNull()
    expect(s.meta).toBe(before.meta)
  })

  it('Keep going keeps Undo only when the replay was already current', () => {
    const undo = [{ digits: puzzle.givens, notes: Array(81).fill(0) }]
    const base = collectedReplay()
    const current = deepFreeze({ ...base, ui: { ...base.ui, activeKey: KEY, undo, selectedCell: 5 } })
    const kept = run(current, view(), replay, keep)
    expect(kept.ui.undo).toBe(undo)
    expect(kept.ui.selectedCell).toBe(5)
    const elsewhere = deepFreeze({ ...base, ui: { ...base.ui, activeKey: FREE_PLAY_KEY, undo, selectedCell: 5 } })
    const opened = run(elsewhere, view(), replay, keep)
    expect(opened.ui.undo).toEqual([])
    expect(opened.ui.selectedCell).toBeNull()
  })

  it('not confirming: both are the same state', () => {
    const open = reducer(collectedReplay(), view())
    expect(reducer(open, confirm)).toBe(open)
    expect(reducer(open, keep)).toBe(open)
    const closed = collectedReplay()
    expect(reducer(closed, confirm)).toBe(closed)
    expect(reducer(closed, keep)).toBe(closed)
  })
})

describe('cityChosen on a collected City', () => {
  it('in progress ("Carry on"): the same Session opens on the Puzzle screen', () => {
    const before = collectedReplay()
    const s = reducer(before, choose(NEAR))
    expect(s.sessions[KEY]).toBe(before.sessions[KEY])
    expect(s.ui.activeKey).toBe(KEY)
    expect(s.ui.screen).toBe('puzzle')
    expect(s.meta).toBe(before.meta)
  })

  it.each([
    ['no Session', collected],
    ['a solved Session', collectedSolved],
  ])('with %s: the same state (no silent fresh Session)', (_name, make) => {
    const s = make()
    expect(reducer(s, choose(NEAR))).toBe(s)
  })
})

describe('leaving closes the viewer', () => {
  it.each<[string, Action]>([
    ['screenChosen', screen('settings')],
    ['albumRegionChosen', { type: 'albumRegionChosen', region: 'asia' }],
    ['cityChosen (another City)', choose(NEAR_2)],
  ])('%s', (_name, action) => {
    const s = run(onAlbum([revealed(NEAR)]), view(), replay, action)
    expect(s.ui.viewer).toBeNull()
  })

  it('cityChosen on a collected City not in progress: only the viewer closes', () => {
    const open = run(collectedSolved(), view())
    const s = reducer(open, choose(NEAR))
    expect(s).toEqual({ ...open, ui: { ...open.ui, viewer: null } })
    expect(s.sessions).toBe(open.sessions)
  })

  it('postcardViewed on another City while confirming: the confirm resets', () => {
    const s = run(onAlbum([revealed(NEAR), revealed(NEAR_2)], { [KEY]: partial(3) }), view(), replay, view(NEAR_2))
    expect(s.ui.viewer).toEqual({ cityId: NEAR_2, confirming: false })
    // Back on the first City, still in progress: "Play again" asks again.
    expect(run(s, view(), replay).ui.viewer).toEqual({ cityId: NEAR, confirming: true })
  })

  it('cityChosen "Carry on" while confirming', () => {
    const s = run(collectedReplay(), view(), replay, choose(NEAR))
    expect(s.ui.viewer).toBeNull()
    expect(s.ui.screen).toBe('puzzle')
  })
})

describe('solving again', () => {
  /** A fresh replay of NEAR with every cell but the last filled, through the viewer; the last cell selected. */
  function replayOneLeft(): { state: AppState; last: number; album: Album } {
    const before = collected()
    let s = run(before, view(), replay)
    const { session } = activeSession(s)!
    const cells = [...session.digits].flatMap((d, i) => (d === '0' ? [i] : []))
    for (const i of cells.slice(0, -1)) s = run(s, select(i), enter(Number(puzzle.solution[i])))
    const last = cells.at(-1)!
    return { state: deepFreeze(reducer(s, select(last))), last, album: before.album }
  }

  it('the completing digit: solved, the Album the same reference, the key in solvedAgain, no Postcard pending', () => {
    const { state, last, album } = replayOneLeft()
    const s = reducer(state, enter(Number(puzzle.solution[last])))
    expect(s.sessions[KEY].status).toBe('solved')
    expect(s.album).toBe(album)
    expect(s.ui.solvedAgain).toEqual([KEY])
    expect(s.ui.screen).toBe('puzzle')
    expect(slotState(s, cityById(NEAR)!)).toBe('collected')
  })

  it('through hintApplied: solved, the Album the same reference, "Solved again"', () => {
    const { state, album } = replayOneLeft()
    const s = run(state, { type: 'hintRequested' }, { type: 'hintRequested' }, { type: 'hintApplied', date: D })
    expect(s.sessions[KEY].status).toBe('solved')
    expect(s.sessions[KEY].hintsUsed).toBe(1)
    expect(s.album).toBe(album)
    expect(s.ui.solvedAgain).toEqual([KEY])
  })

  it('Restart and Undo on a solved replay: the same state, still "Solved again"; a fresh replay clears it', () => {
    const { state, last } = replayOneLeft()
    const solved = deepFreeze(reducer(state, enter(Number(puzzle.solution[last]))))
    for (const action of [{ type: 'restartRequested' }, { type: 'restartConfirmed' }, { type: 'undoRequested' }] as Action[]) {
      expect(reducer(solved, action)).toBe(solved)
    }
    const again = run(solved, screen('album'), view(), replay)
    expect(again.sessions[KEY]).toEqual(createSession(KEY, puzzle))
    expect(again.ui.solvedAgain).toEqual([])
  })

  it('a first solve is not "solved again"', () => {
    const base = onAlbum([])
    let s = reducer(base, choose(NEAR))
    for (let i = 0; i < 81; i++) if (puzzle.givens[i] === '0') s = run(s, select(i), enter(Number(puzzle.solution[i])))
    expect(s.album).toEqual([unrevealed(NEAR)])
    expect(s.ui.solvedAgain).toEqual([])
  })
})

describe('the reveal gate blocks the viewer and replay', () => {
  it.each<[string, Action]>([
    ['postcardViewed', view()],
    ['postcardViewerClosed', close],
    ['replayRequested', replay],
    ['replayConfirmed', confirm],
    ['replayKept', keep],
  ])('%s while a Postcard is pending: the same state', (_name, action) => {
    // NEAR's viewer is open (confirming) when another City's Postcard arrives unrevealed.
    const open = run(collectedReplay(), view(), replay)
    const pending = deepFreeze({ ...open, album: [...open.album, unrevealed(NEAR_2)] })
    expect(reducer(pending, action)).toBe(pending)
  })
})
