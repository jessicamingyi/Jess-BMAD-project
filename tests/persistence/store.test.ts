import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState } from '../../src/game/session.ts'
import { toDocument, type SaveDocument } from '../../src/persistence/document.ts'
import { createSaver, loadSaved, SAVE_KEY, type SaveStore } from '../../src/persistence/store.ts'

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
  const store: SaveStore = { load: () => get(SAVE_KEY), save: (doc) => set(SAVE_KEY, doc) }
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

  it('is unreadable for a newer or invalid document, and leaves it untouched', async () => {
    const b = fakeBackend()
    const newer = { ...doc('free'), schemaVersion: 2 }
    b.data.set(SAVE_KEY, newer)
    expect(await loadSaved(b.store)).toEqual({ kind: 'unreadable' })
    expect(b.data.get(SAVE_KEY)).toBe(newer)
    b.data.set(SAVE_KEY, 'not a document')
    expect(await loadSaved(b.store)).toEqual({ kind: 'unreadable' })
    expect(b.log).toEqual([])
  })

  it('is unreadable, without throwing, when get rejects', async () => {
    const b = fakeBackend()
    b.failGet()
    await expect(loadSaved(b.store)).resolves.toEqual({ kind: 'unreadable' })
  })
})
