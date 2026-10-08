import { describe, expect, it, vi } from 'vitest'
import { cityById } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { withAnnouncement } from '../../src/game/announce.ts'
import { cityKey } from '../../src/game/journey.ts'
import { reducer, showPendingPostcard } from '../../src/game/reducer.ts'
import { activeSession, createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { Action, Album, AppState, Postcard } from '../../src/game/types.ts'

/* Story 3.3: the award on the solving step, the reveal gate, and postcardAdded. */

/** A known City whose pre-built Puzzle is malformed (content only; the real file is untouched). */
const BROKEN = 'americas-far-3'
vi.mock('../../src/content/city-puzzles.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/content/city-puzzles.ts')>()
  return {
    ...real,
    cityPuzzle: (id: string) =>
      id === 'americas-far-3' ? { cityId: id, givens: 'bad', solution: 'bad', difficulty: 'hard' } : real.cityPuzzle(id),
  }
})

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
const ASIA = 'asia-near-1'
const KEY = cityKey(NEAR)

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const choose = (cityId: string): Action => ({ type: 'cityChosen', cityId })
const select = (cell: number): Action => ({ type: 'cellSelected', cell })
const enter = (digit: number, date = D): Action => ({ type: 'digitEntered', digit, date })
const add = (cityId: string): Action => ({ type: 'postcardAdded', cityId })
const unrevealed = (cityId: string, collectedOn = D): Postcard => ({ cityId, collectedOn, revealed: false })
const revealed = (cityId: string): Postcard => ({ cityId, collectedOn: '2026-10-01', revealed: true })
const withAlbum = (album: Album, base: AppState = createInitialState()): AppState => deepFreeze({ ...base, album })

/** A City opened from the Album with every empty cell but the last filled correctly; returns the state and that cell. */
function oneLeft(cityId: string, base: AppState = createInitialState()): { state: AppState; last: number; digit: number } {
  // A collected City replays through the Postcard viewer's "Play again" (Story 3.4).
  const collected = base.album.some((p) => p.cityId === cityId)
  let s = collected ? run(base, { type: 'postcardViewed', cityId }, { type: 'replayRequested' }) : reducer(base, choose(cityId))
  const { session } = activeSession(s)!
  const cells = [...session.digits].flatMap((d, i) => (d === '0' ? [i] : []))
  for (const i of cells.slice(0, -1)) s = run(s, select(i), enter(Number(session.solution[i])))
  const last = cells.at(-1)!
  s = deepFreeze(reducer(s, select(last)))
  return { state: s, last, digit: Number(session.solution[last]) }
}

const numberFirst = (s: AppState, digit: number): AppState =>
  deepFreeze(run(s, { type: 'inputModeChosen', mode: 'numberFirst' }, enter(digit)))

/** Every way the last digit can be placed, dated `date`. */
function solvingSteps(date: string): [string, () => { before: AppState; action: Action }][] {
  return [
    [
      'digitEntered',
      () => {
        const { state, digit } = oneLeft(NEAR)
        return { before: state, action: enter(digit, date) }
      },
    ],
    [
      'cellClicked',
      () => {
        const { state, last, digit } = oneLeft(NEAR)
        return { before: numberFirst(state, digit), action: { type: 'cellClicked', cell: last, date } }
      },
    ],
    [
      'currentDigitPlaced',
      () => {
        const { state, digit } = oneLeft(NEAR)
        return { before: numberFirst(state, digit), action: { type: 'currentDigitPlaced', date } }
      },
    ],
    [
      'hintApplied',
      () => {
        const { state } = oneLeft(NEAR)
        const explained = deepFreeze(run(state, { type: 'hintRequested' }, { type: 'hintRequested' }))
        expect(explained.ui.hint?.step).toBe('explain')
        return { before: explained, action: { type: 'hintApplied', date } }
      },
    ],
  ]
}

