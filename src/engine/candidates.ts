import { PEERS, type Grid } from './grid.ts'

/** All nine digits as a mask (bit d−1 = d). */
export const ALL_DIGITS = 0x1ff

export const bit = (digit: number): number => 1 << (digit - 1)

export function popcount(mask: number): number {
  let n = 0
  for (let m = mask; m !== 0; m &= m - 1) n++
  return n
}

/** Digits in a mask, ascending. */
export function digitsOf(mask: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d)
  return out
}

/**
 * Candidates (glossary) from digits only, never from Notes: 81 masks, bit d−1 = d.
 * A filled cell is 0; an empty cell holds every digit not already in a peer.
 */
export function computeCandidates(grid: Grid): number[] {
  return grid.map((value, cell) => {
    if (value !== 0) return 0
    let mask = ALL_DIGITS
    for (const peer of PEERS[cell]) {
      const d = grid[peer]
      if (d !== 0) mask &= ~bit(d)
    }
    return mask
  })
}
