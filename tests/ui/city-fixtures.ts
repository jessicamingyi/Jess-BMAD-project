import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createSession } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'

/**
 * `base` with `cityId`'s Puzzle in progress, every empty cell but the last
 * `left` filled correctly, still on the Album: its slot reads "Carry on" and
 * the test plays only the last move(s).
 */
export function nearly(base: AppState, cityId: string, left = 1): AppState {
  const puzzle = cityPuzzle(cityId)!
  const empty = [...puzzle.givens].flatMap((d, i) => (d === '0' ? [i] : []))
  const open = new Set(empty.slice(-left))
  const digits = [...puzzle.solution].map((d, i) => (open.has(i) ? '0' : d)).join('')
  const key = cityKey(cityId)
  return { ...base, sessions: { ...base.sessions, [key]: { ...createSession(key, puzzle), digits } } }
}
