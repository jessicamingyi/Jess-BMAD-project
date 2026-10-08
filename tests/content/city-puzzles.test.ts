import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CITIES, cityById } from '../../src/content/cities.ts'
import { CITY_PUZZLES, cityPuzzle, type CityPuzzle } from '../../src/content/city-puzzles.ts'
import { countSolutions } from '../../src/engine/brute.ts'
import { grade, parseGrid, UNITS } from '../../src/engine/index.ts'
import { TIER_DIFFICULTY } from '../../src/game/journey.ts'

const SNAPSHOT = JSON.parse(
  readFileSync(new URL('./city-puzzles.snapshot.json', import.meta.url), 'utf8'),
) as CityPuzzle[]

describe('City Puzzles', () => {
  it.each(CITY_PUZZLES.map((p) => [p.cityId, p] as const))('%s: fair, consistent and graded to its Tier', (id, p) => {
    const city = cityById(id)
    expect(city, `${id}: unknown City`).toBeDefined()
    expect(p.givens, `${id}: givens format`).toMatch(/^[0-9]{81}$/)
    expect(p.solution, `${id}: solution format`).toMatch(/^[1-9]{81}$/)

    const givens = parseGrid(p.givens)
    expect(countSolutions(givens, 2), `${id}: solution count`).toBe(1)
    for (let i = 0; i < 81; i++) {
      if (p.givens[i] !== '0') expect(p.givens[i], `${id}: Given at cell ${i}`).toBe(p.solution[i])
    }
    const solution = parseGrid(p.solution)
    for (const unit of UNITS) expect(new Set(unit.map((c) => solution[c])).size, `${id}: solution unit`).toBe(9)

    expect(grade(givens), `${id}: grade`).toBe(p.difficulty)
    if (city) expect(p.difficulty, `${id}: Tier ${city.tier}`).toBe(TIER_DIFFICULTY[city.tier])
  })

  it('has exactly one entry per City and no unknown City ids', () => {
    const ids = CITY_PUZZLES.map((p) => p.cityId)
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(duplicates, 'duplicate cityId').toEqual([])
    const known = new Set(CITIES.map((c) => c.id))
    expect(ids.filter((id) => !known.has(id)), 'unknown cityId').toEqual([])
    const have = new Set(ids)
    expect(CITIES.map((c) => c.id).filter((id) => !have.has(id)), 'City without a Puzzle').toEqual([])
  })

  it.each(SNAPSHOT.map((s) => [s.cityId, s] as const))('%s: released entry is unchanged', (id, released) => {
    expect(cityPuzzle(id), `${id}: removed or altered since release`).toEqual(released)
  })

  it('every entry is in the snapshot', () => {
    const released = new Set(SNAPSHOT.map((s) => s.cityId))
    const missing = CITY_PUZZLES.filter((p) => !released.has(p.cityId)).map((p) => p.cityId)
    expect(
      missing,
      'entries missing from the snapshot: every entry must come from `npm run build:cities` on a catalogue City with no entry (it appends to both files); released entries are never edited',
    ).toEqual([])
  })

  it('cityPuzzle returns undefined for an unknown id', () => {
    expect(cityPuzzle('atlantis')).toBeUndefined()
  })
})
