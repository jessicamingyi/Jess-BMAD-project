import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { acquireSaveLock, HOLDER_FALLBACK, type AcquireLock } from '../persistence/lock.ts'
import type { Migration } from '../persistence/migrations.ts'
import { loadSaved, settleLoad, type SaveStore, type Start } from '../persistence/store.ts'
import { App } from './app.tsx'
import { createUpdateSignal, registerServiceWorker, type RegisterSW } from './service-worker.ts'

/** A start-up (load, migrate, backup) still pending after this long counts as failed: defaults, read-only. */
export const LOAD_TIMEOUT_MS = 3000

/** A start that gave up: storage could not be reached, so nothing is ever written this page load. */
const UNAVAILABLE: Start = { readOnly: 'storageUnavailable', unreadableNotice: false, saveFailed: false }

/** `work`, raced against a timeout so a hung IndexedDB can't keep the page blank. `onTimeout` runs the moment the timer fires. */
function withTimeout<T>(work: Promise<T>, fallback: T, ms: number, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      onTimeout()
      resolve(fallback)
    }, ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

export type BootOptions = {
  /** Tests only: today's date, 'YYYY-MM-DD'. */
  today?: string
  /** The save lock; tests inject a fake. Defaults to the Web Lock `traveller-save`. */
  acquireLock?: AcquireLock
  /** Tests only: forward migrations instead of the shipped list. */
  migrations?: readonly Migration[]
  /** Tests only: the clock for the backup key. */
  now?: () => Date
  /** Tests only: a fake `registerSW` (the real one needs a built service worker). */
  registerSW?: RegisterSW
  /** Ask the browser to keep the data (true when granted). Defaults to `navigator.storage.persist()` (`persistence/storage-persist`); tests inject a fake. */
  persist?: () => Promise<boolean>
  /** Whether the browser already keeps the data. Defaults to `navigator.storage.persisted()`; tests inject a fake. */
  persisted?: () => Promise<boolean>
  /** Whether the Add to Dock tip applies (desktop macOS Safari 17+). Defaults to `ui/browser.isSafari` over the real browser; tests inject a fake. */
  isSafari?: () => boolean
}

/**
 * Start the app: request the save lock (never waiting), load and migrate the saved
 * document, then settle it (back up unreadable data, write a migrated document back;
 * holder only). Apply Lamplight to `html` before React's first render, mark `html`
 * ready (theme.css hides the page until then), then render. A tab without the lock,
 * after a newer document, or whose storage failed or hung, is read-only and never writes;
 * a lock it got is released. Lock, load and settle together are bounded by the timeout.
 * After a give-up, start-up never starts a main-key write; a backup or a write already
 * in flight may still finish.
 * After rendering, register the service worker; a waiting new version only shows the
 * update banner (nothing reloads). The App then handles persistent storage: a writable
 * tab checks `persisted()` at start, and asks `persist()` after the storage notice's
 * "Got it" and after the first Postcard (unless granted); a Safari refusal shows the
 * Add to Dock tip. `persist`, `persisted` and `isSafari` default to the real browser.
 */
export async function boot(store: SaveStore, rootEl: HTMLElement, html: HTMLElement, options: BootOptions = {}): Promise<Root> {
  const { today, acquireLock = acquireSaveLock, migrations, now = () => new Date(), registerSW, persist, persisted, isSafari } = options
  /** Set the moment the timeout fires: the page renders read-only, so a lock granted later is given back. */
  let gaveUp = false
  const sequence = async (): Promise<Start> => {
    const lock = await acquireLock().catch(() => HOLDER_FALLBACK)
    try {
      const result = await loadSaved(store, migrations)
      if (gaveUp) return UNAVAILABLE
      const start = await settleLoad(store, result, lock.held, now(), () => gaveUp)
      // A tab read-only for its own reasons (newer data, storage trouble) must not keep other tabs from saving.
      // After a give-up, `finally` releases it.
      if (!gaveUp && start.readOnly !== null) lock.release()
      return start
    } finally {
      if (gaveUp) lock.release()
    }
  }
  const start = await withTimeout(sequence(), UNAVAILABLE, LOAD_TIMEOUT_MS, () => {
    gaveUp = true
  })
  const { slices: loaded, ...notices } = start
  if (loaded?.settings.lamplight) html.dataset.theme = 'lamplight'
  html.dataset.ready = ''
  const update = createUpdateSignal()
  const root = createRoot(rootEl)
  root.render(
    <StrictMode>
      <App
        loaded={loaded}
        store={store}
        notices={notices}
        today={today}
        onUpdateReady={update.subscribe}
        persist={persist}
        persisted={persisted}
        isSafari={isSafari}
      />
    </StrictMode>,
  )
  registerServiceWorker(update.notify, registerSW)
  return root
}
