/** The part of `navigator.storage` the game uses; either method may be missing. */
export type PersistApi = Partial<Pick<StorageManager, 'persist' | 'persisted'>>

const defaultStorage = (): PersistApi | undefined => (typeof navigator === 'undefined' ? undefined : navigator.storage)

/**
 * Ask the browser to keep this origin's data (`navigator.storage.persist()`).
 * True only when granted; a missing API, a refusal or a rejection is false. Never throws.
 */
export async function requestPersist(storage: PersistApi | undefined = defaultStorage()): Promise<boolean> {
  try {
    if (typeof storage?.persist !== 'function') return false
    return (await storage.persist()) === true
  } catch {
    return false
  }
}

/**
 * Whether the browser already keeps this origin's data (`navigator.storage.persisted()`).
 * A missing API or a rejection is false. Never throws.
 */
export async function isPersisted(storage: PersistApi | undefined = defaultStorage()): Promise<boolean> {
  try {
    if (typeof storage?.persisted !== 'function') return false
    return (await storage.persisted()) === true
  } catch {
    return false
  }
}
