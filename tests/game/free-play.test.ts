import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { withAnnouncement } from '../../src/game/announce.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { Action, AppState, Difficulty, Puzzle } from '../../src/game/types.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const requested = (requestId: number, difficulty: Difficulty = 'medium'): Action => ({
  type: 'freePlayRequested',
  requestId,
  difficulty,
})
const generated = (requestId: number, puzzle: Puzzle = MEDIUM): Action => ({ type: 'freePlayGenerated', requestId, puzzle })
const failed = (requestId: number): Action => ({ type: 'freePlayFailed', requestId })
const screen = (s: AppState['ui']['screen']): Action => ({ type: 'screenChosen', screen: s })

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
/** Same grid as the fixture, labelled with other Difficulties (the reducer doesn't grade). */
const MEDIUM: Puzzle = { givens, solution, difficulty: 'medium' }
const HARD: Puzzle = { givens: solution.slice(0, 40) + givens.slice(40), solution, difficulty: 'hard' }

/** First load now opens on the Album (Story 3.2); these tests start from the Free Play entry. */
const empty = () => deepFreeze(reducer(createInitialState(), { type: 'screenChosen', screen: 'freePlay' }))
const playing = () => deepFreeze(createInitialState(samplePuzzle))

describe('Free Play: first load', () => {
  it('starts on the Album with no Session; the entry has the picker on Easy, nothing pending', () => {
    const first = createInitialState()
    expect(first.sessions).toEqual({})
    expect(first.ui.screen).toBe('album')
    expect(first.ui.activeKey).toBeNull()
    expect(first.album).toEqual([])
    const s = empty()
    expect(s.ui.screen).toBe('freePlay')
    expect(s.ui.freePlay).toEqual({ picked: 'easy', requestId: 0, status: 'idle', confirmingReplace: false })
    expect(s.settings.freePlayDifficulty).toBeNull()
  })

  it('refuses the Puzzle screen until a Session exists', () => {
    const s = empty()
    expect(reducer(s, screen('puzzle'))).toBe(s)
  })
})

describe('Free Play: picking and starting', () => {
  it('picks a Difficulty; picking the same one or a bad one changes nothing', () => {
    const s = empty()
    const picked = reducer(s, { type: 'freePlayDifficultyPicked', difficulty: 'hard' })
    expect(picked.ui.freePlay.picked).toBe('hard')
    expect(reducer(picked, { type: 'freePlayDifficultyPicked', difficulty: 'hard' })).toBe(picked)
    expect(reducer(s, { type: 'freePlayDifficultyPicked', difficulty: 'expert' as Difficulty })).toBe(s)
  })

  it('start: generating with the new id and Difficulty; picker locked while generating', () => {
    const s = run(empty(), requested(1))
    expect(s.ui.freePlay).toEqual({ picked: 'medium', requestId: 1, status: 'generating', confirmingReplace: false })
    expect(s.sessions).toEqual({})
    expect(s.ui.undo).toEqual([])
    expect(reducer(s, { type: 'freePlayDifficultyPicked', difficulty: 'hard' })).toBe(s)
  })

  it('the nav stays usable while generating', () => {
    const s = run(empty(), requested(1), screen('settings'))
    expect(s.ui.screen).toBe('settings')
    expect(s.ui.freePlay.status).toBe('generating')
  })

  it('opening the entry seeds the picker from the last Free Play Difficulty', () => {
    const s = run(empty(), requested(1, 'hard'), generated(1, HARD), screen('freePlay'))
    expect(s.settings.freePlayDifficulty).toBe('hard')
    expect(s.ui.freePlay.picked).toBe('hard')
    // A picked-but-not-started Difficulty is forgotten when the entry reopens.
    const again = run(s, { type: 'freePlayDifficultyPicked', difficulty: 'easy' }, screen('settings'), screen('freePlay'))
    expect(again.ui.freePlay.picked).toBe('hard')
  })
})

