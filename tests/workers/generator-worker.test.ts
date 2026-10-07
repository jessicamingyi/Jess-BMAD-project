import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleGenerateRequest, type GenerateRequest } from '../../src/workers/generator-protocol.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('workers/generator-worker entry', () => {
  it('replies to a message with exactly handleGenerateRequest(event.data)', async () => {
    const listeners: Record<string, (event: { data: GenerateRequest }) => void> = {}
    const addEventListener = vi.fn((type: string, l: (event: { data: GenerateRequest }) => void) => {
      listeners[type] = l
    })
    const postMessage = vi.fn()
    vi.stubGlobal('self', { addEventListener, postMessage })

    await import('../../src/workers/generator-worker.ts')
    expect(addEventListener).toHaveBeenCalledTimes(1)
    expect(listeners.message).toBeTypeOf('function')

    const request: GenerateRequest = { requestId: 7, seed: 6, difficulty: 'easy' }
    listeners.message({ data: request })
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage.mock.calls[0]).toEqual([handleGenerateRequest(request)])
  })
})
