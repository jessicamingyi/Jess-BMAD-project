/**
 * Mistakes (glossary): a player digit that differs from the solution. Computed
 * from digits, Givens and solution only, never from Notes. Pure.
 *
 * All three are 81-char digit strings, cells 0–80 row-major, 0 = empty.
 * Returns 81 flags: true only for a non-Given, non-empty digit ≠ solution.
 */
export function mistakeCells(givens: string, digits: string, solution: string): readonly boolean[] {
  const out: boolean[] = []
  for (let cell = 0; cell < 81; cell++) {
    const d = digits[cell] ?? '0'
    out.push(givens[cell] === '0' && d !== '0' && d !== solution[cell])
  }
  return out
}
