import { describe, expect, it } from 'vitest'
import { acquireSaveLock, LOCK_NAME } from '../../src/persistence/lock.ts'

/** A LockManager for one origin: `ifAvailable` gets null when the name is held. Locks are held until their callback's promise settles. */
function fakeLocks() {
  const held = new Set<string>()
  const requests: { name: string; options: LockOptions }[] = []
  const locks = {
    request: async (name: string, options: LockOptions, cb: (lock: Lock | null) => unknown) => {
      requests.push({ name, options })
      if (held.has(name)) return cb(null)
      held.add(name)
      try {
        return await cb({ name, mode: 'exclusive' } as Lock)
      } finally {
        held.delete(name)
      }
    },
    query: async () => ({}),
  } as unknown as LockManager
  return { locks, held, requests }
}

describe('acquireSaveLock', () => {
  it('the first tab holds traveller-save for the page life, without waiting; a second tab does not get it', async () => {
    const f = fakeLocks()
    expect((await acquireSaveLock(f.locks)).held).toBe(true)
    expect(f.requests).toEqual([{ name: LOCK_NAME, options: { ifAvailable: true } }])
    await new Promise((r) => setTimeout(r, 5))
    expect(f.held.has(LOCK_NAME)).toBe(true)
    expect((await acquireSaveLock(f.locks)).held).toBe(false)
    expect(f.held.has(LOCK_NAME)).toBe(true)
  })

  it('release gives the lock up, so another tab can get it', async () => {
    const f = fakeLocks()
    const first = await acquireSaveLock(f.locks)
    const second = await acquireSaveLock(f.locks)
    second.release()
    await new Promise((r) => setTimeout(r, 0))
    expect(f.held.has(LOCK_NAME)).toBe(true)
    first.release()
    await new Promise((r) => setTimeout(r, 0))
    expect(f.held.has(LOCK_NAME)).toBe(false)
    expect((await acquireSaveLock(f.locks)).held).toBe(true)
  })

  it('without the Web Locks API the tab is the holder', async () => {
    expect((await acquireSaveLock(undefined)).held).toBe(true)
  })

  it('a request that fails counts as the holder (no coordination possible)', async () => {
    const locks = { request: () => Promise.reject(new Error('SecurityError')) } as unknown as LockManager
    expect((await acquireSaveLock(locks)).held).toBe(true)
  })
})
