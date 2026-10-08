import { describe, expect, it, vi } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createInitialState } from '../../src/game/session.ts'
import { SCHEMA_VERSION, toDocument } from '../../src/persistence/document.ts'
import { migrate, MIGRATIONS, type Migration } from '../../src/persistence/migrations.ts'
import { loadSaved, type SaveStore } from '../../src/persistence/store.ts'

/** A v1 document with two Postcards and two Sessions. */
const v1 = toDocument({
  ...createInitialState(samplePuzzle),
  album: [
    { cityId: 'europe-near-1', collectedOn: '2026-10-01', revealed: true },
    { cityId: 'europe-near-2', collectedOn: '2026-10-02', revealed: true },
  ],
  meta: { lastPlayedKey: 'free' },
})
const withCity = { ...v1, sessions: { ...v1.sessions, [cityKey('europe-near-3')]: { ...v1.sessions.free, key: cityKey('europe-near-3') } } }

/** The same data as a pretend v0: `album` was called `postcards`, `meta` didn't exist. */
const { album, meta: _meta, ...rest } = withCity
const v0 = { ...rest, schemaVersion: 0, postcards: album }
/** The fake v0 → v1 step. */
const v0to1: Migration = ({ postcards, ...doc }) => ({ ...doc, album: postcards, meta: { lastPlayedKey: 'free' } })

const storeOf = (value: unknown): SaveStore => ({ load: async () => value, save: vi.fn(async () => {}), saveBackup: vi.fn(async () => {}) })

describe('migrate', () => {
  it('ships no migrations while version 1 is the only one', () => {
    expect(SCHEMA_VERSION).toBe(1)
    expect(MIGRATIONS).toEqual([])
  })

  it('leaves a current document alone', () => {
    expect(migrate(v1, [v0to1])).toEqual({ kind: 'current', value: v1 })
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
    expect(migrate({ ...v1, schemaVersion: 2 }, [v0to1])).toEqual({ kind: 'newer' })
  })

  it.each([
    ['not an object', 'x'],
    ['no version', { album: [] }],
    ['a fractional version', { schemaVersion: 0.5 }],
    ['a negative version', { schemaVersion: -1 }],
    ['a string version', { schemaVersion: '1' }],
  ])('is unreadable for %s', (_name, value) => {
    expect(migrate(value, [v0to1])).toEqual({ kind: 'unreadable' })
  })

  it('is unreadable with no step for an old version, or when a step throws', () => {
    expect(migrate(v0, [])).toEqual({ kind: 'unreadable' })
    const throwing: Migration = () => {
      throw new Error('boom')
    }
    expect(migrate(v0, [throwing])).toEqual({ kind: 'unreadable' })
  })
})

describe('loadSaved with migrations', () => {
  it('a v0 document loads as v1 with every Postcard and Session carried, and the v1 document to write back', async () => {
    const result = await loadSaved(storeOf(v0), [v0to1])
    expect(result.kind).toBe('migrated')
    if (result.kind !== 'migrated') return
    expect(result.slices.album).toEqual(v1.album)
    expect(Object.keys(result.slices.sessions).sort()).toEqual(['city:europe-near-3', 'free'])
    expect(result.slices.sessions.free).toEqual(v1.sessions.free)
    expect(result.doc).toEqual(withCity)
  })

  it('writes back the current version document,without stray fields from the migration', async () => {
    const result = await loadSaved(storeOf(v0), [(doc) => ({ ...v0to1(doc), leftover: 1 })])
    expect(result.kind).toBe('migrated')
    if (result.kind === 'migrated') expect(result.doc).toEqual(withCity)
  })

  it('a throwing migration is unreadable, carrying the raw value', async () => {
    const result = await loadSaved(storeOf(v0), [
      () => {
        throw new Error('boom')
      },
    ])
    expect(result).toEqual({ kind: 'unreadable', raw: v0 })
  })

  it('a migration whose output fails validation is unreadable', async () => {
    const result = await loadSaved(storeOf(v0), [(doc) => ({ ...doc, album: 'nope' })])
    expect(result).toEqual({ kind: 'unreadable', raw: v0 })
  })
})
