import { get, set, update } from 'idb-keyval'
import { createInitialState } from '../game/session.ts'
import type { ReadOnlyReason } from '../game/types.ts'
import { fromDocument, SCHEMA_VERSION, toDocument, type SaveDocument, type Slices } from './document.ts'
import { migrate, MIGRATIONS, type Migration } from './migrations.ts'

/** The one IndexedDB key the whole document is saved under. */
export const SAVE_KEY = 'traveller-save'

/** The key a copy of unreadable stored data is kept under: never reused, never overwritten. */
export const backupKey = (now: Date): string => `${SAVE_KEY}-backup-${now.toISOString()}`

/** Where the document lives. The app uses `idbStore`; tests inject a fake. */
export interface SaveStore {
  /** The stored value as found (undefined when nothing is stored). May reject. */
  load(): Promise<unknown>
  /** Replace the stored value with `doc`. May reject. */
  save(doc: SaveDocument): Promise<void>
  /** Store `raw` under the new key `key`. Rejects, writing nothing, if `key` already holds a value. */
  saveBackup(key: string, raw: unknown): Promise<void>
}

/** IndexedDB via idb-keyval's default database; the only storage the app touches. */
export const idbStore: SaveStore = {
  load: () => get(SAVE_KEY),
  save: (doc) => set(SAVE_KEY, doc),
  // One readwrite transaction: the existence check and the write can't interleave with another tab.
  saveBackup: (key, raw) =>
    update(key, (old) => {
      if (old !== undefined) throw new Error(`${key} already exists`)
      return raw
    }),
}

export type LoadResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'loaded'; readonly slices: Slices }
  /** An older document, migrated forward; `doc` is what the lock holder writes back once. */
  | { readonly kind: 'migrated'; readonly slices: Slices; readonly doc: SaveDocument }
  /**
   * Saved by a newer version: never written. `slices` when it still reads as this
   * version's document (best effort), so the Puzzle shows, read-only.
   */
  | { readonly kind: 'newer'; readonly slices?: Slices }
  /** Stored data that could not be read (bad shape, failed validation, a throwing migration); `raw` as found. */
  | { readonly kind: 'unreadable'; readonly raw: unknown }
  /** Storage could not be reached (the read rejected, or never settled). */
  | { readonly kind: 'failed' }

/** Read the saved document and migrate it forward. Never throws and never writes. */
export async function loadSaved(store: SaveStore, migrations: readonly Migration[] = MIGRATIONS): Promise<LoadResult> {
  let value: unknown
  try {
    value = await store.load()
  } catch {
    return { kind: 'failed' }
  }
  if (value === undefined) return { kind: 'empty' }
  const migrated = migrate(value, migrations)
  if (migrated.kind === 'newer') {
    // Best effort, in memory only: the stored value itself is never touched.
    const slices = fromDocument({ ...(value as Record<string, unknown>), schemaVersion: SCHEMA_VERSION })
    return slices ? { kind: 'newer', slices } : { kind: 'newer' }
  }
  if (migrated.kind === 'unreadable') return { kind: 'unreadable', raw: value }
  const slices = fromDocument(migrated.value)
  if (!slices) return { kind: 'unreadable', raw: value }
  if (migrated.kind === 'current') return { kind: 'loaded', slices }
  // Written back as this version's own document (no stray fields from the migration).
  return { kind: 'migrated', slices, doc: toDocument(slices) }
}

/** How the page starts after a load: the slices to restore and the protective `ui` flags. */
export type Start = {
  readonly slices?: Slices
  /** Set: this tab never writes (and the reducer refuses saved-slice changes). */
  readonly readOnly: ReadOnlyReason | null
  /** Storage could not be reached: the tab plays in memory, never writes, and shows the saving-off banner. */
  readonly savingOff: boolean
  /** Unreadable data was backed up; the Album shows the unreadable notice. */
  readonly unreadableNotice: boolean
  /** The migrated document's write-back failed. */
  readonly saveFailed: boolean
}

/**
 * Settle a load: decide whether this tab may write, and do the start-up writes
 * a holder owes. Only the lock holder (`holder`) ever writes. A newer document
 * is never written. Unreadable data is first copied to a fresh backup key, then
 * the main key gets the default document; if the copy fails, nothing else is
 * written and saving is off. A failed load also turns saving off. A migrated
 * document is written back once. Once `aborted()` is true (start-up gave up), the
 * main key is never written: no migrated write-back, no defaults after a backup (a
 * backup already started may finish; it only copies the data aside), and saving is off. A main-key write
 * already in flight when start-up gives up cannot be cancelled and may still land.
 * Never throws.
 */
export async function settleLoad(
  store: SaveStore,
  result: LoadResult,
  holder: boolean,
  now: Date,
  aborted: () => boolean = () => false,
): Promise<Start> {
  const base = { readOnly: holder ? null : ('otherTab' as const), savingOff: false, unreadableNotice: false, saveFailed: false }
  switch (result.kind) {
    case 'empty':
      return base
    case 'loaded':
      return { ...base, slices: result.slices }
    case 'newer':
      return result.slices ? { ...base, readOnly: 'newerVersion', slices: result.slices } : { ...base, readOnly: 'newerVersion' }
    case 'failed':
      return { ...base, savingOff: true }
    case 'migrated': {
      if (!holder) return { ...base, slices: result.slices }
      // Boot has already given up and ignores this result: the older document stays as stored (migrated again next load).
      if (aborted()) return { ...base, savingOff: true, slices: result.slices }
      try {
        await store.save(result.doc)
        return { ...base, slices: result.slices }
      } catch {
        // Still readable in memory; the next saved-slice change writes the whole document again.
        return { ...base, slices: result.slices, saveFailed: true }
      }
    }
    case 'unreadable': {
      if (!holder) return base
      try {
        await store.saveBackup(backupKey(now), result.raw)
      } catch {
        return { ...base, savingOff: true }
      }
      // Boot gave up while the backup ran and ignores this result: the main key keeps the unreadable data.
      if (aborted()) return { ...base, savingOff: true }
      // Kept safe in the backup: the main key now gets the defaults, so the next load is clean (no second backup).
      try {
        await store.save(toDocument(createInitialState()))
        return { ...base, unreadableNotice: true }
      } catch {
        return { ...base, unreadableNotice: true, saveFailed: true }
      }
    }
  }
}

/** Queue one whole-document write; resolves once it has run (succeeded or failed). */
export type Saver = (doc: SaveDocument) => Promise<void>

/**
 * Writes run one at a time, in the order asked, so the last write carries the
 * latest state. A rejected write never breaks the queue: `onOutcome(false)` is
 * called and the next save writes the whole document again. A write that lands
 * calls `onOutcome(true)`.
 */
export function createSaver(store: SaveStore, onOutcome: (ok: boolean) => void = () => {}): Saver {
  let queue: Promise<void> = Promise.resolve()
  return (doc) => {
    queue = queue
      .then(() =>
        store.save(doc).then(
          () => onOutcome(true),
          () => onOutcome(false),
        ),
      )
      .catch(() => undefined)
    return queue
  }
}
