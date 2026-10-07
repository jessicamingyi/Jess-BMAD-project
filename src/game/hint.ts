import { copy } from '../content/copy.ts'
import { explainChain, TECHNIQUE_TEXT, type TechniqueFacts, type TechniqueKey, type UnitRef } from '../content/techniques.ts'
import { computeCandidates, digitsOf } from '../engine/candidates.ts'
import { boxOf, colOf, parseGrid, rowOf, UNITS, type Grid, type Unit } from '../engine/grid.ts'
import { applyStep } from '../engine/solver.ts'
import type { CellDigit, Step } from '../engine/step.ts'
import type { Action, AppState, HintState } from './types.ts'

/** The Hint for Session `key`, or null (closed, or another Session's Hint). */
export function activeHint(state: AppState, key: string): HintState | null {
  const { hint } = state.ui
  return hint !== null && hint.sessionKey === key ? hint : null
}

/** The chain of an open Hint at step 1 or 2, else null. */
function shownChain(hint: HintState | null): readonly Step[] | null {
  if (!hint || hint.step === 'idle' || hint.result?.kind !== 'chain') return null
  return hint.result.chain
}

/** The Mistake a shown Hint (step 1 or 2) reports, else null. */
function shownMistake(hint: HintState | null): { readonly cell: number; readonly digit: number } | null {
  if (!hint || hint.step === 'idle' || hint.result?.kind !== 'mistake') return null
  return hint.result
}

/**
 * The cell of the Mistake a shown Hint reports (step 1 or 2), else null. It
 * shows the Mistake mark even with the Mistake Assist Off.
 */
export function hintMistakeCell(hint: HintState | null): number | null {
  return shownMistake(hint)?.cell ?? null
}

/**
 * The Technique a shown Hint's "What's a…" link names: the chain's first Step's,
 * the same one the nudge names. Null when closed, idle or without a chain.
 */
export function hintTechnique(hint: HintState | null): TechniqueKey | null {
  return shownChain(hint)?.[0]?.technique ?? null
}

/**
 * The move a Hint at step 2 makes: the last chain Step's first placement, or for
 * a Mistake `{ cell, digit: 0 }` (clear that cell). Null at any other step, or
 * without a chain or Mistake.
 */
export function hintMove(hint: HintState | null): CellDigit | null {
  if (!hint || hint.step !== 'explain') return null
  const mistake = shownMistake(hint)
  if (mistake) return { cell: mistake.cell, digit: 0 }
  const chain = shownChain(hint)
  if (!chain) return null
  return chain[chain.length - 1].placements[0] ?? null
}

/** What H or a Hint button does now: apply the move at step 2 (chain or Mistake), else ask for the next step. */
export function hintAction(hint: HintState | null): Action {
  return hintMove(hint) !== null ? { type: 'hintApplied' } : { type: 'hintRequested' }
}

type AreaUnit = { readonly kind: 'row' | 'column' | 'box'; readonly index: number }

/** The unit a nudge names: a naked single (a cell) names its cell's row. */
function nudgeUnit(unit: Unit): AreaUnit {
  return unit.kind === 'cell' ? { kind: 'row', index: rowOf(unit.index) } : { kind: unit.kind, index: unit.index }
}

const UNIT_OFFSET = { row: 0, column: 9, box: 18 } as const

const EMPTY: ReadonlySet<number> = new Set()

/**
 * The cells to hint-focus. Step 1: the nudge unit's nine cells. Step 2: every
 * chain Step's `focusCells`. A Mistake: its cell at both steps. Closed or idle: none.
 */
export function hintFocusCells(hint: HintState | null): ReadonlySet<number> {
  const mistake = shownMistake(hint)
  if (mistake) return new Set([mistake.cell])
  const chain = shownChain(hint)
  if (!chain) return EMPTY
  if (hint!.step === 'nudge') {
    const u = nudgeUnit(chain[0].unit)
    return new Set(UNITS[UNIT_OFFSET[u.kind] + u.index])
  }
  return new Set(chain.flatMap((s) => s.focusCells))
}

const ref = (u: AreaUnit): UnitRef => ({ kind: u.kind, number: u.index + 1 })

