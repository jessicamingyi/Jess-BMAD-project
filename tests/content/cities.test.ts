import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CITIES, cityById, type Region, type Tier } from '../../src/content/cities.ts'

const REGIONS: readonly Region[] = ['europe', 'asia', 'americas']
const TIERS: readonly Tier[] = ['near', 'mid', 'far']
const TIER_COUNTS: Readonly<Record<Tier, number>> = { near: 4, mid: 3, far: 3 }

/** Rows of the approved table in planning-artifacts/cities.md, in order. */
function rowsFromCitiesMd(): { region: string; tier: string; id: string; name: string; country: string }[] {
  const md = readFileSync(new URL('../../_bmad-output/planning-artifacts/cities.md', import.meta.url), 'utf8')
  return md
    .split(/\r?\n/)
    .filter((line) => /^\| (?:europe|asia|americas) \|/.test(line))
    .map((line) => {
      const [region, tier, id, name, country] = line.split('|').slice(1, -1).map((s) => s.trim())
      return { region, tier, id, name, country }
    })
}

/** One symbol, optionally followed by U+FE0E (text presentation). */
const GLYPH = /^(\P{M})\uFE0E?$/u

describe('City catalogue', () => {
  it('has 30 Cities, 10 per Region, each split 4 Near / 3 Mid / 3 Far', () => {
    expect(CITIES).toHaveLength(30)
    for (const region of REGIONS) {
      const inRegion = CITIES.filter((c) => c.region === region)
      expect(inRegion, region).toHaveLength(10)
      for (const tier of TIERS) {
        expect(inRegion.filter((c) => c.tier === tier), `${region} ${tier}`).toHaveLength(TIER_COUNTS[tier])
      }
    }
  })

  it.each(CITIES.map((c) => [c.id, c] as const))('%s: allowed codes, non-empty fields, kebab-case id', (id, city) => {
    expect(REGIONS, id).toContain(city.region)
    expect(TIERS, id).toContain(city.tier)
    expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    for (const field of ['name', 'country', 'glyph', 'line'] as const) {
      expect(city[field].trim(), `${id}.${field}`).not.toBe('')
    }
    expect(Object.keys(city).every((k) => ['id', 'name', 'country', 'region', 'tier', 'glyph', 'line', 'placeholder'].includes(k)), id).toBe(true)
    // placeholder is `true` or absent, and is set exactly when the line is still a placeholder.
    if ('placeholder' in city) expect(city.placeholder, id).toBe(true)
    expect(city.placeholder === true, id).toBe(city.line.startsWith('PLACEHOLDER'))
  })

  it('has unique ids, names, countries and glyphs', () => {
    for (const field of ['id', 'name', 'country', 'glyph'] as const) {
      expect(new Set(CITIES.map((c) => c[field])).size, field).toBe(30)
    }
  })

  it('matches cities.md row by row: Region, Tier, slot id, name, country and order', () => {
    const rows = rowsFromCitiesMd()
    expect(rows).toHaveLength(30)
    expect(CITIES.map(({ region, tier, id, name, country }) => ({ region, tier, id, name, country }))).toEqual(rows)
  })

  it.each(CITIES.map((c) => [c.id, c.glyph] as const))('%s: glyph is one single-colour symbol', (id, glyph) => {
    const match = GLYPH.exec(glyph)
    expect(match, `${id}: one symbol, optionally + U+FE0E`).not.toBeNull()
    if (match && /\p{Emoji_Presentation}/u.test(match[1])) {
      expect(glyph.endsWith('\uFE0E'), `${id}: emoji-default glyph needs U+FE0E`).toBe(true)
    }
  })

  it('keeps Lisbon exactly, as the one real Postcard', () => {
    expect(cityById('lisbon')).toEqual({
      id: 'lisbon',
      name: 'Lisbon',
      country: 'Portugal',
      region: 'europe',
      tier: 'mid',
      glyph: '⛵\uFE0E',
      line: 'The trams climb hills that would tire a goat. Wish you were here.',
    })
  })

  it('flags the 29 other Cities as placeholders', () => {
    const placeholders = CITIES.filter((c) => c.placeholder === true)
    expect(placeholders).toHaveLength(29)
    expect(placeholders.map((c) => c.id)).not.toContain('lisbon')
  })

  it('cityById returns undefined for an unknown id', () => {
    expect(cityById('atlantis')).toBeUndefined()
  })
})