describe('award on the solving step', () => {
  it.each(solvingSteps(D))('%s: the same step marks the City solved and appends its Postcard with the date passed in', (_name, setup) => {
    const { before, action } = setup()
    expect(before.album).toEqual([])
    const after = reducer(before, action)
    expect(after.sessions[KEY].status).toBe('solved')
    expect(after.album).toEqual([{ cityId: NEAR, collectedOn: D, revealed: false }])
  })

  it('the date comes from the action, never the clock', () => {
    const { state, digit } = oneLeft(NEAR)
    expect(reducer(state, enter(digit, '1999-01-02')).album).toEqual([unrevealed(NEAR, '1999-01-02')])
  })

  it('the solve is announced "Solved"', () => {
    const { state, digit } = oneLeft(NEAR)
    expect(withAnnouncement(state, enter(digit)).ui.announcement?.text).toBe('Solved')
  })

  it('appends after earlier Postcards, in the order collected', () => {
    const { state, digit } = oneLeft(NEAR_2, withAlbum([revealed(ASIA)]))
    expect(reducer(state, enter(digit)).album).toEqual([revealed(ASIA), unrevealed(NEAR_2)])
  })

  it('Free Play: solved, and the Album is the same reference', () => {
    const base = deepFreeze(createInitialState(samplePuzzle))
    let s = base
    const { givens, solution } = samplePuzzle
    for (let i = 0; i < 81; i++) if (givens[i] === '0') s = run(s, select(i), enter(Number(solution[i])))
    expect(s.sessions[FREE_PLAY_KEY].status).toBe('solved')
    expect(s.album).toBe(base.album)
  })

  it('a City already in the Album (a replay): solved, and the Album is the same reference', () => {
    const base = withAlbum([revealed(NEAR)])
    const { state, digit } = oneLeft(NEAR, base)
    const after = reducer(state, enter(digit))
    expect(after.sessions[KEY].status).toBe('solved')
    expect(after.album).toBe(base.album)
    expect(after.ui.screen).toBe('puzzle')
  })

  it.each(solvingSteps('06/10/2026'))('%s with a malformed date on an uncollected City: refused (the same state)', (_name, setup) => {
    const { before, action } = setup()
    expect(reducer(before, action)).toBe(before)
  })

  it('cellClicked with a malformed date: a solving click is refused whole even with another cell selected', () => {
    const { state, last, digit } = oneLeft(NEAR)
    const other = state.sessions[KEY].givens.indexOf('0')
    expect(other).not.toBe(last)
    const before = numberFirst(reducer(state, select(other)), digit)
    expect(before.ui.selectedCell).toBe(other)
    expect(reducer(before, { type: 'cellClicked', cell: last, date: 'bad' })).toBe(before)
  })

  it('cellClicked with a malformed date: a click that solves nothing selects and places as usual', () => {
    const s = deepFreeze(reducer(createInitialState(), choose(NEAR)))
    const { solution, givens } = s.sessions[KEY]
    const cell = givens.indexOf('0')
    const before = numberFirst(s, Number(solution[cell]))
    const after = reducer(before, { type: 'cellClicked', cell, date: 'bad' })
    expect(after.ui.selectedCell).toBe(cell)
    expect(after.sessions[KEY].digits[cell]).toBe(solution[cell])
    expect(after.album).toBe(before.album)
  })

  it('a malformed date on a step that solves nothing is not checked', () => {
    let s = reducer(createInitialState(), choose(NEAR))
    const { session } = activeSession(s)!
    const cell = session.digits.indexOf('0')
    s = run(s, select(cell), enter(Number(session.solution[cell]), 'someday'))
    expect(s.sessions[KEY].digits[cell]).toBe(session.solution[cell])
  })

  it('a malformed date still solves Free Play (nothing to award)', () => {
    let s = deepFreeze(createInitialState(samplePuzzle))
    const { givens, solution } = samplePuzzle
    for (let i = 0; i < 81; i++) if (givens[i] === '0') s = run(s, select(i), enter(Number(solution[i]), 'bad'))
    expect(s.sessions[FREE_PLAY_KEY].status).toBe('solved')
  })
})

