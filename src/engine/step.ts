import type { Grid, Unit } from './grid.ts'

export type TechniqueId = 'nakedSingle' | 'hiddenSingle' | 'nakedPair' | 'pointing' | 'claiming'

export type CellDigit = { readonly cell: number; readonly digit: number }

/**
 * One deduction. Structured data only, no display text (the UI renders text
 * from content/techniques in Epic 2).
 */
export type Step = {
  readonly technique: TechniqueId
  readonly placements: readonly CellDigit[]
  readonly eliminations: readonly CellDigit[]
  readonly focusCells: readonly number[]
  readonly unit: Unit
}

/** Grid + candidates → the first Step this Technique finds, or null. Pure. */
export type Technique = (grid: Grid, candidates: readonly number[]) => Step | null
