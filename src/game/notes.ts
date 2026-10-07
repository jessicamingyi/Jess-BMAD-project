/** Notes are nine-bit masks: bit d−1 set means Note d. */

export const hasNote = (mask: number, digit: number): boolean => (mask & (1 << (digit - 1))) !== 0

export const toggleNote = (mask: number, digit: number): number => (mask ^ (1 << (digit - 1))) & 0x1ff

/** The Note digits in a mask, ascending. */
export function noteDigits(mask: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (hasNote(mask, d)) out.push(d)
  return out
}
