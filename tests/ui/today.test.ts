import { describe, expect, it } from 'vitest'
import { localDate } from '../../src/ui/today.ts'

describe('localDate', () => {
  it('formats the local calendar date as YYYY-MM-DD, zero-padded', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(localDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})
