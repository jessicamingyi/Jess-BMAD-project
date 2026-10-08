import { describe, expect, it, vi } from 'vitest'
import { isPersisted, requestPersist } from '../../src/persistence/storage-persist.ts'

describe('requestPersist', () => {
  it('is true only when the browser grants it', async () => {
    expect(await requestPersist({ persist: async () => true })).toBe(true)
    expect(await requestPersist({ persist: async () => false })).toBe(false)
  })

  it('a missing storage manager or persist() counts as refused', async () => {
    expect(await requestPersist(undefined)).toBe(false)
    expect(await requestPersist({})).toBe(false)
  })

  it('a rejection or a throw counts as refused, without error', async () => {
    expect(await requestPersist({ persist: () => Promise.reject(new Error('NotAllowedError')) })).toBe(false)
    const throwing = vi.fn((): Promise<boolean> => {
      throw new Error('boom')
    })
    expect(await requestPersist({ persist: throwing })).toBe(false)
    expect(throwing).toHaveBeenCalledTimes(1)
  })

  it('without navigator.storage (old browsers) the default is refused', async () => {
    const storage = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
    try {
      expect(await requestPersist()).toBe(false)
    } finally {
      if (storage) Object.defineProperty(globalThis, 'navigator', storage)
    }
  })
})

describe('isPersisted', () => {
  it('reports persisted()', async () => {
    expect(await isPersisted({ persisted: async () => true })).toBe(true)
    expect(await isPersisted({ persisted: async () => false })).toBe(false)
  })

  it('missing or rejecting counts as not persisted, without error', async () => {
    expect(await isPersisted(undefined)).toBe(false)
    expect(await isPersisted({})).toBe(false)
    expect(await isPersisted({ persisted: () => Promise.reject(new Error('SecurityError')) })).toBe(false)
  })
})
