import { describe, expect, it } from 'vitest'
import { createRng, shuffle } from '../../src/engine/random.ts'

const take = (rng: () => number, n: number) => Array.from({ length: n }, () => rng())

describe('engine/random', () => {
  it('repeats the same stream for the same seed', () => {
    expect(take(createRng(42), 20)).toEqual(take(createRng(42), 20))
  })

  it('differs between seeds', () => {
    expect(take(createRng(1), 5)).not.toEqual(take(createRng(2), 5))
  })

  it('yields floats in [0, 1), including for seed 0 and uint32 max', () => {
    for (const seed of [0, 1, 0xffffffff]) {
      for (const x of take(createRng(seed), 200)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(1)
      }
    }
  })

  it('shuffle is a repeatable permutation and leaves the input alone', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const a = shuffle(createRng(7), input)
    const b = shuffle(createRng(7), input)
    expect(a).toEqual(b)
    expect([...a].sort()).toEqual([...input])
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