/** Template facts for `step`, read from the candidates it was found on. */
function factsOf(step: Step, candidates: readonly number[]): TechniqueFacts {
  const cell = step.placements[0]?.cell ?? step.focusCells[0]
  const digit = step.placements[0]?.digit ?? step.eliminations[0]?.digit ?? 0
  const unit = ref(nudgeUnit(step.unit))
  const position = { row: rowOf(cell) + 1, column: colOf(cell) + 1, box: boxOf(cell) + 1 }
  switch (step.technique) {
    case 'nakedPair':
      return { unit, digit, digits: digitsOf(candidates[step.focusCells[0]]), target: unit, ...position }
    case 'pointing': {
      const sameRow = step.focusCells.every((c) => rowOf(c) === rowOf(cell))
      const target: UnitRef = sameRow ? { kind: 'row', number: rowOf(cell) + 1 } : { kind: 'column', number: colOf(cell) + 1 }
      return { unit, digit, digits: [digit], target, ...position }
    }
    case 'claiming':
      return { unit, digit, digits: [digit], target: { kind: 'box', number: boxOf(cell) + 1 }, ...position }
    default:
      return { unit, digit, digits: [digit], target: unit, ...position }
  }
}

/** The explanation for a chain found from `grid`: replays it to read each Step's candidates. */
function explanation(chain: readonly Step[], grid: Grid): string {
  let current = grid
  let candidates = computeCandidates(grid)
  const facts: TechniqueFacts[] = []
  for (const step of chain) {
    facts.push(factsOf(step, candidates))
    const next = applyStep(current, candidates, step)
    current = next.grid
    candidates = next.candidates
  }
  const last = chain.length - 1
  if (last === 0) return TECHNIQUE_TEXT[chain[0].technique].explain(facts[0])
  const leads = chain.slice(0, last).map((s, i) => {
    const t = TECHNIQUE_TEXT[s.technique]
    return t.lead ? t.lead(facts[i]) : t.explain(facts[i])
  })
  const end = TECHNIQUE_TEXT[chain[last].technique]
  return explainChain(leads, end.conclude ? end.conclude(facts[last]) : end.explain(facts[last]))
}

export type HintView = {
  /** Small-caps step label. */
  readonly label: string
  /** Nudge or explanation text; empty when idle. */
  readonly text: string
  /** The one step button's label. */
  readonly button: string
  /** The "What's a…" link and its definition at steps 1 and 2 with a chain; else null (never for a Mistake). */
  readonly technique: HintTechniqueView | null
}

export type HintTechniqueView = {
  /** "What's pointing?" */
  readonly link: string
  /** The definition's title: the Technique's name, capitalised ("Pointing"). */
  readonly title: string
  readonly definition: string
}

function techniqueView(key: TechniqueKey | null): HintTechniqueView | null {
  if (key === null) return null
  const { name, link, definition } = TECHNIQUE_TEXT[key]
  return { link, title: name.charAt(0).toUpperCase() + name.slice(1), definition }
}

/**
 * What the Hint panel shows for `hint`, found from `digits` (the Session's
 * current digits: any change resets the Hint, so they are the ones it was found from).
 */
export function hintView(hint: HintState | null, digits: string): HintView {
  const mistake = shownMistake(hint)
  if (mistake) {
    const row = rowOf(mistake.cell) + 1
    return hint!.step === 'nudge'
      ? { label: copy.hintLabelNudge, text: copy.hintMistakeNudge(row), button: copy.hintExplainIt, technique: null }
      : {
          label: copy.hintLabelExplain,
          text: copy.hintMistakeExplain(mistake.digit, row, colOf(mistake.cell) + 1),
          button: copy.hintShowMove,
          technique: null,
        }
  }
  const chain = shownChain(hint)
  if (!chain) return { label: copy.hintLabelIdle, text: '', button: copy.hintShowNudge, technique: null }
  const first = chain[0]
  const technique = techniqueView(hintTechnique(hint))
  if (hint!.step === 'nudge') {
    return {
      label: copy.hintLabelNudge,
      text: TECHNIQUE_TEXT[first.technique].nudge(ref(nudgeUnit(first.unit))),
      button: copy.hintExplainIt,
      technique,
    }
  }
  return {
    label: copy.hintLabelExplain,
    text: explanation(chain, parseGrid(digits)),
    button: copy.hintShowMove,
    technique,
  }
}
