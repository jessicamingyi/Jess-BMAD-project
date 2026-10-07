import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { mistakeCells } from '../../src/engine/mistakes.ts'

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
const put = (digits: string, cell: number, d: string) => digits.slice(0, cell) + d + digits.slice(cell + 1)
const wrong = (cell: number) => String((Number(solution[cell]) % 9) + 1)

describe('engine/mistakes', () => {
  it('returns 81 false flags for the Givens alone', () => {
    const flags = mistakeCells(givens, givens, solution)
    expect(flags).toHaveLength(81)
    expect(flags.every((f) => f === false)).toBe(true)
  })

  it('flags only a player digit that differs from the solution', () => {
    const [a, b] = emptyCells
    let digits = put(givens, a, wrong(a))
    digits = put(digits, b, solution[b])
    const flags = mistakeCells(givens, digits, solution)
    expect(flags.flatMap((f, i) => (f ? [i] : []))).toEqual([a])
  })

  it('never flags a Given, even if the digits string disagrees with the solution there', () => {
    const given = givens.indexOf('5')
    const digits = put(givens, given, wrong(given))
    expect(mistakeCells(givens, digits, solution)[given]).toBe(false)
  })

  it('never flags empty cells', () => {
    expect(mistakeCells(givens, givens, solution).some(Boolean)).toBe(false)
  })

  it('a full correct grid has no Mistakes', () => {
    expect(mistakeCells(givens, solution, solution).some(Boolean)).toBe(false)
  })
})
