import { isDateString } from '../game/journey.ts'
import type { Album, AppState, Difficulty, Meta, Postcard, Session, Settings } from '../game/types.ts'

/** The saved document's version. Older documents are migrated forward (`migrations.ts`). */
export const SCHEMA_VERSION = 2

/** The saved slices of AppState: everything but `ui`, which is never saved. */
export type Slices = Pick<AppState, 'album' | 'sessions' | 'settings' | 'meta'>

/** The one document saved whole under one key. `ui` (Undo, Hint, viewer…) is never in it. */
export type SaveDocument = {
  readonly schemaVersion: typeof SCHEMA_VERSION
  readonly album: Album
  readonly sessions: Readonly<Record<string, Session>>
  readonly settings: Settings
  readonly meta: Meta
}

const copySession = (s: Session): Session => ({
  key: s.key,
  givens: s.givens,
  solution: s.solution,
  digits: s.digits,
  notes: [...s.notes],
  status: s.status,
  difficulty: s.difficulty,
  hintsUsed: s.hintsUsed,
})

/** The document for `state`: plain copies of the saved slices, never `ui`. Pure. */
export function toDocument(state: Slices): SaveDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    album: state.album.map((p) => ({ cityId: p.cityId, collectedOn: p.collectedOn, revealed: p.revealed })),
    sessions: Object.fromEntries(Object.entries(state.sessions).map(([key, s]) => [key, copySession(s)])),
    settings: {
      mistakeHighlighting: state.settings.mistakeHighlighting,
      sameDigitHighlighting: state.settings.sameDigitHighlighting,
      unitHighlighting: state.settings.unitHighlighting,
      lamplight: state.settings.lamplight,
      freePlayDifficulty: state.settings.freePlayDifficulty,
    },
    meta: {
      lastPlayedKey: state.meta.lastPlayedKey,
      seenStorageNotice: state.meta.seenStorageNotice,
      persistGranted: state.meta.persistGranted,
    },
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isGrid = (v: unknown): v is string => typeof v === 'string' && /^[0-9]{81}$/.test(v)
const isDifficulty = (v: unknown): v is Difficulty => v === 'easy' || v === 'medium' || v === 'hard'
const isMask = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0b111111111

function readSession(key: string, v: unknown): Session | null {
  if (!isObject(v)) return null
  const { givens, solution, digits, notes, status, difficulty, hintsUsed } = v
  if (v.key !== key || !isGrid(givens) || !isGrid(solution) || !isGrid(digits)) return null
  if (!Array.isArray(notes) || notes.length !== 81 || !notes.every(isMask)) return null
  if (status !== 'inProgress' && status !== 'solved') return null
  if (!isDifficulty(difficulty) || !Number.isInteger(hintsUsed) || (hintsUsed as number) < 0) return null
  return copySession({ key, givens, solution, digits, notes, status, difficulty, hintsUsed: hintsUsed as number })
}

function readPostcard(v: unknown): Postcard | null {
  if (!isObject(v)) return null
  const { cityId, collectedOn, revealed } = v
  if (typeof cityId !== 'string' || !isDateString(collectedOn) || typeof revealed !== 'boolean') return null
  return { cityId, collectedOn, revealed }
}

function readSettings(v: unknown): Settings | null {
  if (!isObject(v)) return null
  const { mistakeHighlighting, sameDigitHighlighting, unitHighlighting, lamplight, freePlayDifficulty } = v
  if (
    typeof mistakeHighlighting !== 'boolean' ||
    typeof sameDigitHighlighting !== 'boolean' ||
    typeof unitHighlighting !== 'boolean' ||
    typeof lamplight !== 'boolean' ||
    !(freePlayDifficulty === null || isDifficulty(freePlayDifficulty))
  ) {
    return null
  }
  return { mistakeHighlighting, sameDigitHighlighting, unitHighlighting, lamplight, freePlayDifficulty }
}

/**
 * The saved slices in `value`, or null when it is not a valid current-version document
 * (wrong shape, a bad field, or another `schemaVersion`). Never throws. Pure.
 */
export function fromDocument(value: unknown): Slices | null {
  if (!isObject(value) || value.schemaVersion !== SCHEMA_VERSION) return null

  if (!Array.isArray(value.album)) return null
  const album: Postcard[] = []
  for (const item of value.album) {
    const postcard = readPostcard(item)
    if (!postcard) return null
    album.push(postcard)
  }

  if (!isObject(value.sessions)) return null
  const entries: [string, Session][] = []
  for (const [key, item] of Object.entries(value.sessions)) {
    const session = readSession(key, item)
    if (!session) return null
    entries.push([key, session])
  }
  // fromEntries defines own properties, so even a '__proto__' key stays plain data.
  const sessions: Record<string, Session> = Object.fromEntries(entries)

  const settings = readSettings(value.settings)
  if (!settings) return null

  if (!isObject(value.meta)) return null
  const { lastPlayedKey, seenStorageNotice, persistGranted } = value.meta
  if (lastPlayedKey !== null && typeof lastPlayedKey !== 'string') return null
  if (typeof seenStorageNotice !== 'boolean') return null
  if (persistGranted !== null && typeof persistGranted !== 'boolean') return null

  return { album, sessions, settings, meta: { lastPlayedKey, seenStorageNotice, persistGranted } }
}
