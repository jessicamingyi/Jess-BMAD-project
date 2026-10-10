/**
 * `vite preview` as a child process for the smoke suite: serves `dist/` (or another
 * built copy, for the update journey) under the app's base path on a fixed port.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { killTree, sleep } from './cdp.ts'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const BASE_PATH = '/Jess-BMAD-project/'
const VITE_BIN = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))

/** A port that was free a moment ago (the server then binds it with --strictPort). */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      srv.close(() => resolve(port))
    })
  })
}

export class PreviewServer {
  readonly port: number
  readonly url: string
  private proc: ChildProcess | null = null
  private output = ''

  constructor(port: number) {
    this.port = port
    this.url = `http://127.0.0.1:${port}${BASE_PATH}`
  }

  /** Start serving `outDir` (default: the project's dist/) and wait until it answers. */
  async start(outDir?: string): Promise<void> {
    if (this.proc) await this.stop()
    this.output = ''
    const args = [VITE_BIN, 'preview', '--host', '127.0.0.1', '--port', String(this.port), '--strictPort']
    if (outDir) args.push('--outDir', outDir)
    const proc = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
    this.proc = proc
    proc.stdout?.on('data', (d) => (this.output += String(d)))
    proc.stderr?.on('data', (d) => (this.output += String(d)))
    const end = Date.now() + 20_000
    while (Date.now() < end) {
      if (proc.exitCode !== null) throw new Error(`vite preview exited (${proc.exitCode}):\n${this.output}`)
      try {
        const r = await fetch(this.url)
        if (r.ok) return
      } catch {
        // Not listening yet.
      }
      await sleep(150)
    }
    throw new Error(`vite preview did not answer on ${this.url}:\n${this.output}`)
  }

  async stop(): Promise<void> {
    const proc = this.proc
    this.proc = null
    if (!proc || proc.exitCode !== null) return
    const exited = new Promise<void>((r) => proc.once('exit', () => r()))
    killTree(proc)
    await Promise.race([exited, sleep(5000)])
  }
}
