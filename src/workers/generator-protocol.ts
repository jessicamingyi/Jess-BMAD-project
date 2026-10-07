import { generate, type Difficulty, type GeneratedPuzzle } from '../engine/index.ts'

/** Posted by the UI shell. The shell owns both the request id and the seed. */
export type GenerateRequest = {
  readonly requestId: number
  readonly seed: number
  readonly difficulty: Difficulty
}

export type GenerateReply =
  | { readonly requestId: number; readonly ok: true; readonly puzzle: GeneratedPuzzle }
  | { readonly requestId: number; readonly ok: false }

/** Pure: run the generator for one request. Any throw becomes `ok: false`, never an exception. */
export function handleGenerateRequest(req: GenerateRequest): GenerateReply {
  const requestId = req?.requestId
  try {
    const result = generate(req.seed, req.difficulty)
    return result.ok ? { requestId, ok: true, puzzle: result.puzzle } : { requestId, ok: false }
  } catch {
    return { requestId, ok: false }
  }
}
