import { describe, expect, it } from 'vitest'
import { explainChain, TECHNIQUE_TEXT, type TechniqueFacts, type TechniqueKey } from '../../src/content/techniques.ts'
import { TECHNIQUES } from '../../src/engine/techniques/index.ts'
import { hintView } from '../../src/game/hint.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'
import { HINT_POSITIONS, PUZZLES } from '../engine/fixtures.ts'

const ELIMINATION: readonly TechniqueKey[] = ['nakedPair', 'pointing', 'claiming']
const SINGLES: readonly TechniqueKey[] = ['nakedSingle', 'hiddenSingle']

const facts = (over: Partial<TechniqueFacts> = {}): TechniqueFacts => ({
  unit: { kind: 'row', number: 4 },
  digit: 8,
  digits: [3, 8],
  row: 4,
  column: 6,
  box: 5,
  target: { kind: 'column', number: 6 },
  ...over,
})

/** Open a Hint on `digits` and step through it: [nudge text, explanation text]. */
function render(digits: string): [string, string] {
  let state: AppState = createInitialState({ givens: digits, solution: PUZZLES.sample.solution, difficulty: 'easy' })
  state = reducer(state, { type: 'hintRequested' })
  const nudge = hintView(state.ui.hint, digits).text
  state = reducer(state, { type: 'hintRequested' })
  return [nudge, hintView(state.ui.hint, digits).text]
}

describe('TECHNIQUE_TEXT', () => {
  it('covers exactly the registry Techniques, each with nudge and explain', () => {
    expect(Object.keys(TECHNIQUE_TEXT).sort()).toEqual(TECHNIQUES.map((t) => t.id).sort())
    for (const { id } of TECHNIQUES) {
      expect(typeof TECHNIQUE_TEXT[id].nudge, id).toBe('function')
      expect(typeof TECHNIQUE_TEXT[id].explain, id).toBe('function')
    }
  })

  it('elimination Techniques have lead; singles have conclude', () => {
    for (const id of ELIMINATION) expect(typeof TECHNIQUE_TEXT[id].lead, id).toBe('function')
    for (const id of SINGLES) expect(typeof TECHNIQUE_TEXT[id].conclude, id).toBe('function')
  })

  it('every template renders non-empty text with no "!" for every unit kind', () => {
    for (const { id } of TECHNIQUES) {
      const t = TECHNIQUE_TEXT[id]
      for (const kind of ['row', 'column', 'box'] as const) {
        const f = facts({ unit: { kind, number: 2 } })
        for (const text of [t.nudge(f.unit), t.explain(f), t.lead?.(f) ?? 'x', t.conclude?.(f) ?? 'x']) {
          expect(text.length, id).toBeGreaterThan(0)
          expect(text, id).not.toContain('!')
          expect(text, id).not.toMatch(/undefined|NaN/)
        }
      }
    }
  })

  it('every template puts an article before a digit ("a 9", "an 8"; "every 8" aside)', () => {
    for (const { id } of TECHNIQUES) {
      const t = TECHNIQUE_TEXT[id]
      for (const kind of ['row', 'column', 'box'] as const) {
        // Only the digits are 8 and 9, so every 8 or 9 in the text is a digit.
        const f = facts({ unit: { kind, number: 2 }, digit: 8, digits: [8, 9] })
        for (const text of [t.explain(f), t.lead?.(f) ?? '', t.conclude?.(f) ?? '']) {
          expect(text, id).not.toMatch(/\ba 8\b/)
          expect(text, id).not.toMatch(/\ban 9\b/)
          expect(text, id).not.toMatch(/(?<!\ban |\ba |\bevery )\b[89]\b/)
        }
      }
    }
    expect(TECHNIQUE_TEXT.nakedSingle.explain(facts())).toContain('can only be an 8.')
    expect(TECHNIQUE_TEXT.nakedSingle.conclude!(facts())).toBe('That leaves an 8 as the only digit for row 4, column 6.')
    expect(TECHNIQUE_TEXT.nakedPair.lead!(facts({ digits: [8, 9] }))).toBe(
      'two cells in row 4 can only be an 8 or a 9, so no other cell in row 4 can be an 8 or a 9',
    )
  })

  it('pins the hidden-single row explanation exactly', () => {
    expect(TECHNIQUE_TEXT.hiddenSingle.explain(facts({ digit: 7, unit: { kind: 'row', number: 4 } }))).toBe(
      'In row 4, a 7 fits only in column 6. Every other empty cell in the row already has a 7 in its column or box.',
    )
  })

  it('explainChain: elimination clauses joined with ", and" in one sentence, then the placement line', () => {
    expect(explainChain(['in box 1, x', 'in box 2, y'], 'That leaves z.')).toBe('In box 1, x, and in box 2, y. That leaves z.')
    expect(explainChain([], 'Row 1, column 1 can only be a 3.')).toBe('Row 1, column 1 can only be a 3.')
  })
})

describe('rendered on the Hint fixtures', () => {
  it('gives non-empty nudge and explanation text without "!", in at most two sentences', () => {
    for (const [name, digits] of Object.entries(HINT_POSITIONS)) {
      const [nudge, explain] = render(digits)
      for (const text of [nudge, explain]) {
        expect(text.length, name).toBeGreaterThan(0)
        expect(text, name).not.toContain('!')
      }
      expect(explain.split(/(?<=\.) /).length, name).toBeLessThanOrEqual(2)
    }
  })

  it('hidden single in a row (Easy Givens): exact nudge and explanation', () => {
    expect(render(HINT_POSITIONS.hiddenSingle)).toEqual([
      'Look for a hidden single in row 1.',
      'In row 1, a 3 fits only in column 3. Every other empty cell in the row already has a 3 in its column or box.',
    ])
  })

  it('naked single: the nudge names the cell\'s row', () => {
    expect(render(HINT_POSITIONS.nakedSingle)).toEqual([
      'Look for a naked single in row 5.',
      'Row 5, column 5 can only be a 5. Every other digit is already in its row, column or box.',
    ])
  })

  it('pointing chain: one clause per elimination Step, then a short placement line', () => {
    expect(render(HINT_POSITIONS.pointing)).toEqual([
      'Look for pointing in box 5.',
      "In box 5, every 4 sits in row 5, so the rest of row 5 can't be a 4, and in box 8, every 2 sits in row 8, so the rest of row 8 can't be a 2. That leaves a 3 as the only digit for row 8, column 8.",
    ])
  })

  it('pointing along a column names the column', () => {
    expect(render(HINT_POSITIONS.pointingColumn)).toEqual([
      'Look for pointing in box 1.',
      "In box 1, every 7 sits in column 2, so the rest of column 2 can't be a 7. That leaves a 3 as the only digit for row 7, column 2.",
    ])
  })

  it('naked pair and claiming chains name their Technique first', () => {
    const [pairNudge, pairExplain] = render(HINT_POSITIONS.nakedPair)
    expect(pairNudge).toBe('Look for a naked pair in column 1.')
    expect(pairExplain).toMatch(/^Two cells in column 1 can only be a 2 or a 4, /)
    expect(pairExplain).toMatch(/ That leaves column 7 as the only place for a 1 in row 6\.$/)
    expect(render(HINT_POSITIONS.claiming)).toEqual([
      'Look for claiming in row 6.',
      "In row 6, every 8 sits in box 5, so the rest of box 5 can't be an 8. That leaves row 6 as the only place for an 8 in column 6.",
    ])
  })
})
