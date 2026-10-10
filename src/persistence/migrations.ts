import { isObject, SCHEMA_VERSION } from './document.ts'

/** One forward step: a document at version `i` in, the same data at version `i + 1` out. May throw. */
export type Migration = (doc: Readonly<Record<string, unknown>>) => Record<string, unknown>

/** No version-0 document ever shipped: one claiming to be v0 cannot be read. */
const fromV0: Migration = () => {
  throw new Error('no version-0 document ever shipped')
}

/**
 * v1 → v2 (Story 4.4): `meta` gains `seenStorageNotice: false` (the storage notice
 * shows once more) and `persistGranted: null` (never asked). Nothing else changes.
 */
const fromV1: Migration = (doc) => {
  if (!isObject(doc.meta)) throw new Error('v1 document without meta')
  return { ...doc, meta: { ...doc.meta, seenStorageNotice: false, persistGranted: null } }
}

/**
 * Forward migrations, indexed by the version they migrate from (`MIGRATIONS[1]`
 * takes a v1 document to v2). The next schema change appends a step here and
 * bumps `SCHEMA_VERSION`.
 */
export const MIGRATIONS: readonly Migration[] = [fromV0, fromV1]

export type MigrateResult =
  /** Already at the code's version: nothing ran. */
  | { readonly kind: 'current'; readonly value: Record<string, unknown> }
  /** Migrated forward one step at a time to the code's version. */
  | { readonly kind: 'migrated'; readonly value: Record<string, unknown> }
  /** Saved by a newer version of the game: this code must not read or write it. */
  | { readonly kind: 'newer' }
  /** Not a versioned document, no path forward, or a step threw. */
  | { readonly kind: 'unreadable' }

/**
 * Run `value` forward to `target`, one version at a time. Each step's output is
 * stamped with its new `schemaVersion`. Never throws: a throwing step is `unreadable`.
 * Pure apart from what the steps do.
 */
export function migrate(value: unknown, migrations: readonly Migration[] = MIGRATIONS, target: number = SCHEMA_VERSION): MigrateResult {
  if (!isObject(value)) return { kind: 'unreadable' }
  const from = value.schemaVersion
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 0) return { kind: 'unreadable' }
  if (from > target) return { kind: 'newer' }
  if (from === target) return { kind: 'current', value }
  let doc: Record<string, unknown> = value
  try {
    for (let v = from; v < target; v++) {
      const step = migrations[v]
      if (!step) return { kind: 'unreadable' }
      const out = step(doc)
      if (!isObject(out)) return { kind: 'unreadable' }
      doc = { ...out, schemaVersion: v + 1 }
    }
  } catch {
    return { kind: 'unreadable' }
  }
  return { kind: 'migrated', value: doc }
}
