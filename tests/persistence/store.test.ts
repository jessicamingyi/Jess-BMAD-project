import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState } from '../../src/game/session.ts'
import { toDocument, type SaveDocument } from '../../src/persistence/document.ts'
import { backupKey, createSaver, loadSaved, SAVE_KEY, settleLoad, type SaveStore } from '../../src/persistence/store.ts'

/** An idb-keyval-shaped backend (async get/set on a Map) with controllable failures and a hold. */
function fakeBackend() {
  const data = new Map<string, unknown>()
  const log: string[] = []
  let failWrites = 0
  let failGet = false
  let holding = false
  const held: (() => void)[] = []
  const get = async (key: string) => {
    if (failGet) throw new Error('IndexedDB unavailable')
    return data.get(key)
  }
  const set = (key: string, value: SaveDocument) =>
    new Promise<void>((resolve, reject) => {
      const run = () => {
        const name = value.meta.lastPlayedKey
        log.push(`start ${name}`)
        if (failWrites > 0) {
          failWrites--
          log.push(`fail ${name}`)
          reject(new Error('QuotaExceededError'))
          return
        }
        // Finishes on a later task, so an unserialised queue would interleave writes.
        setTimeout(() => {
          data.set(key, structuredClone(value))
          log.push(`done ${name}`)
          resolve()
        }, 1)
      }
      if (holding) held.push(run)
      else run()
    })
  const saveBackup = async (key: string, raw: unknown) => {
    log.push(`backup ${key}`)
    if (failWrites > 0) {
      failWrites--
      throw new Error('QuotaExceededError')
    }
    if (data.has(key)) throw new Error(`${key} exists`)
    data.set(key, raw)
  }
  const store: SaveStore = { load: () => get(SAVE_KEY), save: (doc) => set(SAVE_KEY, doc), saveBackup }
  return {
    store,
    data,
    log,
    failWrites: (n: number) => (failWrites = n),
    failGet: () => (failGet = true),
    hold: () => (holding = true),
    /** Writes handed to the backend and held. */
    heldCount: () => held.length,
    release: () => {
      holding = false
      while (held.length) held.shift()!()
    },
  }
}

const doc = (lastPlayedKey: string) => toDocument({ ...createInitialState(samplePuzzle), meta: { lastPlayedKey } })

describe('createSaver', () => {
  it('runs writes one at a time, in order, and the last write wins', async () => {
    const b = fakeBackend()
    const save = createSaver(b.store)
    void save(doc('a'))
    void save(doc('b'))
    await save(doc('c'))
    expect(b.log).toEqual(['start a', 'done a', 'start b', 'done b', 'start c', 'done c'])
    expect(b.data.get(SAVE_KEY)).toEqual(doc('c'))
  })

  it('does not start a write until the one before it has finished', async () => {
    const b = fakeBackend()
    b.hold()
    const save = createSaver(b.store)
    void save(doc('a'))
    const last = save(doc('b'))
    await new Promise((r) => setTimeout(r, 5))
    // Only the first write has been handed to the backend; the second waits behind it.
    expect(b.heldCount()).toBe(1)
    b.release()
    await last
    expect(b.log).toEqual(['start a', 'done a', 'start b', 'done b'])
  })

  it('drops a rejected write silently; the next save writes the whole document again', async () => {
    const b = fakeBackend()
    const save = createSaver(b.store)
    b.failWrites(1)
    await expect(save(doc('a'))).resolves.toBeUndefined()
    expect(b.data.has(SAVE_KEY)).toBe(false)
    await save(doc('b'))
    expect(b.log).toEqual(['start a', 'fail a', 'start b', 'done b'])
    expect(b.data.get(SAVE_KEY)).toEqual(doc('b'))
  })

  it('a failure in the middle of a queue does not stop the writes after it', async () => {
    const b = fakeBackend()
    const save = createSaver(b.store)
    await save(doc('a'))
    b.failWrites(1)
    void save(doc('b'))
    await save(doc('c'))
    expect(b.log).toEqual(['start a', 'done a', 'start b', 'fail b', 'start c', 'done c'])
    expect(b.data.get(SAVE_KEY)).toEqual(doc('c'))
  })
})

