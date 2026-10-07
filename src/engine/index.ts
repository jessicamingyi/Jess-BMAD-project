/** Public engine API (pure, deterministic). `brute.ts` is deliberately not re-exported. */
export { parseGrid, formatGrid, UNITS, PEERS, type Grid, type Unit } from './grid.ts'
export { computeCandidates } from './candidates.ts'
export type { Step, Technique, TechniqueId, CellDigit } from './step.ts'
export { TECHNIQUES, type TechniqueEntry } from './techniques/index.ts'
export { applyStep, solve, type SolveResult } from './solver.ts'
export { grade, type Difficulty, type Grade } from './grader.ts'
export { mistakeCells } from './mistakes.ts'
