import type { Technique, TechniqueId } from '../step.ts'
import { claiming } from './claiming.ts'
import { hiddenSingle } from './hidden-single.ts'
import { nakedPair } from './naked-pair.ts'
import { nakedSingle } from './naked-single.ts'
import { pointing } from './pointing.ts'

export type TechniqueEntry = {
  readonly id: TechniqueId
  /** 1 = simplest. The grader takes the highest rank a solve used. */
  readonly rank: number
  readonly find: Technique
}

/** The one ordered Technique registry. The solver always applies the first that finds a Step. */
export const TECHNIQUES: readonly TechniqueEntry[] = [
  { id: 'nakedSingle', rank: 1, find: nakedSingle },
  { id: 'hiddenSingle', rank: 2, find: hiddenSingle },
  { id: 'nakedPair', rank: 3, find: nakedPair },
  { id: 'pointing', rank: 4, find: pointing },
  { id: 'claiming', rank: 5, find: claiming },
]
