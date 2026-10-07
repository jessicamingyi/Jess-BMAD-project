/**
 * Engine-local seeded PRNG (never Math.random). Pure: the same seed always
 * yields the same stream.
 */

/** mulberry32: a small, fast 32-bit generator. Returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A shuffled copy of `array` (Fisher–Yates driven by `rng`). The input is not changed. */
export function shuffle<T>(rng: () => number, array: readonly T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}
