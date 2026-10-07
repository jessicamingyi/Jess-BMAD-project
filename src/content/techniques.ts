/**
 * Hint wording for the five Techniques (FR-8–FR-11). Content imports nothing, so
 * the Technique ids are restated here; tests check they match the engine registry.
 * Numbers in facts are already 1-based (boxes counted row-major). No "!".
 */
export type TechniqueKey = 'nakedSingle' | 'hiddenSingle' | 'nakedPair' | 'pointing' | 'claiming'

export type UnitRef = { readonly kind: 'row' | 'column' | 'box'; readonly number: number }

/** What a template may name about one Step. Every field is filled by `game/hint`. */
export type TechniqueFacts = {
  /** Where the Step happened. A naked single's is its cell's row. */
  readonly unit: UnitRef
  /** The digit placed, or the digit removed (pointing, claiming). */
  readonly digit: number
  /** A naked pair's two digits, ascending (otherwise just `digit`). */
  readonly digits: readonly number[]
  /** The placed cell (singles), or the first cell the Step names. */
  readonly row: number
  readonly column: number
  readonly box: number
  /** Where the digit leaves: pointing's row or column, claiming's box (otherwise `unit`). */
  readonly target: UnitRef
}

export type TechniqueText = {
  /** Step 1: names the Technique and the area to look at. */
  readonly nudge: (unit: UnitRef) => string
  /** Step 2 when the Step is the whole chain (one or two sentences). */
  readonly explain: (facts: TechniqueFacts) => string
  /** Elimination Techniques: one lower-case clause, joined with ", and" when a chain has several. */
  readonly lead?: (facts: TechniqueFacts) => string
  /** Placing Techniques: the short closing line after elimination Steps. */
  readonly conclude?: (facts: TechniqueFacts) => string
}

export const unitName = (u: UnitRef): string => `${u.kind} ${u.number}`

/** "a 3", "an 8". */
const aDigit = (digit: number): string => `${digit === 8 ? 'an' : 'a'} ${digit}`

const sentence = (clause: string): string => `${clause.charAt(0).toUpperCase()}${clause.slice(1)}.`

const pairLead = (f: TechniqueFacts): string => {
  const [p, q] = f.digits
  const where = unitName(f.unit)
  return `two cells in ${where} can only be ${aDigit(p)} or ${aDigit(q)}, so no other cell in ${where} can be ${aDigit(p)} or ${aDigit(q)}`
}

const pointingLead = (f: TechniqueFacts): string => {
  const line = unitName(f.target)
  return `in ${unitName(f.unit)}, every ${f.digit} sits in ${line}, so the rest of ${line} can't be ${aDigit(f.digit)}`
}

const claimingLead = (f: TechniqueFacts): string => {
  const box = unitName(f.target)
  return `in ${unitName(f.unit)}, every ${f.digit} sits in ${box}, so the rest of ${box} can't be ${aDigit(f.digit)}`
}

function hiddenSingleExplain(f: TechniqueFacts): string {
  const { row: r, column: c, box: b, digit: d } = f
  switch (f.unit.kind) {
    case 'row':
      return `In row ${r}, ${aDigit(d)} fits only in column ${c}. Every other empty cell in the row already has ${aDigit(d)} in its column or box.`
    case 'column':
      return `In column ${c}, ${aDigit(d)} fits only in row ${r}. Every other empty cell in the column already has ${aDigit(d)} in its row or box.`
    default:
      return `In box ${b}, ${aDigit(d)} fits only in row ${r}, column ${c}. Every other empty cell in the box already has ${aDigit(d)} in its row or column.`
  }
}

function hiddenSingleConclude(f: TechniqueFacts): string {
  const { row: r, column: c, box: b, digit: d } = f
  switch (f.unit.kind) {
    case 'row':
      return `That leaves column ${c} as the only place for ${aDigit(d)} in row ${r}.`
    case 'column':
      return `That leaves row ${r} as the only place for ${aDigit(d)} in column ${c}.`
    default:
      return `That leaves row ${r}, column ${c} as the only place for ${aDigit(d)} in box ${b}.`
  }
}

export const TECHNIQUE_TEXT: Readonly<Record<TechniqueKey, TechniqueText>> = {
  nakedSingle: {
    nudge: (u) => `Look for a naked single in ${unitName(u)}.`,
    explain: (f) =>
      `Row ${f.row}, column ${f.column} can only be ${aDigit(f.digit)}. Every other digit is already in its row, column or box.`,
    conclude: (f) => `That leaves ${aDigit(f.digit)} as the only digit for row ${f.row}, column ${f.column}.`,
  },
  hiddenSingle: {
    nudge: (u) => `Look for a hidden single in ${unitName(u)}.`,
    explain: hiddenSingleExplain,
    conclude: hiddenSingleConclude,
  },
  nakedPair: {
    nudge: (u) => `Look for a naked pair in ${unitName(u)}.`,
    explain: (f) => sentence(pairLead(f)),
    lead: pairLead,
  },
  pointing: {
    nudge: (u) => `Look for pointing in ${unitName(u)}.`,
    explain: (f) => sentence(pointingLead(f)),
    lead: pointingLead,
  },
  claiming: {
    nudge: (u) => `Look for claiming in ${unitName(u)}.`,
    explain: (f) => sentence(claimingLead(f)),
    lead: claimingLead,
  },
}

/**
 * A chain's explanation in at most two sentences: the elimination clauses joined
 * with ", and", then the closing placement line.
 */
export function explainChain(leads: readonly string[], conclusion: string): string {
  if (leads.length === 0) return conclusion
  return `${sentence(leads.join(', and '))} ${conclusion}`
}