describe('loadSaved', () => {
  it('is empty when nothing is stored', async () => {
    expect(await loadSaved(fakeBackend().store)).toEqual({ kind: 'empty' })
  })

  it('loads a valid document', async () => {
    const b = fakeBackend()
    b.data.set(SAVE_KEY, doc('free'))
    const result = await loadSaved(b.store)
    expect(result.kind).toBe('loaded')
    if (result.kind === 'loaded') expect(result.slices.meta.lastPlayedKey).toBe('free')
  })

  it('is newer for a newer document, and unreadable (with the raw value) for an invalid one; nothing is written', async () => {
    const b = fakeBackend()
    const newer = { ...doc('free'), schemaVersion: 2 }
    b.data.set(SAVE_KEY, newer)
    // Best effort: a newer document that still reads as v1 shows its slices (read-only); the stored value is untouched.
    const bytes = JSON.stringify(newer)
    const result = await loadSaved(b.store)
    expect(result.kind).toBe('newer')
    if (result.kind === 'newer') expect(result.slices?.meta.lastPlayedKey).toBe('free')
    expect(b.data.get(SAVE_KEY)).toBe(newer)
    expect(JSON.stringify(b.data.get(SAVE_KEY))).toBe(bytes)
    b.data.set(SAVE_KEY, { ...newer, album: 'renamed' })
    expect(await loadSaved(b.store)).toEqual({ kind: 'newer' })
    b.data.set(SAVE_KEY, 'not a document')
    expect(await loadSaved(b.store)).toEqual({ kind: 'unreadable', raw: 'not a document' })
    expect(b.log).toEqual([])
  })

  it('is failed, without throwing, when get rejects', async () => {
    const b = fakeBackend()
    b.failGet()
    await expect(loadSaved(b.store)).resolves.toEqual({ kind: 'failed' })
  })
})

describe('createSaver outcomes', () => {
  it('reports each write: false when rejected, true when it lands; the queue goes on', async () => {
    const b = fakeBackend()
    const outcomes: boolean[] = []
    const save = createSaver(b.store, (ok) => outcomes.push(ok))
    b.failWrites(2)
    void save(doc('a'))
    void save(doc('b'))
    await save(doc('c'))
    expect(outcomes).toEqual([false, false, true])
    expect(b.data.get(SAVE_KEY)).toEqual(doc('c'))
  })

  it('a throwing outcome callback does not break the queue', async () => {
    const b = fakeBackend()
    const save = createSaver(b.store, () => {
      throw new Error('listener')
    })
    await expect(save(doc('a'))).resolves.toBeUndefined()
    await save(doc('b'))
    expect(b.data.get(SAVE_KEY)).toEqual(doc('b'))
  })
})

