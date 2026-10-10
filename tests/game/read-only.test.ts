import { describe, expect, it } from 'vitest'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { withAnnouncement } from '../../src/game/announce.ts'
import { cityKey } from '../../src/game/journey.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState, createSession } from '../../src/game/session.ts'
import type { Action, AppState, ReadOnlyReason } from '../../src/game/types.ts'

const DATE = '2026-10-08'
const PARIS = 'europe-near-1'
const LONDON = 'europe-near-2'
const run = (state: AppState, ...actions: Action[]) => actions.reduce(withAnnouncement, state)
const emptyCells = [...samplePuzzle.givens].flatMap((ch, i) => (ch === '0' ? [i] : []))

/** Free Play current, Paris in progress, London collected; read-only for `reason`. */
function readOnly(reason: ReadOnlyReason = 'otherTab'): AppState {
  const s = createInitialState(samplePuzzle)
  const paris = createSession(cityKey(PARIS), cityPuzzle(PARIS)!)
  return {
    ...s,
    album: [{ cityId: LONDON, collectedOn: '2026-10-01', revealed: true }],
    sessions: { ...s.sessions, [paris.key]: paris },
    ui: { ...s.ui, readOnly: reason },
  }
}

describe('read-only reducer guard', () => {
  it.each(['otherTab', 'newerVersion'] as const)('%s: a typed digit, a Note, Undo and Restart change nothing', (reason) => {
    const start = run(readOnly(reason), { type: 'cellSelected', cell: emptyCells[0] })
    expect(start.ui.selectedCell).toBe(emptyCells[0])
    expect(run(start, { type: 'digitEntered', digit: Number(samplePuzzle.solution[emptyCells[0]]), date: DATE })).toBe(start)
    const notes = run(start, { type: 'entryModeChosen', mode: 'notes' })
    expect(run(notes, { type: 'digitEntered', digit: 3, date: DATE })).toBe(notes)
    expect(run(start, { type: 'cellCleared' })).toBe(start)
    expect(run(start, { type: 'undoRequested' })).toBe(start)
    expect(run(start, { type: 'restartRequested' }, { type: 'restartConfirmed' }).sessions).toBe(start.sessions)
  })

  it('a setting toggle changes nothing', () => {
    const s = readOnly()
    expect(run(s, { type: 'settingToggled', setting: 'lamplight' })).toBe(s)
    expect(run(s, { type: 'settingToggled', setting: 'mistakeHighlighting' })).toBe(s)
  })

  it('choosing a new City (a fresh Session) or a replay changes nothing', () => {
    const s = { ...readOnly(), ui: { ...readOnly().ui, screen: 'album' as const } }
    expect(run(s, { type: 'cityChosen', cityId: 'europe-near-3' })).toBe(s)
    const viewing = run(s, { type: 'postcardViewed', cityId: LONDON })
    expect(viewing.ui.viewer?.cityId).toBe(LONDON)
    expect(run(viewing, { type: 'replayRequested' })).toBe(viewing)
  })

  it('a Free Play reply that would replace the Puzzle changes no saved slice, but the entry stops "generating"', () => {
    const s = readOnly()
    const pending = run(s, { type: 'screenChosen', screen: 'freePlay' }, { type: 'freePlayRequested', requestId: 1, difficulty: 'easy' })
    expect(pending.ui.freePlay.status).toBe('generating')
    const next = run(pending, { type: 'freePlayGenerated', requestId: 1, puzzle: samplePuzzle })
    expect(next.sessions).toBe(s.sessions)
    expect(next.settings).toBe(s.settings)
    expect(next.meta).toBe(s.meta)
    expect(next.ui.freePlay.status).toBe('idle')
    expect(next.ui.screen).toBe('freePlay')
    // A stale reply is still ignored.
    expect(run(next, { type: 'freePlayGenerated', requestId: 1, puzzle: samplePuzzle })).toBe(next)
  })

  it('"Add to Album" still closes a pending reveal (in memory only)', () => {
    const s = createInitialState()
    const pending: AppState = { ...s, album: [{ cityId: PARIS, collectedOn: DATE, revealed: false }], ui: { ...s.ui, readOnly: 'otherTab' } }
    const next = run(pending, { type: 'postcardAdded', cityId: PARIS })
    expect(next.album[0].revealed).toBe(true)
    expect(next.ui.screen).toBe('album')
  })

  it('Hint is unavailable', () => {
    const s = run(readOnly(), { type: 'cellSelected', cell: emptyCells[0] })
    expect(run(s, { type: 'hintRequested' })).toBe(s)
  })

  it('UI-only changes still apply: selection, modes, screens, opening an existing Puzzle, the viewer', () => {
    const s = readOnly()
    const album = run(s, { type: 'screenChosen', screen: 'album' })
    expect(album.ui.screen).toBe('album')
    const paris = run(album, { type: 'cityChosen', cityId: PARIS })
    expect(paris.ui.screen).toBe('puzzle')
    expect(paris.ui.activeKey).toBe(cityKey(PARIS))
    expect(paris.sessions).toBe(s.sessions)
    expect(paris.meta).toBe(s.meta)
    const free = run(paris, { type: 'screenChosen', screen: 'freePlay' }, { type: 'freePlayResumed' })
    expect(free.ui.activeKey).toBe('free')
    expect(run(free, { type: 'entryModeToggled' }).ui.entryMode).toBe('notes')
    expect(run(album, { type: 'postcardViewed', cityId: LONDON }).ui.viewer).toEqual({ cityId: LONDON, confirming: false })
  })

  it('a writable tab is unaffected', () => {
    const s = { ...readOnly(), ui: { ...readOnly().ui, readOnly: null } }
    const next = run(s, { type: 'settingToggled', setting: 'lamplight' })
    expect(next.settings.lamplight).toBe(true)
  })
})