describe('Free Play: replies', () => {
  it('latest reply: fresh Session, empty Undo, Difficulty remembered, Puzzle screen', () => {
    const s = run(empty(), requested(1), generated(1))
    expect(s.sessions.free).toEqual({
      key: 'free',
      givens,
      solution,
      digits: givens,
      notes: Array(81).fill(0),
      status: 'inProgress',
      difficulty: 'medium',
      hintsUsed: 0,
    })
    expect(s.ui.undo).toEqual([])
    expect(s.settings.freePlayDifficulty).toBe('medium')
    expect(s.meta.lastPlayedKey).toBe('free')
    expect(s.ui.screen).toBe('puzzle')
    expect(s.ui.freePlay.status).toBe('idle')
  })

  it('a reply while the player is elsewhere waits under "Puzzle" (screen unchanged)', () => {
    const s = run(empty(), requested(1), screen('settings'), generated(1))
    expect(s.ui.screen).toBe('settings')
    expect(s.sessions.free.difficulty).toBe('medium')
    expect(run(s, screen('puzzle')).ui.screen).toBe('puzzle')
  })

  it('stale id: state returned unchanged (same reference)', () => {
    const s = run(empty(), requested(2))
    expect(reducer(s, generated(1))).toBe(s)
    expect(reducer(s, failed(1))).toBe(s)
    expect(withAnnouncement(s, generated(3))).toBe(s)
  })

  it('reply while idle (no request pending): ignored', () => {
    const s = empty()
    expect(reducer(s, generated(0))).toBe(s)
    expect(reducer(s, failed(0))).toBe(s)
    const done = run(s, requested(1), generated(1))
    expect(reducer(done, generated(1))).toBe(done)
    expect(reducer(done, failed(1))).toBe(done)
  })

  it('two requests in a row: the older reply is ignored, the latest applied', () => {
    const s = run(empty(), requested(1, 'medium'), requested(2, 'hard'))
    const afterOld = reducer(s, generated(1, MEDIUM))
    expect(afterOld).toBe(s)
    const latest = reducer(afterOld, generated(2, HARD))
    expect(latest.sessions.free.difficulty).toBe('hard')
    expect(latest.sessions.free.givens).toBe(HARD.givens)
  })

  it('failure with the latest id: failed, picker free again, Session untouched', () => {
    const before = playing()
    const s = run(before, screen('freePlay'), requested(1), failed(1))
    expect(s.ui.freePlay.status).toBe('failed')
    expect(s.sessions.free).toBe(before.sessions.free)
    expect(s.ui.screen).toBe('freePlay')
    expect(reducer(s, { type: 'freePlayDifficultyPicked', difficulty: 'hard' }).ui.freePlay.picked).toBe('hard')
  })

  it('a failure line clears on picking another Difficulty', () => {
    const s = run(empty(), requested(1), failed(1), { type: 'freePlayDifficultyPicked', difficulty: 'hard' })
    expect(s.ui.freePlay.status).toBe('idle')
    expect(s.ui.freePlay.picked).toBe('hard')
  })

  it('a failure line clears on re-entering the entry', () => {
    const s = run(empty(), requested(1), failed(1), screen('settings'), screen('freePlay'))
    expect(s.ui.freePlay.status).toBe('idle')
  })

  it('re-entering the entry while generating keeps the pending Difficulty and status', () => {
    const s = run(empty(), requested(1, 'medium'), screen('settings'), screen('freePlay'))
    expect(s.ui.freePlay.picked).toBe('medium')
    expect(s.ui.freePlay.status).toBe('generating')
    expect(s.ui.freePlay.requestId).toBe(1)
  })

  it('a malformed Puzzle in a reply becomes a failure, never a broken Session', () => {
    const s = run(empty(), requested(1))
    const bad = reducer(s, generated(1, { givens: 'x', solution, difficulty: 'easy' }))
    expect(bad.sessions).toEqual({})
    expect(bad.ui.freePlay.status).toBe('failed')
  })
})