describe('the reveal gate (showPendingPostcard)', () => {
  it('nothing pending: the same state', () => {
    const s = withAlbum([revealed(NEAR)])
    expect(showPendingPostcard(s)).toBe(s)
  })

  it('opens the Puzzle screen on the pending City with its Session rebuilt solved from content when missing', () => {
    const s = withAlbum([revealed(ASIA), unrevealed(NEAR)])
    const shown = showPendingPostcard(s)
    const puzzle = cityPuzzle(NEAR)!
    expect(shown.ui.screen).toBe('puzzle')
    expect(shown.ui.activeKey).toBe(KEY)
    expect(shown.sessions[KEY]).toEqual({ ...createSession(KEY, puzzle), digits: puzzle.solution, status: 'solved' })
    expect(shown.album).toBe(s.album)
    expect(shown.meta).toBe(s.meta)
    expect(showPendingPostcard(shown)).toBe(shown)
  })

  it('rebuilds a Session that is not solved; a solved one is kept', () => {
    const inProgress = reducer(withAlbum([]), choose(NEAR))
    const s = deepFreeze({ ...inProgress, album: [unrevealed(NEAR)] })
    expect(showPendingPostcard(s).sessions[KEY].status).toBe('solved')
    const { state, digit } = oneLeft(NEAR)
    const solved = reducer(state, enter(digit))
    expect(showPendingPostcard(solved)).toBe(solved)
    expect(solved.sessions[KEY].digits).toBe(solved.sessions[KEY].solution)
  })

  it('switching the current Puzzle clears Undo, the selection and the current digit', () => {
    let s = createInitialState(samplePuzzle)
    const cell = samplePuzzle.givens.indexOf('0')
    s = run(s, select(cell), enter(Number(samplePuzzle.solution[cell])))
    expect(s.ui.undo).toHaveLength(1)
    const shown = showPendingPostcard(deepFreeze({ ...s, album: [unrevealed(NEAR)] }))
    expect(shown.ui.activeKey).toBe(KEY)
    expect(shown.ui.undo).toEqual([])
    expect(shown.ui.selectedCell).toBeNull()
    expect(shown.ui.currentDigit).toBeNull()
    expect(shown.sessions[FREE_PLAY_KEY]).toBe(s.sessions[FREE_PLAY_KEY])
  })

  it('skips unknown City ids', () => {
    const s = withAlbum([unrevealed('atlantis')])
    expect(showPendingPostcard(s)).toBe(s)
    const t = withAlbum([unrevealed('atlantis'), unrevealed(ASIA)])
    expect(showPendingPostcard(t).ui.activeKey).toBe(cityKey(ASIA))
  })

  it('a solve stays on the Puzzle screen with the City current (the reveal shows there)', () => {
    const { state, digit } = oneLeft(NEAR)
    const after = reducer(state, enter(digit))
    expect(after.ui.screen).toBe('puzzle')
    expect(after.ui.activeKey).toBe(KEY)
  })
})

describe('blocked while a Postcard is pending', () => {
  const pending = () => {
    const { state, digit } = oneLeft(NEAR)
    return deepFreeze(reducer(state, enter(digit)))
  }

  const blocked: Action[] = [
    select(0),
    enter(5),
    { type: 'cellClicked', cell: 3, date: D },
    { type: 'currentDigitPlaced', date: D },
    { type: 'cellCleared' },
    { type: 'entryModeToggled' },
    { type: 'entryModeChosen', mode: 'notes' },
    { type: 'inputModeToggled' },
    { type: 'inputModeChosen', mode: 'numberFirst' },
    { type: 'undoRequested' },
    { type: 'restartRequested' },
    { type: 'restartConfirmed' },
    { type: 'hintRequested' },
    { type: 'hintApplied', date: D },
    { type: 'hintClosed' },
    { type: 'settingToggled', setting: 'lamplight' },
    { type: 'screenChosen', screen: 'album' },
    { type: 'screenChosen', screen: 'freePlay' },
    { type: 'screenChosen', screen: 'settings' },
    choose(NEAR_2),
    { type: 'albumRegionChosen', region: 'asia' },
    { type: 'freePlayResumed' },
    { type: 'freePlayDifficultyPicked', difficulty: 'hard' },
    { type: 'freePlayRequested', requestId: 9, difficulty: 'hard' },
    { type: 'freePlayReplaceRequested' },
  ]

  it.each(blocked.map((a) => [a.type, a] as const))('%s: the same state', (_type, action) => {
    const s = pending()
    expect(reducer(s, action)).toBe(s)
    expect(withAnnouncement(s, action)).toBe(s)
  })

  it('a generator reply gets through; the City and its reveal stay current', () => {
    const requested = deepFreeze(reducer(createInitialState(), { type: 'freePlayRequested', requestId: 1, difficulty: 'easy' }))
    const { state, digit } = oneLeft(NEAR, requested)
    const s = deepFreeze(reducer(state, enter(digit)))
    expect(s.ui.freePlay.status).toBe('generating')
    const replied = reducer(s, { type: 'freePlayGenerated', requestId: 1, puzzle: samplePuzzle })
    expect(replied).not.toBe(s)
    expect(replied.sessions[FREE_PLAY_KEY]).toEqual(createSession(FREE_PLAY_KEY, samplePuzzle))
    expect(replied.ui.screen).toBe('puzzle')
    expect(replied.ui.activeKey).toBe(KEY)
    expect(replied.album).toBe(s.album)
    const failed = reducer(s, { type: 'freePlayFailed', requestId: 1 })
    expect(failed.ui.freePlay.status).toBe('failed')
  })
})

