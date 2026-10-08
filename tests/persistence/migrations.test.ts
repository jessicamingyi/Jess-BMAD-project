import { describe, expect, it, vi } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createInitialState } from '../../src/game/session.ts'
import { fromDocument, SCHEMA_VERSION, toDocument } from '../../src/persistence/document.ts'
import { migrate, MIGRATIONS, type Migration } from '../../src/persistence/migrations.ts'
import { loadSaved, type SaveStore } from '../../src/persistence/store.ts'

/** A v2 document with two Postcards, two Sessions and non-default Settings. */
const base = createInitialState(samplePuzzle)
const v2 = toDocument({
  ...base,
  album: [
    { cityId: 'europe-near-1', collectedOn: '2026-10-01', revealed: true },
    { cityId: 'europe-near-2', collectedOn: '2026-10-02', revealed: false },
  ],
  sessions: { ...base.sessions, [cityKey('europe-near-3')]: { ...base.sessions.free, key: cityKey('europe-near-3'), hintsUsed: 2 } },
  settings: { ...base.settings, lamplight: true, mistakeHighlighting: true, freePlayDifficulty: 'hard' },
  meta: { lastPlayedKey: 'free', seenStorageNotice: false, persistGranted: null },
})

/** The same data exactly as Story 4.3's build saved it: version 1, `meta` with only `lastPlayedKey`. */
const v1 = JSON.parse(JSON.stringify({ ...v2, schemaVersion: 1, meta: { lastPlayedKey: 'free' } })) as Record<string, unknown>

const storeOf = (value: unknown): SaveStore => ({ load: async () => value, save: vi.fn(async () => {}), saveBackup: vi.fn(async () => {}) })

describe('the shipped migrations', () => {
  it('version 2 is current; v0 never shipped and v1 → v2 is the first real step', () => {
    expect(SCHEMA_VERSION).toBe(2)
    expect(MIGRATIONS).toHaveLength(2)
    expect(() => MIGRATIONS[0]({ schemaVersion: 0 })).toThrow()
  })

  it('v1 → v2 adds seenStorageNotice false and persistGranted null to meta and changes nothing else', () => {
    const out = MIGRATIONS[1](v1)
    expect(out).toEqual({ ...v1, meta: { lastPlayedKey: 'free', seenStorageNotice: false, persistGranted: null } })
    // The input is left alone.
    expect(v1.meta).toEqual({ lastPlayedKey: 'free' })
  })

  it('a v1 document without meta cannot be migrated (unreadable)', () => {
    const { meta: _meta, ...noMeta } = v1
    expect(migrate(noMeta)).toEqual({ kind: 'unreadable' })
  })

  it('a v0 document is unreadable', () => {
    expect(migrate({ ...v1, schemaVersion: 0 })).toEqual({ kind: 'unreadable' })
  })

  it('a stored v1 document loads as v2: every Postcard, Session and Setting carried, the v2 document to write back', async () => {
    const result = await loadSaved(storeOf(v1))
    expect(result.kind).toBe('migrated')
    if (result.kind !== 'migrated') return
    expect(result.slices.album).toEqual(v2.album)
    expect(result.slices.sessions).toEqual(v2.sessions)
    expect(Object.keys(result.slices.sessions).sort()).toEqual(['city:europe-near-3', 'free'])
    expect(result.slices.settings).toEqual(v2.settings)
    expect(result.slices.meta).toEqual({ lastPlayedKey: 'free', seenStorageNotice: false, persistGranted: null })
    expect(result.doc).toEqual(v2)
    expect(result.doc.schemaVersion).toBe(2)
    expect(fromDocument(result.doc)).toEqual(result.slices)
  })

  it('a current v2 document is loaded as is', async () => {
    expect(await loadSaved(storeOf(v2))).toEqual({ kind: 'loaded', slices: fromDocument(v2) })
  })
})

describe('migrate', () => {
  it('leaves a current document alone', () => {
    expect(migrate(v2)).toEqual({ kind: 'current', value: v2 })
  })

  it('runs forward one version at a time, stamping each step', () => {
    const seen: unknown[] = []
    const step = (n: number): Migration => (doc) => {
      seen.push(doc.schemaVersion)
      return { ...doc, [`step${n}`]: true }
    }
    const result = migrate({ schemaVersion: 0 }, [step(0), step(1), step(2)], 3)
    expect(seen).toEqual([0, 1, 2])
    expect(result).toEqual({ kind: 'migrated', value: { schemaVersion: 3, step0: true, step1: true, step2: true } })
    // Starting part-way runs only the later steps.
    expect(migrate({ schemaVersion: 2 }, [step(0), step(1), step(2)], 3)).toEqual({ kind: 'migrated', value: { schemaVersion: 3, step2: true } })
  })

  it('is newer for a version above the code', () => {
    expect(migrate({ ...v2, schemaVersion: 3 })).toEqual({ kind: 'newer' })
  })

  it.each([
    ['not an object', 'x'],
    ['no version', { album: [] }],
    ['a fractional version', { schemaVersion: 0.5 }],
    ['a negative version', { schemaVersion: -1 }],
    ['a string version', { schemaVersion: '1' }],
  ])('is unreadable for %s', (_name, value) => {
    expect(migrate(value)).toEqual({ kind: 'unreadable' })
  })

  it('is unreadable with no step for an old version, or when a step throws', () => {
    expect(migrate(v1, [])).toEqual({ kind: 'unreadable' })
    const throwing: Migration = () => {
      throw new Error('boom')
    }
    expect(migrate(v1, [MIGRATIONS[0], throwing])).toEqual({ kind: 'unreadable' })
  })
})

describe('loadSaved with migrations', () => {
  it('writes back the current version document, without stray fields from the migration', async () => {
    const result = await loadSaved(storeOf(v1), [MIGRATIONS[0], (doc) => ({ ...MIGRATIONS[1](doc), leftover: 1 })])
    expect(result.kind).toBe('migrated')
    if (result.kind === 'migrated') expect(result.doc).toEqual(v2)
  })

  it('a throwing migration is unreadable, carrying the raw value', async () => {
    const result = await loadSaved(storeOf(v1), [
      MIGRATIONS[0],
      () => {
        throw new Error('boom')
      },
    ])
    expect(result).toEqual({ kind: 'unreadable', raw: v1 })
  })

  it('a migration whose output fails validation is unreadable', async () => {
    const result = await loadSaved(storeOf(v1), [MIGRATIONS[0], (doc) => ({ ...doc, album: 'nope' })])
    expect(result).toEqual({ kind: 'unreadable', raw: v1 })
  })
})
