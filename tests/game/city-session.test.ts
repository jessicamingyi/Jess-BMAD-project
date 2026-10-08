import { describe, expect, it } from 'vitest'
import { CITIES } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { withAnnouncement } from '../../src/game/announce.ts'
import { reducer } from '../../src/game/reducer.ts'
import { activeSession, createInitialState, createSession } from '../../src/game/session.ts'
import type { Action, Album, AppState, Puzzle } from '../../src/game/types.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const choose = (cityId: string): Action => ({ type: 'cityChosen', cityId })
const select = (cell: number): Action => ({ type: 'cellSelected', cell })
const enter = (digit: number): Action => ({ type: 'digitEntered', digit })
const screen = (s: AppState['ui']['screen']): Action => ({ type: 'screenChosen', screen: s })
const undo: Action = { type: 'undoRequested' }

const NEAR = 'europe-near-1'
const NEAR_2 = 'europe-near-2'
const near = cityPuzzle(NEAR)!
const firstEmpty = (givens: string) => givens.indexOf('0')

/** The Album, fresh (no Session). */
const empty = () => deepFreeze(createInitialState())
/** A Free Play Puzzle in progress, current, on the Puzzle screen. */
const withFree = () => deepFreeze(createInitialState(samplePuzzle))
const postcards = (...ids: string[]): Album => ids.map((cityId) => ({ cityId, collectedOn: '2026-10-06', revealed: true }))

/** Play one correct digit in the current Puzzle (selecting its first empty cell). */
function playOne(state: AppState): AppState {
  const { session } = activeSession(state)!
  const cell = firstEmpty(session.digits)
  return run(state, select(cell), enter(Number(session.solution[cell])))
}

/** Solve the current Puzzle by placing every missing digit. */
function solve(state: AppState): AppState {
  let s = state
  const { session } = activeSession(s)!
  for (let i = 0; i < 81; i++) if (session.digits[i] === '0') s = run(s, select(i), enter(Number(session.solution[i])))
  return s
}

describe('cityChosen: travel', () => {
  it('builds a fresh city:<id> Session from the City Puzzle, makes it current and opens the Puzzle', () => {
    const before = empty()
    const s = reducer(before, choose(NEAR))
    expect(s.sessions[`city:${NEAR}`]).toEqual(createSession(`city:${NEAR}`, near))
    expect(s.sessions[`city:${NEAR}`].digits).toBe(near.givens)
    expect(s.sessions[`city:${NEAR}`].notes.every((m) => m === 0)).toBe(true)
    expect(s.ui.activeKey).toBe(`city:${NEAR}`)
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.undo).toEqual([])
    expect(s.ui.selectedCell).toBeNull()
    expect(s.ui.currentDigit).toBeNull()
    // Opening a Session never changes lastPlayedKey and never touches the Album.
    expect(s.meta).toBe(before.meta)
    expect(s.album).toBe(before.album)
  })

  it('clears selection, current digit, Undo and that City’s own Hint; another Session’s Hint stays', () => {
    const key = `city:${NEAR}`
    const base = empty()
    const stale: AppState = deepFreeze({
      ...base,
      ui: {
        ...base.ui,
        selectedCell: 4,
        currentDigit: 7,
        undo: [{ digits: near.givens, notes: Array(81).fill(0) }],
        hint: { sessionKey: key, step: 'nudge', result: null },
      },
    })
    const s = reducer(stale, choose(NEAR))
    expect(s.ui.undo).toEqual([])
    expect(s.ui.selectedCell).toBeNull()
    expect(s.ui.currentDigit).toBeNull()
    expect(s.ui.hint).toBeNull()

    const other: AppState = deepFreeze({ ...base, ui: { ...base.ui, hint: { sessionKey: 'free', step: 'nudge', result: null } } })
    expect(reducer(other, choose(NEAR)).ui.hint).toBe(other.ui.hint)
  })

  it('every reachable City opens from content in the same step (no generator)', () => {
    for (const c of CITIES.filter((c) => c.tier === 'near')) {
      const s = reducer(empty(), choose(c.id))
      expect(s.sessions[`city:${c.id}`].givens, c.id).toBe(cityPuzzle(c.id)!.givens)
    }
  })

  it('records nothing in Undo and announces nothing', () => {
    const s = withAnnouncement(empty(), choose(NEAR))
    expect(s.ui.undo).toEqual([])
    expect(s.ui.announcement).toBeNull()
  })
})

