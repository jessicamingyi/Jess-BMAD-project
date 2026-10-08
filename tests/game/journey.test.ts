import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { difficultyForTier, TIER_DIFFICULTY } from '../../src/game/journey.ts'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

function sources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sources(full))
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('game/journey', () => {
  it('maps Near → Easy, Mid → Medium, Far → Hard', () => {
    expect(TIER_DIFFICULTY).toEqual({ near: 'easy', mid: 'medium', far: 'hard' })
    expect(difficultyForTier('near')).toBe('easy')
    expect(difficultyForTier('mid')).toBe('medium')
    expect(difficultyForTier('far')).toBe('hard')
    expect(Object.isFrozen(TIER_DIFFICULTY)).toBe(true)
  })

  it('holds the only Tier → Difficulty map in src/ and scripts/', () => {
    const MAP_LITERAL = /['"]?near['"]?\s*:\s*['"]easy['"]/
    const files = [...sources(join(ROOT, 'src')), ...sources(join(ROOT, 'scripts'))]
      .filter((f) => MAP_LITERAL.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f).replace(/\\/g, '/'))
    expect(files).toEqual(['src/game/journey.ts'])
  })
})
