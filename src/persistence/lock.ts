/** The Web Lock only the writing tab holds. */
export const LOCK_NAME = 'traveller-save'

/** The outcome of asking for the save lock. */
export type SaveLock = {
  /** True when this tab may write. */
  readonly held: boolean
  /** Give the lock up (a tab that ends read-only for its own reasons); does nothing when not held. */
  readonly release: () => void
}

/** Asks for the save lock. */
export type AcquireLock = () => Promise<SaveLock>

const noop = () => {}

/** What a failed lock request counts as: held, as a lone tab would be. */
export const HOLDER_FALLBACK: SaveLock = { held: true, release: noop }

/**
 * Request `traveller-save` without waiting (`ifAvailable`). Granted: the lock is
 * held until `release` (for a writing tab, the page's life) and this tab is the
 * writer. Held by another tab: not held. No Web Locks API (or a request that
 * fails): held, as a lone tab would be.
 */
export function acquireSaveLock(locks: LockManager | undefined = typeof navigator === 'undefined' ? undefined : navigator.locks): Promise<SaveLock> {
  if (!locks) return Promise.resolve(HOLDER_FALLBACK)
  return new Promise<SaveLock>((resolve) => {
    locks
      .request(LOCK_NAME, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve({ held: false, release: noop })
          return undefined
        }
        // The lock lasts until this promise settles.
        return new Promise<void>((done) => resolve({ held: true, release: () => done() }))
      })
      .catch(() => resolve(HOLDER_FALLBACK))
  })
}