describe('cityChosen: carry on', () => {
  it('reopens an in-progress City as it was left: the same Session reference, Undo and selection kept', () => {
    const played = playOne(reducer(empty(), choose(NEAR)))
    const away = reducer(played, screen('album'))
    const back = reducer(away, choose(NEAR))
    expect(back.sessions[`city:${NEAR}`]).toBe(played.sessions[`city:${NEAR}`])
    expect(back.ui.activeKey).toBe(`city:${NEAR}`)
    expect(back.ui.screen).toBe('puzzle')
    expect(back.ui.undo).toBe(played.ui.undo)
    expect(back.ui.undo).toHaveLength(1)
    expect(back.ui.selectedCell).toBe(played.ui.selectedCell)
  })
})

describe('cityChosen: re-travel a solved City (no Postcard yet)', () => {
  it('replaces the solved Session with a fresh one', () => {
    const solved = solve(reducer(empty(), choose(NEAR)))
    expect(solved.sessions[`city:${NEAR}`].status).toBe('solved')
    expect(solved.album).toEqual([])
    const again = run(solved, screen('album'), choose(NEAR))
    expect(again.sessions[`city:${NEAR}`]).toEqual(createSession(`city:${NEAR}`, near))
    expect(again.ui.undo).toEqual([])
    expect(again.ui.selectedCell).toBeNull()
  })
})

describe('cityChosen: forged', () => {
  it.each([
    ['a locked City', 'lisbon'],
    ['a locked Far City', 'europe-far-1'],
    ['an unknown id', 'atlantis'],
    ['an empty id', ''],
    ['a prototype key', '__proto__'],
  ])('%s: the same state reference', (_, id) => {
    const s = empty()
    expect(reducer(s, choose(id))).toBe(s)
    const playing = withFree()
    expect(reducer(playing, choose(id))).toBe(playing)
  })

  it('a non-string id: the same state reference', () => {
    const s = empty()
    expect(reducer(s, { type: 'cityChosen', cityId: 42 } as unknown as Action)).toBe(s)
  })

  it('a Mid City opens once 3 Near Postcards are in its Region', () => {
    const s = deepFreeze({ ...createInitialState(), album: postcards('europe-near-1', 'europe-near-2', 'europe-near-3') })
    expect(reducer(s, choose('lisbon')).ui.activeKey).toBe('city:lisbon')
  })
})

describe('cityChosen: other Sessions', () => {
  it('Free Play and another City in progress are untouched (same references)', () => {
    const a = playOne(reducer(withFree(), choose(NEAR)))
    const free = a.sessions.free
    const other = a.sessions[`city:${NEAR}`]
    const b = run(a, screen('album'), choose(NEAR_2))
    expect(b.sessions.free).toBe(free)
    expect(b.sessions[`city:${NEAR}`]).toBe(other)
    expect(b.ui.activeKey).toBe(`city:${NEAR_2}`)
  })

  it('digits go to the current Puzzle only', () => {
    const start = reducer(withFree(), choose(NEAR))
    const s = playOne(start)
    expect(s.sessions.free).toBe(start.sessions.free)
    expect(s.sessions.free.digits).toBe(samplePuzzle.givens)
    expect(s.sessions[`city:${NEAR}`].digits).not.toBe(near.givens)
    expect(s.meta.lastPlayedKey).toBe(`city:${NEAR}`)
  })
})

