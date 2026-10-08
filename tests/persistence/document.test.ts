import { describe, expect, it } from 'vitest'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'
import { fromDocument, SCHEMA_VERSION, toDocument } from '../../src/persistence/document.ts'

const PARIS = 'europe-near-1'

function played(): AppState {
  const base = createInitialState(samplePuzzle)
  const paris = createSession(cityKey(PARIS), cityPuzzle(PARIS)!)
  const notes = paris.notes.map((_, i) => (i === 3 ? 0b100000101 : 0))
  return {
    ...base,
    album: [{ cityId: 'asia-near-1', collectedOn: '2026-10-07', revealed: false }],
    sessions: { ...base.sessions, [paris.key]: { ...paris, notes, hintsUsed: 2 } },
    settings: { ...base.settings, lamplight: true, mistakeHighlighting: true, freePlayDifficulty: 'hard' },
    meta: { lastPlayedKey: paris.key, seenStorageNotice: true, persistGranted: null },
    ui: { ...base.ui, undo: [{ digits: paris.digits, notes }], selectedCell: 4, entryMode: 'notes' },
  }
}

const docOf = () => JSON.parse(JSON.stringify(toDocument(played()))) as Record<string, unknown>

describe('toDocument', () => {
  it('holds the saved slices and the version, never ui', () => {
    const doc = toDocument(played())
    expect(Object.keys(doc).sort()).toEqual(['album', 'meta', 'schemaVersion', 'sessions', 'settings'])
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION)
    expect(SCHEMA_VERSION).toBe(2)
    expect(doc.meta).toEqual({ lastPlayedKey: 'city:europe-near-1', seenStorageNotice: true, persistGranted: null })
    expect(JSON.stringify(doc)).not.toContain('undo')
    expect(JSON.stringify(doc)).not.toContain('selectedCell')
  })

  it('stores grids as 81-char digit strings and notes as 81 numbers', () => {
    const doc = toDocument(played())
    for (const s of Object.values(doc.sessions)) {
      for (const grid of [s.givens, s.solution, s.digits]) expect(grid).toMatch(/^[0-9]{81}$/)
      expect(s.notes).toHaveLength(81)
      expect(s.notes.every((n) => typeof n === 'number')).toBe(true)
    }
  })

  it('copies rather than shares the state', () => {
    const state = played()
    const doc = toDocument(state)
    expect(doc.album).not.toBe(state.album)
    expect(doc.sessions).not.toBe(state.sessions)
    expect(doc.sessions[cityKey(PARIS)].notes).not.toBe(state.sessions[cityKey(PARIS)].notes)
    expect(doc.settings).not.toBe(state.settings)
  })
})

describe('fromDocument', () => {
  it('round-trips the saved slices through structured clone', () => {
    const state = played()
    const slices = fromDocument(structuredClone(toDocument(state)))
    expect(slices).toEqual({ album: state.album, sessions: state.sessions, settings: state.settings, meta: state.meta })
  })

  it('round-trips an empty first-visit state', () => {
    const state = createInitialState()
    expect(fromDocument(toDocument(state))).toEqual({
      album: [],
      sessions: {},
      settings: state.settings,
      meta: { lastPlayedKey: null, seenStorageNotice: false, persistGranted: null },
    })
  })

  it('rejects another or a missing schemaVersion', () => {
    expect(fromDocument({ ...docOf(), schemaVersion: 1 })).toBeNull()
    expect(fromDocument({ ...docOf(), schemaVersion: 3 })).toBeNull()
    expect(fromDocument({ ...docOf(), schemaVersion: '2' })).toBeNull()
    const { schemaVersion: _, ...unversioned } = docOf()
    expect(fromDocument(unversioned)).toBeNull()
  })

  it.each([undefined, null, 42, 'save', [], true])('rejects a non-document %j', (value) => {
    expect(fromDocument(value)).toBeNull()
  })

  const withFreeSession = (patch: Record<string, unknown>) => {
    const doc = docOf()
    const sessions = doc.sessions as Record<string, Record<string, unknown>>
    return { ...doc, sessions: { ...sessions, [FREE_PLAY_KEY]: { ...sessions[FREE_PLAY_KEY], ...patch } } }
  }
  const zeros = (n: number) => Array.from({ length: n }, () => 0)

  it.each([
    ['short givens', { givens: '123' }],
    ['non-digit digits', { digits: 'x'.repeat(81) }],
    ['solution as an array', { solution: [...samplePuzzle.solution] }],
    ['80 notes', { notes: zeros(80) }],
    ['a string note', { notes: ['1', ...zeros(80)] }],
    ['a note mask over 9 bits', { notes: [512, ...zeros(80)] }],
    ['an unknown status', { status: 'abandoned' }],
    ['an unknown difficulty', { difficulty: 'fiendish' }],
    ['a negative hintsUsed', { hintsUsed: -1 }],
    ['a mismatched key', { key: 'city:elsewhere' }],
  ])('rejects a Session with %s', (_name, patch) => {
    expect(fromDocument(withFreeSession(patch))).toBeNull()
  })

  it.each([
    ['album not an array', { album: {} }],
    ['a Postcard without a date', { album: [{ cityId: PARIS, revealed: true }] }],
    ['a Postcard with a bad date', { album: [{ cityId: PARIS, collectedOn: '8 Oct', revealed: true }] }],
    ['a Postcard with a non-boolean revealed', { album: [{ cityId: PARIS, collectedOn: '2026-10-08', revealed: 1 }] }],
    ['sessions as an array', { sessions: [] }],
    ['a settings string', { settings: 'dark' }],
    ['a non-boolean setting', { settings: { ...createInitialState().settings, lamplight: 'yes' } }],
    ['an unknown Free Play Difficulty', { settings: { ...createInitialState().settings, freePlayDifficulty: 'extreme' } }],
    ['no meta', { meta: undefined }],
    ['a numeric lastPlayedKey', { meta: { lastPlayedKey: 3, seenStorageNotice: true, persistGranted: null } }],
    ['no seenStorageNotice (a v1 meta)', { meta: { lastPlayedKey: null } }],
    ['a non-boolean seenStorageNotice', { meta: { lastPlayedKey: null, seenStorageNotice: 'yes', persistGranted: null } }],
    ['no persistGranted', { meta: { lastPlayedKey: null, seenStorageNotice: true } }],
    ['a non-boolean persistGranted', { meta: { lastPlayedKey: null, seenStorageNotice: true, persistGranted: 'granted' } }],
  ])('rejects %s', (_name, patch) => {
    expect(fromDocument({ ...docOf(), ...patch })).toBeNull()
  })

  it('keeps a "__proto__" Session key as plain data', () => {
    const doc = docOf()
    const free = (doc.sessions as Record<string, Record<string, unknown>>)[FREE_PLAY_KEY]
    const sessions: unknown = JSON.parse(`{"__proto__": ${JSON.stringify({ ...free, key: '__proto__' })}}`)
    const slices = fromDocument({ ...doc, sessions })!
    expect(Object.getPrototypeOf(slices.sessions)).toBe(Object.prototype)
    expect(Object.keys(slices.sessions)).toEqual(['__proto__'])
  })
})