describe('Free Play: in progress and replace', () => {
  const withDigits = () => {
    const [a, b] = emptyCells
    return run(
      playing(),
      { type: 'cellSelected', cell: a },
      { type: 'digitEntered', digit: Number(solution[a]), date: '2026-10-07' },
      { type: 'cellSelected', cell: b },
      { type: 'entryModeChosen', mode: 'notes' },
      { type: 'digitEntered', digit: 3, date: '2026-10-07' },
      { type: 'restartRequested' },
    )
  }

  it('Carry on: the Puzzle exactly as left (digits, Notes, Undo)', () => {
    const s = withDigits()
    const back = run(s, screen('freePlay'), screen('puzzle'))
    expect(back.sessions.free).toBe(s.sessions.free)
    expect(back.ui.undo).toBe(s.ui.undo)
    expect(back.ui.undo).toHaveLength(2)
  })

  it('replace confirm opens only with an in-progress Session, and closes on cancel', () => {
    const e = empty()
    expect(reducer(e, { type: 'freePlayReplaceRequested' })).toBe(e)
    const s = run(withDigits(), screen('freePlay'))
    const open = reducer(s, { type: 'freePlayReplaceRequested' })
    expect(open.ui.freePlay.confirmingReplace).toBe(true)
    expect(reducer(open, { type: 'freePlayReplaceRequested' })).toBe(open)
    const closed = reducer(open, { type: 'freePlayReplaceCancelled' })
    expect(closed.ui.freePlay.confirmingReplace).toBe(false)
    expect(closed.sessions.free).toBe(s.sessions.free)
    expect(reducer(closed, { type: 'freePlayReplaceCancelled' })).toBe(closed)
  })

  it('leaving the entry closes the replace confirm', () => {
    const s = run(withDigits(), screen('freePlay'), { type: 'freePlayReplaceRequested' }, screen('settings'))
    expect(s.ui.freePlay.confirmingReplace).toBe(false)
  })

  it('replacing: new Session, Undo emptied (not recorded), selection and Restart confirm cleared', () => {
    const s = run(withDigits(), screen('freePlay'), { type: 'freePlayReplaceRequested' }, requested(5, 'hard'))
    expect(s.ui.freePlay.confirmingReplace).toBe(false)
    expect(s.sessions.free.digits).not.toBe(givens)
    const next = reducer(s, generated(5, HARD))
    expect(next.sessions.free.digits).toBe(HARD.givens)
    expect(next.sessions.free.notes.every((m) => m === 0)).toBe(true)
    expect(next.ui.undo).toEqual([])
    expect(next.ui.selectedCell).toBeNull()
    expect(next.ui.currentDigit).toBeNull()
    expect(next.ui.restartConfirming).toBe(false)
    expect(reducer(next, { type: 'undoRequested' })).toBe(next)
  })

  it('Free Play actions never record Undo', () => {
    const s = withDigits()
    const after = run(
      s,
      screen('freePlay'),
      { type: 'freePlayDifficultyPicked', difficulty: 'hard' },
      { type: 'freePlayReplaceRequested' },
      { type: 'freePlayReplaceCancelled' },
      requested(1),
      failed(1),
    )
    expect(after.ui.undo).toBe(s.ui.undo)
  })
})

describe('Free Play: solved', () => {
  it('solving leaves album untouched (same reference)', () => {
    const s = run(empty(), requested(1, 'easy'), generated(1, samplePuzzle))
    const solved = run(
      s,
      ...emptyCells.flatMap((c): Action[] => [
        { type: 'cellSelected', cell: c },
        { type: 'digitEntered', digit: Number(solution[c]), date: '2026-10-07' },
      ]),
    )
    expect(solved.sessions.free.status).toBe('solved')
    expect(solved.album).toBe(s.album)
    // A solved Puzzle has nothing to replace: the entry offers a plain start.
    const entry = reducer(solved, screen('freePlay'))
    expect(reducer(entry, { type: 'freePlayReplaceRequested' })).toBe(entry)
  })
})