describe('Undo on a switch (the current Puzzle changes)', () => {
  it('City A → City B clears Undo; back to A starts with an empty history and A as left', () => {
    const a = playOne(reducer(empty(), choose(NEAR)))
    expect(a.ui.undo).toHaveLength(1)
    const b = run(a, screen('album'), choose(NEAR_2))
    expect(b.ui.undo).toEqual([])
    const back = run(b, screen('album'), choose(NEAR))
    expect(back.ui.undo).toEqual([])
    expect(back.sessions[`city:${NEAR}`]).toBe(a.sessions[`city:${NEAR}`])
    // Nothing to undo: the same state.
    expect(reducer(back, undo)).toBe(back)
  })

  it('Free Play → City and City → Free Play ("Carry on") each clear Undo', () => {
    const free = playOne(withFree())
    expect(free.ui.undo).toHaveLength(1)
    const city = run(free, screen('album'), choose(NEAR))
    expect(city.ui.undo).toEqual([])
    const played = playOne(city)
    const resumed = run(played, screen('freePlay'), { type: 'freePlayResumed' })
    expect(resumed.ui.activeKey).toBe('free')
    expect(resumed.ui.screen).toBe('puzzle')
    expect(resumed.ui.undo).toEqual([])
    expect(resumed.sessions.free).toBe(free.sessions.free)
  })

  it('returning to the same Puzzle keeps Undo (nav round trip, and "Carry on" on the current Free Play)', () => {
    const free = playOne(withFree())
    const back = run(free, screen('album'), screen('puzzle'))
    expect(back.ui.undo).toBe(free.ui.undo)
    const resumed = run(free, screen('freePlay'), { type: 'freePlayResumed' })
    expect(resumed.ui.undo).toBe(free.ui.undo)
    expect(resumed.ui.selectedCell).toBe(free.ui.selectedCell)
  })

  it('Undo only restores the current Puzzle', () => {
    const city = playOne(reducer(withFree(), choose(NEAR)))
    const undone = reducer(city, undo)
    expect(undone.sessions[`city:${NEAR}`].digits).toBe(near.givens)
    expect(undone.sessions.free).toBe(city.sessions.free)
  })
})

describe('freePlayResumed', () => {
  it('does nothing without a Free Play Session', () => {
    const s = empty()
    expect(reducer(s, { type: 'freePlayResumed' })).toBe(s)
  })

  it('does not change lastPlayedKey', () => {
    const city = playOne(reducer(withFree(), choose(NEAR)))
    const resumed = run(city, screen('freePlay'), { type: 'freePlayResumed' })
    expect(resumed.meta).toBe(city.meta)
  })
})

