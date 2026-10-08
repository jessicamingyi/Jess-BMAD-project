import { SCHEMA_VERSION } from './document.ts'

/** One forward step: a document at version `i` in, the same data at version `i + 1` out. May throw. */
export type Migration = (doc: Readonly<Record<string, unknown>>) => Record<string, unknown>

/**
 * Forward migrations, indexed by the version they migrate from (`MIGRATIONS[0]`
 * takes a v0 document to v1). Empty while version 1 is the only one shipped;
 * the next schema change appends a step here and bumps `SCHEMA_VERSION`.
 */
export const MIGRATIONS: readonly Migration[] = []

export type MigrateResult =
  /** Already at the code's version: nothing ran. */
  | { readonly kind: 'current'; readonly value: Record<string, unknown> }
  /** Migrated forward one step at a time to the code's version. */
  | { readonly kind: 'migrated'; readonly value: Record<string, unknown> }
  /** Saved by a newer version of the game: this code must not read or write it. */
  | { readonly kind: 'newer' }
  /** Not a versioned document, no path forward, or a step threw. */
  | { readonly kind: 'unreadable' }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

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
