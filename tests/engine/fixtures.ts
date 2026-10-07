/**
 * Known-puzzle set for the engine tests. 81-char digit strings, 0 = empty.
 * Found with a throwaway scratch script; every property claimed here is
 * re-checked by the tests (uniqueness, solutions, grades, Technique results).
 */
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import type { Step, TechniqueId } from '../../src/engine/step.ts'

export type PuzzleFixture = {
  readonly givens: string
  /** The unique solution when recorded; null when there isn't exactly one, or (beyondMvp) it isn't recorded. */
  readonly solution: string | null
  readonly solutions: 0 | 1 | 2
  readonly grade: 'easy' | 'medium' | 'hard' | 'notGradeable'
}

export const PUZZLES = {
  sample: { givens: samplePuzzle.givens, solution: samplePuzzle.solution, solutions: 1, grade: 'easy' },
  /** Needs hidden singles, never a pair. */
  easy: {
    givens: '080000000000539000090020003007013209001000000300006700050000010200050000900068005',
    solution: '183647592672539148495821673567413289821975436349286751756392814238154967914768325',
    solutions: 1,
    grade: 'easy',
  },
  /** The solver needs a naked pair; no pointing or claiming. */
  medium: {
    givens: '500010000680000000070063019010000003000070000008402000060020500000000704005608000',
    solution: '593814627681297345472563819217986453346175982958432176164729538829351764735648291',
    solutions: 1,
    grade: 'medium',
  },
  /** The solver needs pointing (and no claiming). */
  hardPointing: {
    givens: '080000000150000900007040000200090060001080079800021005060508000004010600000000053',
    solution: '489156327153872946627349518275493861341685279896721435762538194534917682918264753',
    solutions: 1,
    grade: 'hard',
  },
  /** The solver needs claiming. */
  hardClaiming: {
    givens: '057100000006000004030000027000000000080000076010420300000090002000205038001300400',
    solution: '257148963196732854438569127972683541384951276615427389563894712749215638821376495',
    solutions: 1,
    grade: 'hard',
  },
  /** Arto Inkala's 2012 Puzzle: unique, but beyond the five Techniques. */
  beyondMvp: {
    givens: '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
    solution: null,
    solutions: 1,
    grade: 'notGradeable',
  },
  /** The sample Givens with a second 5 in row 1 (cell 2): no solution. */
  conflicting: {
    givens: '535070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solution: null,
    solutions: 0,
    grade: 'notGradeable',
  },
  /**
   * The sample solution with cell 0 changed to a second 3 in row 1 and cell 80
   * opened: one naked single fills the grid completely, but it is invalid.
   */
  conflictingFilled: {
    givens: '334678912672195348198342567859761423426853791713924856961537284287419635345286170',
    solution: null,
    solutions: 0,
    grade: 'notGradeable',
  },
  /** The sample solution with a deadly rectangle (cells 32, 35, 41, 44) opened: two solutions. */
  multiSolution: {
    givens: '534678912672195348198342567859760420426850790713924856961537284287419635345286179',
    solution: null,
    solutions: 2,
    grade: 'notGradeable',
  },
} as const satisfies Record<string, PuzzleFixture>

export type TechniqueFixture = {
  /** A position where the Technique applies (fresh candidates from its digits). */
  readonly applies: string
  /** The unique solution of `applies`, used to check the Step is sound. */
  readonly solution: string
  readonly step: Step
  /** A position (fresh candidates) where the Technique finds nothing. */
  readonly none: string
}

/** Mid-solve position from the Easy puzzle: no claiming anywhere. */
const EASY_MID_SOLVE = '183647592072539108095821073567413289821975030349286751050392010230154060914768325'
/** Mid-solve position (unique) with no single, pair or pointing on fresh candidates (only claiming applies). */
export const NO_HIDDEN_SINGLE = '200005713709003652030720849000030000400200300123050960802060430050300008300002006'

export const TECHNIQUE_FIXTURES: Record<TechniqueId, TechniqueFixture> = {
  nakedSingle: {
    applies: PUZZLES.sample.givens,
    solution: PUZZLES.sample.solution,
    step: {
      technique: 'nakedSingle',
      placements: [{ cell: 40, digit: 5 }],
      eliminations: [],
      focusCells: [40],
      unit: { kind: 'cell', index: 40 },
    },
    none: PUZZLES.easy.givens,
  },
  hiddenSingle: {
    applies: PUZZLES.easy.givens,
    solution: PUZZLES.easy.solution,
    step: {
      technique: 'hiddenSingle',
      placements: [{ cell: 2, digit: 3 }],
      eliminations: [],
      focusCells: [2],
      unit: { kind: 'row', index: 0 },
    },
    none: NO_HIDDEN_SINGLE,
  },
  nakedPair: {
    applies: PUZZLES.medium.givens,
    solution: PUZZLES.medium.solution,
    step: {
      technique: 'nakedPair',
      placements: [],
      eliminations: [
        { cell: 21, digit: 2 },
        { cell: 24, digit: 2 },
        { cell: 24, digit: 4 },
      ],
      focusCells: [18, 20],
      unit: { kind: 'row', index: 2 },
    },
    none: PUZZLES.sample.givens,
  },
  pointing: {
    applies: PUZZLES.hardPointing.givens,
    solution: PUZZLES.hardPointing.solution,
    step: {
      technique: 'pointing',
      placements: [],
      eliminations: [
        { cell: 64, digit: 7 },
        { cell: 73, digit: 7 },
      ],
      focusCells: [28, 46],
      unit: { kind: 'box', index: 3 },
    },
    none: PUZZLES.hardClaiming.givens,
  },
  claiming: {
    applies: PUZZLES.hardClaiming.givens,
    solution: PUZZLES.hardClaiming.solution,
    step: {
      technique: 'claiming',
      placements: [],
      eliminations: [
        { cell: 4, digit: 3 },
        { cell: 5, digit: 3 },
      ],
      focusCells: [13, 14],
      unit: { kind: 'row', index: 1 },
    },
    none: EASY_MID_SOLVE,
  },
}

/**
 * Row-direction pointing (TECHNIQUE_FIXTURES.pointing is column-direction): in the
 * sample Givens, box 0's 7s lie only in row index 1 (cells 10, 11), so 7 leaves that row outside the box.
 */
export const POINTING_ROW: Omit<TechniqueFixture, 'none'> = {
  applies: PUZZLES.sample.givens,
  solution: PUZZLES.sample.solution,
  step: {
    technique: 'pointing',
    placements: [],
    eliminations: [
      { cell: 15, digit: 7 },
      { cell: 17, digit: 7 },
    ],
    focusCells: [10, 11],
    unit: { kind: 'box', index: 0 },
  },
}
