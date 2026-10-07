/**
 * How many of each digit are still to place. Index 1–9 holds the count for that
 * digit (index 0 is unused and always 0). Mistakes count as placed; never below 0.
 */
export function remainingByDigit(digits: string): number[] {
  const placed = Array.from({ length: 10 }, () => 0)
  for (const ch of digits) {
    const d = ch.charCodeAt(0) - 48
    if (d >= 1 && d <= 9) placed[d]++
  }
  return placed.map((n, d) => (d === 0 ? 0 : Math.max(0, 9 - n)))
}
