import type { Tier } from '../content/cities.ts'
import type { Difficulty } from '../engine/index.ts'

/*
 * The journey rules. Imports carry `.ts` extensions because scripts/build-cities
 * runs this file directly under Node.
 */

/** The only Tier → Difficulty map: Near is Easy, Mid is Medium, Far is Hard. */
export const TIER_DIFFICULTY: Readonly<Record<Tier, Difficulty>> = Object.freeze({
  near: 'easy',
  mid: 'medium',
  far: 'hard',
})

export function difficultyForTier(tier: Tier): Difficulty {
  return TIER_DIFFICULTY[tier]
}