describe('Free Play reply while a City is current', () => {
  const MEDIUM: Puzzle = { ...samplePuzzle, difficulty: 'medium' }

  it('replaces only sessions.free; activeKey, Undo and the City Hint stay', () => {
    const city = playOne(reducer(withFree(), choose(NEAR)))
    const hinted = reducer(city, { type: 'hintRequested' })
    expect(hinted.ui.hint?.sessionKey).toBe(`city:${NEAR}`)
    const s = run(hinted, screen('freePlay'), { type: 'freePlayRequested', requestId: 1, difficulty: 'medium' }, screen('album'), {
      type: 'freePlayGenerated',
      requestId: 1,
      puzzle: MEDIUM,
    })
    expect(s.sessions.free).toEqual(createSession('free', MEDIUM))
    expect(s.sessions[`city:${NEAR}`]).toBe(hinted.sessions[`city:${NEAR}`])
    expect(s.ui.activeKey).toBe(`city:${NEAR}`)
    expect(s.ui.undo).toBe(hinted.ui.undo)
    expect(s.ui.hint).toBe(hinted.ui.hint)
    expect(s.ui.screen).toBe('album')
    expect(s.ui.freePlay.status).toBe('idle')
    expect(s.settings.freePlayDifficulty).toBe('medium')
    expect(s.ui.freePlay.picked).toBe('medium')
    // "Puzzle" still returns to the City; the new Free Play Puzzle waits under "Carry on".
    expect(reducer(s, screen('puzzle')).ui.activeKey).toBe(`city:${NEAR}`)
    const resumed = run(s, screen('freePlay'), { type: 'freePlayResumed' })
    expect(resumed.ui.activeKey).toBe('free')
    expect(resumed.sessions.free.difficulty).toBe('medium')
  })

  it('closes a Free Play Hint (its Session is replaced) while the City stays current', () => {
    const freeHint = reducer(withFree(), { type: 'hintRequested' })
    expect(freeHint.ui.hint?.sessionKey).toBe('free')
    const city = playOne(reducer(freeHint, choose(NEAR)))
    expect(city.ui.hint?.sessionKey).toBe('free')
    const s = run(city, screen('freePlay'), { type: 'freePlayRequested', requestId: 1, difficulty: 'medium' }, screen('album'), {
      type: 'freePlayGenerated',
      requestId: 1,
      puzzle: MEDIUM,
    })
    expect(s.ui.hint).toBeNull()
    expect(s.ui.activeKey).toBe(`city:${NEAR}`)
    expect(s.ui.undo).toBe(city.ui.undo)
  })

  it('still on the Free Play entry: the new Puzzle opens and becomes current (Undo cleared, as on any switch)', () => {
    const city = playOne(reducer(withFree(), choose(NEAR)))
    expect(city.ui.undo).toHaveLength(1)
    const s = run(city, screen('freePlay'), { type: 'freePlayRequested', requestId: 1, difficulty: 'medium' }, {
      type: 'freePlayGenerated',
      requestId: 1,
      puzzle: MEDIUM,
    })
    expect(s.ui.activeKey).toBe('free')
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.undo).toEqual([])
    expect(s.ui.selectedCell).toBeNull()
    expect(s.sessions.free).toEqual(createSession('free', MEDIUM))
    expect(s.sessions[`city:${NEAR}`]).toBe(city.sessions[`city:${NEAR}`])
  })

  it('with no City current, the reply becomes the current Puzzle (as before)', () => {
    const s = run(empty(), screen('freePlay'), { type: 'freePlayRequested', requestId: 1, difficulty: 'medium' }, {
      type: 'freePlayGenerated',
      requestId: 1,
      puzzle: MEDIUM,
    })
    expect(s.ui.activeKey).toBe('free')
    expect(s.ui.screen).toBe('puzzle')
  })
})

describe('Album screen and Region', () => {
  it('starts on the Album with no current Puzzle; "Puzzle" is refused', () => {
    const s = empty()
    expect(s.ui.screen).toBe('album')
    expect(s.ui.activeKey).toBeNull()
    expect(s.ui.albumRegion).toBe('europe')
    expect(reducer(s, screen('puzzle'))).toBe(s)
  })

  it('opening the Album picks the Region of the latest Postcard when one is new since the last visit', () => {
    const s = deepFreeze({ ...createInitialState(samplePuzzle), album: postcards('europe-near-1', 'asia-near-2') })
    const opened = reducer(s, screen('album'))
    expect(opened.ui.albumRegion).toBe('asia')
    expect(opened.ui.albumSeen).toBe(2)
    // No new Postcard since: the chosen tab is kept.
    const browsed = run(opened, { type: 'albumRegionChosen', region: 'americas' }, screen('puzzle'), screen('album'))
    expect(browsed.ui.albumRegion).toBe('americas')
    // A new Postcard since the last visit: open on its Region again.
    const newer: AppState = deepFreeze({ ...run(browsed, screen('puzzle')), album: [...browsed.album, ...postcards('europe-near-2')] })
    expect(reducer(newer, screen('album')).ui.albumRegion).toBe('europe')
  })

  it('tab → travel → back keeps the Region', () => {
    const s = run(empty(), { type: 'albumRegionChosen', region: 'asia' }, choose('asia-near-1'), screen('album'))
    expect(s.ui.albumRegion).toBe('asia')
  })

  it('albumRegionChosen switches the tab; the same or an unknown Region changes nothing', () => {
    const s = empty()
    const asia = reducer(s, { type: 'albumRegionChosen', region: 'asia' })
    expect(asia.ui.albumRegion).toBe('asia')
    expect(asia.sessions).toBe(s.sessions)
    expect(reducer(asia, { type: 'albumRegionChosen', region: 'asia' })).toBe(asia)
    expect(reducer(s, { type: 'albumRegionChosen', region: 'atlantis' } as unknown as Action)).toBe(s)
  })
})