describe('save outcomes and dismissals', () => {
  const fresh = () => createInitialState(samplePuzzle)

  it('saveFailed sets the flag and is announced once per false→true; repeats are the same state', () => {
    const failed = run(fresh(), { type: 'saveFailed' })
    expect(failed.ui.saveFailed).toBe(true)
    expect(failed.ui.announcement?.text).toBe("Your last change couldn't be saved. Your next move will try again - your Puzzle is still here.")
    expect(run(failed, { type: 'saveFailed' })).toBe(failed)
  })

  it('saveSucceeded clears it (and its dismissal); a later failure is announced again', () => {
    const failed = run(fresh(), { type: 'saveFailed' }, { type: 'bannerDismissed', banner: 'saveFailed' })
    expect(failed.ui.dismissed).toEqual(['saveFailed'])
    const ok = run(failed, { type: 'saveSucceeded' })
    expect(ok.ui.saveFailed).toBe(false)
    expect(ok.ui.dismissed).toEqual([])
    expect(run(ok, { type: 'saveSucceeded' })).toBe(ok)
    const again = run(ok, { type: 'saveFailed' })
    expect(again.ui.saveFailed).toBe(true)
    expect(again.ui.announcement!.seq).toBe(failed.ui.announcement!.seq + 1)
  })

  it('bannerDismissed records the banner once and ignores unknown kinds; a read-only tab stays read-only', () => {
    const s = readOnly()
    const dismissed = run(s, { type: 'bannerDismissed', banner: 'readOnly' })
    expect(dismissed.ui.dismissed).toEqual(['readOnly'])
    expect(dismissed.ui.readOnly).toBe('otherTab')
    expect(run(dismissed, { type: 'bannerDismissed', banner: 'readOnly' })).toBe(dismissed)
    expect(run(s, { type: 'bannerDismissed', banner: 'nope' as never })).toBe(s)
  })

  it('apply while a Postcard waits to be revealed', () => {
    const s = createInitialState()
    const pending: AppState = { ...s, album: [{ cityId: PARIS, collectedOn: DATE, revealed: false }] }
    expect(reducer(pending, { type: 'saveFailed' }).ui.saveFailed).toBe(true)
    expect(reducer(pending, { type: 'bannerDismissed', banner: 'unreadable' }).ui.dismissed).toEqual(['unreadable'])
  })
})
