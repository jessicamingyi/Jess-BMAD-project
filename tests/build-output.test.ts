import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASE = '/Jess-BMAD-project/'

describe('production build output', () => {
  let outDir: string
  let html: string
  let assets: { name: string; source: string }[]

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'traveller-sudoku-build-'))
    await build({
      root: ROOT,
      configFile: join(ROOT, 'vite.config.ts'),
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    })
    html = readFileSync(join(outDir, 'index.html'), 'utf8')
    assets = readdirSync(join(outDir, 'assets'))
      .filter((name) => /\.(?:css|js)$/.test(name))
      .map((name) => ({ name, source: readFileSync(join(outDir, 'assets', name), 'utf8') }))
  }, 120_000)

  afterAll(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true })
  })

  it('keeps the exact CSP meta', () => {
    expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`)
  })

  it('serves every src and href from the repository base path', () => {
    const urls = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1])
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(url, url).toMatch(new RegExp(`^${BASE}`))
    expect(urls.some((url) => url.startsWith(`${BASE}assets/`))).toBe(true)
  })

  it('emits the generator as a separate worker chunk under assets/, not inlined', () => {
    const worker = assets.filter((a) => /generator-worker.*\.js$/.test(a.name))
    expect(worker.map((a) => a.name)).toHaveLength(1)
    const [chunk] = worker
    const entry = assets.filter((a) => /^index-.*\.js$/.test(a.name))
    expect(entry).toHaveLength(1)
    const [main] = entry
    // Generator-only marker: mulberry32's increment 0x6d2b79f5 (emitted as 1831565813). It is in
    // the worker chunk and never in the main entry chunk, so generation can't run on the main thread.
    const MULBERRY32 = /1831565813|0x6d2b79f5/i
    expect(chunk.source).toMatch(MULBERRY32)
    expect(main.source).not.toMatch(MULBERRY32)
    // The app's own worker wiring: the main chunk loads the worker as a same-origin file under
    // assets/, and the worker chunk itself holds no Blob or data: JavaScript.
    expect(main.source).toContain(`new Worker(new URL(\`${BASE}assets/${chunk.name}\``)
    expect(chunk.source).not.toMatch(/\bnew Blob\(|data:(?:application|text)\/javascript/i)
  })

  it('inlines nothing as data: URIs', () => {
    expect(html).not.toContain('data:')
    expect(assets.some((a) => a.name.endsWith('.css'))).toBe(true)
    for (const { name, source } of assets) {
      if (name.endsWith('.css')) expect(source, name).not.toContain('data:')
      else expect(source, name).not.toMatch(/["'`]data:[a-z]+\/[a-z0-9.+-]+[;,]/i)
    }
  })
})
