import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TECHNIQUE_TEXT } from '../src/content/techniques.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASE = '/Jess-BMAD-project/'

describe('production build output', () => {
  let outDir: string
  let html: string
  let assets: { name: string; source: string }[]
  let sw: string
  /** The service worker's precache list: URLs relative to the base. */
  let precached: string[]

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
    sw = readFileSync(join(outDir, 'sw.js'), 'utf8')
    precached = [...sw.matchAll(/\{url:"([^"]+)",revision:/g)].map((m) => m[1])
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

  describe('offline (service worker and manifest)', () => {
    it('emits sw.js and manifest.webmanifest; index.html links the manifest and has no inline script', () => {
      expect(existsSync(join(outDir, 'sw.js'))).toBe(true)
      expect(existsSync(join(outDir, 'manifest.webmanifest'))).toBe(true)
      expect(html).toContain(`<link rel="manifest" href="${BASE}manifest.webmanifest">`)
      // Registration is bundled code (injectRegister: false): every script has a src.
      for (const tag of html.match(/<script\b[^>]*>/g) ?? []) expect(tag).toMatch(/\ssrc="/)
      expect(html).not.toContain('registerSW')
    })

    it('precaches index.html, every built JS and CSS asset, the generator worker, the manifest and its icons', () => {
      expect(precached).toContain('index.html')
      expect(precached).toContain('manifest.webmanifest')
      expect(precached).toContain('favicon.svg')
      expect(assets.length).toBeGreaterThan(0)
      for (const { name } of assets) expect(precached, name).toContain(`assets/${name}`)
      expect(precached.some((url) => /^assets\/generator-worker-.*\.js$/.test(url))).toBe(true)
      // Every precached file exists in the build, listed once.
      for (const url of precached) expect(existsSync(join(outDir, url)), url).toBe(true)
      expect(new Set(precached).size).toBe(precached.length)
    })

    it('precaches every file in the build but the service worker and the Workbox runtime it imports', () => {
      const files = (readdirSync(outDir, { recursive: true, withFileTypes: true }) as import('node:fs').Dirent[])
        .filter((d) => d.isFile())
        .map((d) => relative(outDir, join(d.parentPath, d.name)).split(sep).join('/'))
        .filter((f) => f !== 'sw.js' && !/^workbox-[^/]*\.js$/.test(f))
      // index.html, manifest, favicon, main JS, CSS, generator worker, workbox-window at least:
      // guards the regex that reads the list from going silently empty.
      expect(files.length).toBeGreaterThanOrEqual(7)
      expect(precached.length).toBeGreaterThanOrEqual(files.length)
      for (const file of files) expect(precached, file).toContain(file)
    })

    it('the shipped bundle registers the service worker at the base: sw.js, scope the base', () => {
      const js = assets.filter((a) => a.name.endsWith('.js'))
      expect(js.some((a) => a.source.includes('serviceWorker.register'))).toBe(true)
      const registering = js.filter((a) => a.source.includes(`${BASE}sw.js`))
      expect(registering.length).toBeGreaterThan(0)
      expect(registering.some((a) => new RegExp(`scope:\\s*["'\`]${BASE}["'\`]`).test(a.source))).toBe(true)
      for (const { name } of registering) expect(precached).toContain(`assets/${name}`)
    })

    it('every Technique text is inside a precached JS chunk', () => {
      const js = assets.filter((a) => a.name.endsWith('.js') && precached.includes(`assets/${a.name}`))
      for (const { definition } of Object.values(TECHNIQUE_TEXT)) {
        expect(js.some((a) => a.source.includes(definition)), definition).toBe(true)
      }
    })

    it('the City catalogue and City Puzzles are inside a precached JS chunk', () => {
      const holding = assets.filter((a) => a.name.endsWith('.js') && a.source.includes('europe-near-1'))
      expect(holding.length).toBeGreaterThan(0)
      for (const { name } of holding) expect(precached).toContain(`assets/${name}`)
    })

    it('no runtime caching, no cross-origin URL, no skipWaiting/clientsClaim at install, no IndexedDB', () => {
      // The only route is the navigation fallback to index.html.
      expect(sw.match(/registerRoute\(/g)).toHaveLength(1)
      expect(sw).toMatch(/registerRoute\(new \w+\.NavigationRoute\(\w+\.createHandlerBoundToURL\("index\.html"\)\)\)/)
      expect(sw).not.toMatch(/https?:\/\//)
      for (const url of precached) expect(url, url).not.toMatch(/^(?:[a-z]+:)?\/\//i)
      expect(sw).not.toContain('clientsClaim')
      // skipWaiting runs only on an explicit SKIP_WAITING message, which the app never sends.
      expect(sw.match(/skipWaiting\(\)/g)).toHaveLength(1)
      expect(sw).toMatch(/"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)/)
      const runtimes = readdirSync(outDir).filter((name) => /^workbox-.*\.js$/.test(name))
      expect(runtimes.length).toBeGreaterThan(0)
      for (const file of ['sw.js', ...runtimes]) expect(readFileSync(join(outDir, file), 'utf8'), file).not.toMatch(/indexedDB/i)
    })

    it('manifest: Traveller Sudoku, start_url and scope at the base, self-hosted SVG icons, Daylight colours', () => {
      const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.webmanifest'), 'utf8'))
      expect(manifest.name).toBe('Traveller Sudoku')
      expect(manifest.short_name).toBe('Traveller Sudoku')
      expect(manifest.start_url).toBe(BASE)
      expect(manifest.scope).toBe(BASE)
      expect(manifest.background_color).toBe('#F5EFDF')
      expect(manifest.theme_color).toBe('#F5EFDF')
      expect(manifest.icons.length).toBeGreaterThan(0)
      for (const icon of manifest.icons) {
        expect(icon.src).not.toMatch(/^(?:[a-z]+:)?\/\//i)
        expect(icon.sizes).toBe('any')
        expect(icon.type).toBe('image/svg+xml')
        expect(existsSync(join(outDir, icon.src)), icon.src).toBe(true)
      }
    })
  })
})