describe('settleLoad', () => {
  const NOW = new Date('2026-10-08T09:30:00.000Z')
  const KEY = 'traveller-save-backup-2026-10-08T09:30:00.000Z'
  const ok = { readOnly: null, unreadableNotice: false, saveFailed: false }
  const slices = () => {
    const { album, sessions, settings, meta } = createInitialState(samplePuzzle)
    return { album, sessions, settings, meta }
  }

  it('names backups by ISO timestamp', () => {
    expect(backupKey(NOW)).toBe(KEY)
  })

  it('empty and loaded: the holder may write, any other tab is read-only (otherTab); nothing is written', async () => {
    const b = fakeBackend()
    const s = slices()
    expect(await settleLoad(b.store, { kind: 'empty' }, true, NOW)).toEqual(ok)
    expect(await settleLoad(b.store, { kind: 'empty' }, false, NOW)).toEqual({ ...ok, readOnly: 'otherTab' })
    expect(await settleLoad(b.store, { kind: 'loaded', slices: s }, true, NOW)).toEqual({ ...ok, slices: s })
    expect(await settleLoad(b.store, { kind: 'loaded', slices: s }, false, NOW)).toEqual({ ...ok, readOnly: 'otherTab', slices: s })
    expect(b.log).toEqual([])
  })

  it('newer: read-only (newerVersion) in every tab, nothing written', async () => {
    const b = fakeBackend()
    expect(await settleLoad(b.store, { kind: 'newer' }, true, NOW)).toEqual({ ...ok, readOnly: 'newerVersion' })
    expect(await settleLoad(b.store, { kind: 'newer' }, false, NOW)).toEqual({ ...ok, readOnly: 'newerVersion' })
    const s = slices()
    expect(await settleLoad(b.store, { kind: 'newer', slices: s }, true, NOW)).toEqual({ ...ok, readOnly: 'newerVersion', slices: s })
    expect(b.log).toEqual([])
  })

  it('failed: read-only (storageUnavailable), nothing written', async () => {
    const b = fakeBackend()
    expect(await settleLoad(b.store, { kind: 'failed' }, true, NOW)).toEqual({ ...ok, readOnly: 'storageUnavailable' })
    expect(b.log).toEqual([])
  })

  it('migrated: the holder writes the migrated document back once; another tab never does', async () => {
    const b = fakeBackend()
    const s = slices()
    const migrated = { kind: 'migrated', slices: s, doc: doc('m') } as const
    expect(await settleLoad(b.store, migrated, false, NOW)).toEqual({ ...ok, readOnly: 'otherTab', slices: s })
    expect(b.log).toEqual([])
    expect(await settleLoad(b.store, migrated, true, NOW)).toEqual({ ...ok, slices: s })
    expect(b.log).toEqual(['start m', 'done m'])
    expect(b.data.get(SAVE_KEY)).toEqual(doc('m'))
  })

  it('migrated, write-back rejected: the slices still load, saveFailed set, no throw', async () => {
    const b = fakeBackend()
    const s = slices()
    b.failWrites(1)
    expect(await settleLoad(b.store, { kind: 'migrated', slices: s, doc: doc('m') }, true, NOW)).toEqual({ ...ok, slices: s, saveFailed: true })
  })

  it('unreadable: the raw value is copied to a new backup key first, then the main key gets the defaults; notice on', async () => {
    const b = fakeBackend()
    b.data.set(SAVE_KEY, 'garbled')
    expect(await settleLoad(b.store, { kind: 'unreadable', raw: 'garbled' }, true, NOW)).toEqual({ ...ok, unreadableNotice: true })
    expect(b.log).toEqual([`backup ${KEY}`, 'start null', 'done null'])
    expect(b.data.get(KEY)).toBe('garbled')
    expect(b.data.get(SAVE_KEY)).toEqual(toDocument(createInitialState()))
    // The next load is clean: no second backup.
    expect(await loadSaved(b.store)).toMatchObject({ kind: 'loaded' })
  })

  it('unreadable: an existing backup key is never overwritten (the tab goes read-only instead)', async () => {
    const b = fakeBackend()
    b.data.set(KEY, 'older backup')
    expect(await settleLoad(b.store, { kind: 'unreadable', raw: 'garbled' }, true, NOW)).toEqual({ ...ok, readOnly: 'storageUnavailable' })
    expect(b.data.get(KEY)).toBe('older backup')
  })

  it('unreadable, backup rejected: read-only (storageUnavailable), no throw, nothing written', async () => {
    const b = fakeBackend()
    b.failWrites(1)
    await expect(settleLoad(b.store, { kind: 'unreadable', raw: 'garbled' }, true, NOW)).resolves.toEqual({
      ...ok,
      readOnly: 'storageUnavailable',
    })
    expect(b.log).toEqual([`backup ${KEY}`])
    expect(b.data.size).toBe(0)
  })

  it('unreadable in a tab without the lock: no backup, read-only (otherTab)', async () => {
    const b = fakeBackend()
    expect(await settleLoad(b.store, { kind: 'unreadable', raw: 'garbled' }, false, NOW)).toEqual({ ...ok, readOnly: 'otherTab' })
    expect(b.log).toEqual([])
  })
})
