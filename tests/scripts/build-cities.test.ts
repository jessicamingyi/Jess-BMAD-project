import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildCities,
  buildEntry,
  DEFAULT_PATHS,
  formatPuzzles,
  missingEntries,
  seedFor,
  type Paths,
} from '../../scripts/build-cities.ts'
import { CITIES, cityById, type City } from '../../src/content/cities.ts'
import type { CityPuzzle } from '../../src/content/city-puzzles.ts'
import { difficultyForTier } from '../../src/game/journey.ts'

const SCRIPT = fileURLToPath(new URL('../../scripts/build-cities.ts', import.meta.url))

const committed = JSON.parse(readFileSync(DEFAULT_PATHS.puzzles, 'utf8')) as CityPuzzle[]

let dir: string
let paths: Paths

/** Temp copies: the real catalogue plus the given puzzles (as both file and snapshot). */
function setUp(puzzles: readonly CityPuzzle[], cities: readonly City[] = CITIES): void {
  writeFileSync(paths.cities, JSON.stringify(cities, null, 2) + '\n')
  writeFileSync(paths.puzzles, formatPuzzles(puzzles))
  writeFileSync(paths.snapshot, formatPuzzles(puzzles))
}

const read = (path: string) => readFileSync(path, 'utf8')

function runCli() {
  return spawnSync(process.execPath, ['--no-warnings', SCRIPT, paths.cities, paths.puzzles, paths.snapshot], {
    encoding: 'utf8',
  })
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'traveller-build-cities-'))
  paths = { cities: join(dir, 'cities.json'), puzzles: join(dir, 'puzzles.json'), snapshot: join(dir, 'snapshot.json') }
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('build-cities', () => {
  it('seedFor is FNV-1a 32-bit', () => {
    expect(seedFor('')).toBe(0x811c9dc5)
    expect(seedFor('a')).toBe(0xe40c292c)
    expect(seedFor('foobar')).toBe(0xbf9cf968)
  })

  it('missingEntries returns Cities without an entry, in catalogue order', () => {
    const existing = committed.filter((p) => !['lisbon', 'europe-near-2'].includes(p.cityId))
    expect(missingEntries(CITIES, existing).map((c) => c.id)).toEqual(['europe-near-2', 'lisbon'])
    expect(missingEntries(CITIES, committed)).toEqual([])
  })

  it('formatPuzzles is 2-space JSON with a trailing newline', () => {
    expect(formatPuzzles([])).toBe('[]\n')
    expect(read(DEFAULT_PATHS.puzzles)).toBe(formatPuzzles(committed))
  })

  it('Determinism: regenerating europe-near-1 from nothing equals the committed entry', () => {
    const city = cityById('europe-near-1')!
    expect(buildEntry(city)).toEqual(committed.find((p) => p.cityId === 'europe-near-1'))
  })

  it('Partial: generates only the missing entry, appends it last and extends the snapshot', () => {
    const missing = 'americas-near-2'
    const rest = committed.filter((p) => p.cityId !== missing)
    setUp(rest)
    const before = read(paths.puzzles)

    expect(buildCities(paths)).toEqual([missing])

    const after = JSON.parse(read(paths.puzzles)) as CityPuzzle[]
    expect(after).toHaveLength(30)
    expect(after.slice(0, 29)).toEqual(rest)
    expect(after[29]).toEqual(committed.find((p) => p.cityId === missing))
    // Existing entries are byte-identical: the old text minus its closing bracket is a prefix.
    expect(read(paths.puzzles).startsWith(before.slice(0, before.lastIndexOf('}') + 1))).toBe(true)
    expect(read(paths.snapshot)).toBe(read(paths.puzzles))
  })

  it('Fresh build: 30 entries in catalogue order at the Difficulty of each Tier, equal to the committed ones', () => {
    setUp([])
    expect(buildCities(paths)).toEqual(CITIES.map((c) => c.id))
    const built = JSON.parse(read(paths.puzzles)) as CityPuzzle[]
    expect(built.map((p) => p.cityId)).toEqual(CITIES.map((c) => c.id))
    for (const [i, p] of built.entries()) expect(p.difficulty, p.cityId).toBe(difficultyForTier(CITIES[i].tier))
    expect(built).toEqual(committed)
    expect(read(paths.snapshot)).toBe(read(paths.puzzles))
  }, 60_000)

  it('never copies a hand-added entry into the snapshot', () => {
    const handAdded = committed.find((p) => p.cityId === 'lisbon')!
    const rest = committed.filter((p) => p !== handAdded)
    setUp(rest)
    writeFileSync(paths.puzzles, formatPuzzles(committed))
    const snapshot = read(paths.snapshot)

    expect(buildCities(paths)).toEqual([])
    expect(read(paths.snapshot)).toBe(snapshot)
  })

  it('Nothing missing: writes nothing and both files stay byte-for-byte unchanged', () => {
    setUp(committed)
    const puzzles = read(paths.puzzles)
    const snapshot = read(paths.snapshot)
    const mtimes = [statSync(paths.puzzles).mtimeMs, statSync(paths.snapshot).mtimeMs]

    expect(buildCities(paths)).toEqual([])

    expect(read(paths.puzzles)).toBe(puzzles)
    expect(read(paths.snapshot)).toBe(snapshot)
    expect([statSync(paths.puzzles).mtimeMs, statSync(paths.snapshot).mtimeMs]).toEqual(mtimes)
  })

  it('a City that cannot be generated throws naming its id and leaves the files untouched', () => {
    const broken = { ...cityById('europe-near-1')!, id: 'broken-city', tier: 'nowhere' } as unknown as City
    setUp(committed, [...CITIES, broken])
    const puzzles = read(paths.puzzles)

    expect(() => buildCities(paths)).toThrow(/broken-city/)
    expect(read(paths.puzzles)).toBe(puzzles)
    expect(read(paths.snapshot)).toBe(puzzles)
  })

  it('CLI under Node: nothing missing exits 0 and writes nothing', () => {
    setUp(committed)
    const puzzles = read(paths.puzzles)
    const r = runCli()
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
    expect(r.stdout.trim()).toBe('No City Puzzles missing.')
    expect(read(paths.puzzles)).toBe(puzzles)
    expect(read(paths.snapshot)).toBe(puzzles)
  })

  it('CLI under Node: one entry missing exits 0 and adds it', () => {
    setUp(committed.filter((p) => p.cityId !== 'europe-near-1'))
    const r = runCli()
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
    expect(r.stdout.trim()).toBe('Added 1 City Puzzles: europe-near-1')
    const after = JSON.parse(read(paths.puzzles)) as CityPuzzle[]
    expect(after.at(-1)).toEqual(committed.find((p) => p.cityId === 'europe-near-1'))
  })
})
