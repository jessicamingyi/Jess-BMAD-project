import { useCallback, useEffect, useRef } from 'react'
import type { Action, Difficulty } from '../game/types.ts'
import type { GenerateReply, GenerateRequest } from '../workers/generator-protocol.ts'

/** The slice of `Worker` the hook uses; tests pass a fake. */
export type GeneratorWorker = {
  postMessage(message: GenerateRequest): void
  addEventListener(type: string, listener: (event: Event) => void): void
  terminate(): void
}

export type GeneratorWorkerFactory = () => GeneratorWorker

/** The real module worker: a separate same-origin chunk (CSP default-src 'self' allows it). */
export const createGeneratorWorker: GeneratorWorkerFactory = () =>
  new Worker(new URL('../workers/generator-worker.ts', import.meta.url), { type: 'module' })

/**
 * Free Play generation off the main thread. `start(difficulty)` takes the next
 * request id and a fresh seed, dispatches `freePlayRequested`, then posts the
 * request. Replies become `freePlayGenerated` / `freePlayFailed`; a worker
 * `error` or `messageerror` terminates that worker and becomes `freePlayFailed`
 * for the latest id (the reducer drops stale ids). The worker is created on
 * first use and terminated on unmount.
 */
export function useGenerator(
  dispatch: (action: Action) => void,
  createWorker: GeneratorWorkerFactory = createGeneratorWorker,
): (difficulty: Difficulty) => void {
  const workerRef = useRef<GeneratorWorker | null>(null)
  const lastId = useRef(0)

  useEffect(
    () => () => {
      workerRef.current?.terminate()
      workerRef.current = null
    },
    [],
  )

  return useCallback(
    (difficulty: Difficulty) => {
      const requestId = ++lastId.current
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]
      dispatch({ type: 'freePlayRequested', requestId, difficulty })
      try {
        if (!workerRef.current) {
          const worker = createWorker()
          worker.addEventListener('message', (event) => {
            const reply = (event as MessageEvent<GenerateReply>).data
            if (reply.ok) dispatch({ type: 'freePlayGenerated', requestId: reply.requestId, puzzle: reply.puzzle })
            else dispatch({ type: 'freePlayFailed', requestId: reply.requestId })
          })
          // A broken worker is dropped; the next start creates a fresh one.
          const onBroken = () => {
            worker.terminate()
            if (workerRef.current === worker) workerRef.current = null
            dispatch({ type: 'freePlayFailed', requestId: lastId.current })
          }
          worker.addEventListener('error', onBroken)
          worker.addEventListener('messageerror', onBroken)
          workerRef.current = worker
        }
        const request: GenerateRequest = { requestId, seed, difficulty }
        workerRef.current.postMessage(request)
      } catch {
        // A worker that can't start or accept the request becomes the calm inline line.
        dispatch({ type: 'freePlayFailed', requestId })
      }
    },
    [dispatch, createWorker],
  )
}