describe('postcardAdded', () => {
  const pending = () => {
    const { state, digit } = oneLeft(NEAR)
    return deepFreeze(reducer(state, enter(digit)))
  }

  it('reveals the Postcard and opens the Album on its Region, every Postcard seen, the City "just arrived"', () => {
    const s = deepFreeze({ ...pending(), ui: { ...pending().ui, albumRegion: 'asia' as const } })
    const after = reducer(s, add(NEAR))
    expect(after.album).toEqual([{ cityId: NEAR, collectedOn: D, revealed: true }])
    expect(after.ui.screen).toBe('album')
    expect(after.ui.albumRegion).toBe('europe')
    expect(after.ui.albumSeen).toBe(1)
    expect(after.ui.justArrived).toEqual([NEAR])
    expect(after.sessions).toBe(s.sessions)
    expect(after.ui.undo).toBe(s.ui.undo)
  })

  it('another id, or nothing pending: the same state', () => {
    const s = pending()
    expect(reducer(s, add(NEAR_2))).toBe(s)
    expect(reducer(s, add('atlantis'))).toBe(s)
    const done = deepFreeze(reducer(s, add(NEAR)))
    expect(reducer(done, add(NEAR))).toBe(done)
  })

  it('"just arrived" stays across Region tabs and goes on the next Album visit', () => {
    const opened = deepFreeze(reducer(pending(), add(NEAR)))
    const asia = reducer(opened, { type: 'albumRegionChosen', region: 'asia' })
    expect(asia.ui.justArrived).toEqual([NEAR])
    const away = reducer(asia, { type: 'screenChosen', screen: 'settings' })
    expect(away.ui.justArrived).toEqual([])
    expect(reducer(away, { type: 'screenChosen', screen: 'album' }).ui.justArrived).toEqual([])
  })

  it('a new reveal sequence starts afresh: add, travel, solve another, add → only the new City is marked', () => {
    const opened = deepFreeze(reducer(pending(), add(NEAR)))
    expect(opened.ui.justArrived).toEqual([NEAR])
    const { state, digit } = oneLeft(NEAR_2, opened)
    expect(state.ui.justArrived).toEqual([])
    const done = reducer(reducer(state, enter(digit)), add(NEAR_2))
    expect(done.ui.screen).toBe('album')
    expect(done.ui.justArrived).toEqual([NEAR_2])
  })

  it('after the reveal the solved City is no longer blocked: input is refused as for any solved Puzzle', () => {
    const opened = reducer(pending(), add(NEAR))
    const back = reducer(opened, { type: 'screenChosen', screen: 'puzzle' })
    expect(back.ui.screen).toBe('puzzle')
    expect(back.ui.activeKey).toBe(KEY)
    const given = back.sessions[KEY].givens.indexOf('0')
    const selected = deepFreeze(reducer(back, select(given)))
    expect(selected.ui.selectedCell).toBe(given)
    expect(reducer(selected, enter(1))).toBe(selected)
    expect(reducer(selected, { type: 'cellCleared' })).toBe(selected)
    expect(reducer(selected, { type: 'undoRequested' })).toBe(selected)
  })
})

describe('several unrevealed Postcards', () => {
  it('are shown one at a time, oldest first, then the Album opens on the last one’s Region', () => {
    const s = showPendingPostcard(withAlbum([unrevealed(ASIA), revealed(NEAR_2), unrevealed(NEAR)]))
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.activeKey).toBe(cityKey(ASIA))
    expect(reducer(s, add(NEAR))).toBe(s)

    const second = reducer(s, add(ASIA))
    expect(second.album.map((p) => p.revealed)).toEqual([true, true, false])
    expect(second.ui.screen).toBe('puzzle')
    expect(second.ui.activeKey).toBe(KEY)
    expect(second.sessions[KEY].status).toBe('solved')

    const done = reducer(second, add(NEAR))
    expect(done.album.every((p) => p.revealed)).toBe(true)
    expect(done.ui.screen).toBe('album')
    expect(done.ui.albumRegion).toBe(cityById(NEAR)!.region)
    expect(done.ui.albumSeen).toBe(3)
    expect(done.ui.justArrived).toEqual([ASIA, NEAR])
  })
})

describe('an unrevealable pending Postcard never blocks', () => {
  it.each([
    ['an unknown City', 'atlantis'],
    ['a City whose Puzzle is malformed', BROKEN],
  ])('%s: no gate, and input goes through', (_label, cityId) => {
    const base = withAlbum([unrevealed(cityId)], createInitialState(samplePuzzle))
    expect(showPendingPostcard(base)).toBe(base)
    const cell = samplePuzzle.givens.indexOf('0')
    const played = run(base, select(cell), enter(Number(samplePuzzle.solution[cell])))
    expect(played.sessions[FREE_PLAY_KEY].digits[cell]).toBe(samplePuzzle.solution[cell])
    expect(reducer(base, { type: 'screenChosen', screen: 'album' }).ui.screen).toBe('album')
    expect(reducer(base, add(cityId))).toBe(base)
  })

  it('a later revealable Postcard still shows', () => {
    const s = showPendingPostcard(withAlbum([unrevealed(BROKEN), unrevealed(ASIA)]))
    expect(s.ui.activeKey).toBe(cityKey(ASIA))
  })
})