describe('City solve', () => {
  it('marks the City Session solved and awards nothing yet (Story 3.3)', () => {
    const solved = solve(reducer(empty(), choose(NEAR)))
    expect(solved.sessions[`city:${NEAR}`].status).toBe('solved')
    expect(solved.album).toEqual([])
  })

  it('announces "Solved" for a City', () => {
    let s: AppState = reducer(empty(), choose(NEAR))
    const { session } = activeSession(s)!
    const cells = [...session.digits].flatMap((d, i) => (d === '0' ? [i] : []))
    for (const i of cells.slice(0, -1)) s = run(s, select(i), enter(Number(session.solution[i])))
    const last = cells.at(-1)!
    s = reducer(s, select(last))
    expect(withAnnouncement(s, enter(Number(session.solution[last]))).ui.announcement?.text).toBe('Solved')
  })
})

describe('Puzzle actions act on the current City only', () => {
  const key = `city:${NEAR}`
  const start = () => deepFreeze(reducer(withFree(), choose(NEAR)))

  it('H, H, hintApplied: the move lands in the City Session and its hintsUsed goes up by 1', () => {
    const s0 = start()
    const nudge = reducer(s0, { type: 'hintRequested' })
    expect(nudge.ui.hint?.sessionKey).toBe(key)
    expect(nudge.ui.hint?.step).toBe('nudge')
    expect(nudge.ui.hint?.result?.kind).toBe('chain')
    const explain = reducer(nudge, { type: 'hintRequested' })
    expect(explain.ui.hint?.step).toBe('explain')
    const opened = reducer(explain, { type: 'techniqueDefinitionOpened' })
    expect(opened.ui.hint?.definitionOpen).toBe(true)
    const applied = reducer(opened, { type: 'hintApplied' })
    expect(applied.sessions[key].digits).not.toBe(s0.sessions[key].digits)
    expect(applied.sessions[key].hintsUsed).toBe(1)
    expect(applied.ui.undo).toHaveLength(1)
    for (const s of [nudge, explain, opened, applied]) expect(s.sessions.free).toBe(s0.sessions.free)
  })

  it('a Note toggle and cellCleared change the City Session only', () => {
    const s0 = start()
    const cell = firstEmpty(near.givens)
    const noted = run(s0, { type: 'entryModeChosen', mode: 'notes' }, select(cell), enter(3))
    expect(noted.sessions[key].notes[cell]).not.toBe(0)
    const cleared = reducer(noted, { type: 'cellCleared' })
    expect(cleared.sessions[key].notes[cell]).toBe(0)
    for (const s of [noted, cleared]) expect(s.sessions.free).toBe(s0.sessions.free)
  })

  it('restartRequested + restartConfirmed clear the City to its Givens', () => {
    const s0 = start()
    const played = playOne(s0)
    expect(played.sessions[key].digits).not.toBe(near.givens)
    const confirming = reducer(played, { type: 'restartRequested' })
    expect(confirming.ui.restartConfirming).toBe(true)
    const restarted = reducer(confirming, { type: 'restartConfirmed' })
    expect(restarted.sessions[key].digits).toBe(near.givens)
    expect(restarted.ui.restartConfirming).toBe(false)
    for (const s of [played, confirming, restarted]) expect(s.sessions.free).toBe(s0.sessions.free)
  })

  it('a City hintRequested announces the nudge', () => {
    const s = withAnnouncement(start(), { type: 'hintRequested' })
    expect(s.ui.hint?.sessionKey).toBe(key)
    expect(s.ui.announcement?.text).toBeTruthy()
    expect(s.ui.announcement?.text).toMatch(/row|column|box/i)
  })
})
