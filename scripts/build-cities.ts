/**
 * Generates the City Puzzles: `npm run build:cities [cities.json] [city-puzzles.json] [snapshot.json]`.
 *
 * Append-only. Only Cities without an entry get one; existing entries are never
 * rewritten. New entries are appended to both `src/content/city-puzzles.json` and the
 * committed snapshot `tests/content/city-puzzles.snapshot.json`. When nothing is
 * missing, nothing is written. Deterministic: the same City id always yields the
 * same Puzzle (seed = FNV-1a of the id, Difficulty from the City's Tier).
 */
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { City } from '../src/content/cities.ts'
import type { CityPuzzle } from '../src/content/city-puzzles.ts'
import { generate } from '../src/engine/index.ts'
import { TIER_DIFFICULTY } from '../src/game/journey.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

export type Paths = { readonly cities: string; readonly puzzles: string; readonly snapshot: string }

export const DEFAULT_PATHS: Paths = {
  cities: resolve(ROOT, 'src/content/cities.json'),
  puzzles: resolve(ROOT, 'src/content/city-puzzles.json'),
  snapshot: resolve(ROOT, 'tests/content/city-puzzles.snapshot.json'),
}

/** Retries after the id's own seed: `${id}#1` … `${id}#4`. */
const RETRIES = 4
const MAX_ATTEMPTS = 200

/** FNV-1a 32-bit hash of the id (UTF-16 code units), as an unsigned seed. */
export function seedFor(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Cities that have no entry yet, in catalogue order. */
export function missingEntries(cities: readonly City[], existing: readonly CityPuzzle[]): City[] {
  const have = new Set(existing.map((p) => p.cityId))
  return cities.filter((c) => !have.has(c.id))
}

/** The City's Puzzle at its Tier's Difficulty. Throws, naming the id, when no seed succeeds. */
export function buildEntry(city: City): CityPuzzle {
  const difficulty = TIER_DIFFICULTY[city.tier]
  const keys = [city.id, ...Array.from({ length: RETRIES }, (_, i) => `${city.id}#${i + 1}`)]
  for (const key of keys) {
    const result = generate(seedFor(key), difficulty, MAX_ATTEMPTS)
    if (result.ok) {
      const { givens, solution } = result.puzzle
      return { cityId: city.id, givens, solution, difficulty }
    }
  }
  throw new Error(`Could not generate a City Puzzle for ${city.id} (tier ${String(city.tier)})`)
}

export function formatPuzzles(entries: readonly CityPuzzle[]): string {
  return JSON.stringify(entries, null, 2) + '\n'
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

/**
 * Appends entries for missing Cities to the puzzles file and the snapshot. Only the
 * entries this run generated are appended to the snapshot; an entry added to the
 * puzzles file by hand is never copied into it. Every entry is generated before
 * anything is written, so a generation failure writes nothing. Returns the ids added.
 */
export function buildCities(paths: Paths = DEFAULT_PATHS): string[] {
  const cities = readJson<City[]>(paths.cities)
  const existing = readJson<CityPuzzle[]>(paths.puzzles)
  const snapshot = readJson<CityPuzzle[]>(paths.snapshot)

  const added = missingEntries(cities, existing).map(buildEntry)
  if (added.length > 0) {
    writeFileSync(paths.puzzles, formatPuzzles([...existing, ...added]))
    writeFileSync(paths.snapshot, formatPuzzles([...snapshot, ...added]))
  }
  return added.map((p) => p.cityId)
}

function main(argv: readonly string[]): number {
  const [cities, puzzles, snapshot] = argv
  const paths: Paths = {
    cities: cities ?? DEFAULT_PATHS.cities,
    puzzles: puzzles ?? DEFAULT_PATHS.puzzles,
    snapshot: snapshot ?? DEFAULT_PATHS.snapshot,
  }
  try {
    const added = buildCities(paths)
    console.log(added.length === 0 ? 'No City Puzzles missing.' : `Added ${added.length} City Puzzles: ${added.join(', ')}`)
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    return 1
  }
}

/** True when Node was started on this file (real paths, so symlinks and casing can't skip `main`). */
function isEntryPoint(): boolean {
  if (!process.argv[1]) return false
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2))
}
