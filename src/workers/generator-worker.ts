import { handleGenerateRequest, type GenerateRequest } from './generator-protocol.ts'

/** Web Worker entry: one request in, one reply out. Generation never runs on the main thread. */
self.addEventListener('message', (event: MessageEvent<GenerateRequest>) => {
  self.postMessage(handleGenerateRequest(event.data))
})
