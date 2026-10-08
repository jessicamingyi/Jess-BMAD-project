import { beforeEach, describe, expect, it, vi } from 'vitest'

/** idb-keyval on a Map; `update` mirrors the real one: get, then put what the updater returns, or reject if it throws. */
const data = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (key: string) => data.get(key),
  set: async (key: string, value: unknown) => void data.set(key, value),
  update: async (key: string, updater: (old: unknown) => unknown) => {
    data.set(key, updater(data.get(key)))
  },
}))

const { idbStore, SAVE_KEY } = await import('../../src/persistence/store.ts')

beforeEach(() => data.clear())

describe('idbStore', () => {
  it('backs up raw data under a new key', async () => {
    await idbStore.saveBackup('traveller-save-backup-x', { garbled: true })
    expect(data.get('traveller-save-backup-x')).toEqual({ garbled: true })
  })

  it('never overwrites an existing backup key: rejects and leaves it as it was', async () => {
    data.set('traveller-save-backup-x', 'first')
    await expect(idbStore.saveBackup('traveller-save-backup-x', 'second')).rejects.toThrow()
    expect(data.get('traveller-save-backup-x')).toBe('first')
  })

  it('loads the one main key', async () => {
    data.set(SAVE_KEY, 'v')
    expect(await idbStore.load()).toBe('v')
  })
})
