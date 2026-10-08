import { get, set } from 'idb-keyval'
import { fromDocument, type SaveDocument, type Slices } from './document.ts'

/** The one IndexedDB key the whole document is saved under. */
export const SAVE_KEY = 'traveller-save'

/** Where the document lives. The app uses `idbStore`; tests inject a fake. */
export interface SaveStore {
  /** The stored value as found (undefined when nothing is stored). May reject. */
  load(): Promise<unknown>
  /** Replace the stored value with `doc`. May reject. */
  save(doc: SaveDocument): Promise<void>
}

/** IndexedDB via idb-keyval's default database; the only storage the app touches. */
export const idbStore: SaveStore = {
  load: () => get(SAVE_KEY),
  save: (doc) => set(SAVE_KEY, doc),
}

export type LoadResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'loaded'; readonly slices: Slices }
  /** Stored data that could not be read, or storage that could not be reached: never overwrite it. */
  | { readonly kind: 'unreadable' }

/** Read the saved document. Never throws: a failed read is `unreadable`. */
export async function loadSaved(store: SaveStore): Promise<LoadResult> {
  let value: unknown
  try {
    value = await store.load()
  } catch {
    return { kind: 'unreadable' }
  }
  if (value === undefined) return { kind: 'empty' }
  const slices = fromDocument(value)
  return slices ? { kind: 'loaded', slices } : { kind: 'unreadable' }
}

/** Queue one whole-document write; resolves once it has run (succeeded or been dropped). */
export type Saver = (doc: SaveDocument) => Promise<void>

/**
 * Writes run one at a time, in the order asked, so the last write carries the
 * latest state. A rejected write is dropped silently: the next save writes the
 * whole document again (Story 4.2 surfaces the failure).
 */
export function createSaver(store: SaveStore): Saver {
  let queue: Promise<void> = Promise.resolve()
  return (doc) => {
    queue = queue.then(() => store.save(doc)).catch(() => undefined)
    return queue
  }
}
