import { describe, expect, it } from 'vitest'
import { handleGenerateRequest, type GenerateRequest } from '../../src/workers/generator-protocol.ts'

describe('workers/generator-protocol', () => {
  it('wraps generate and echoes the request id', () => {
    // One generation only (seed 6 is a fast pinned Easy seed); the generator itself is covered in tests/engine.
    const reply = handleGenerateRequest({ requestId: 7, seed: 6, difficulty: 'easy' })
    expect(reply).toMatchObject({ requestId: 7, ok: true, puzzle: { difficulty: 'easy' } })
    expect(Object.keys(reply).sort()).toEqual(['ok', 'puzzle', 'requestId'])
  })

  it('a generator failure becomes ok: false with the id', () => {
    expect(handleGenerateRequest({ requestId: 3, seed: 1, difficulty: 'nope' } as unknown as GenerateRequest)).toEqual({
      requestId: 3,
      ok: false,
    })
  })

  it('a throw (malformed request) becomes ok: false, never an exception', () => {
    expect(() => handleGenerateRequest(null as unknown as GenerateRequest)).not.toThrow()
    expect(handleGenerateRequest(null as unknown as GenerateRequest).ok).toBe(false)
  })
})
