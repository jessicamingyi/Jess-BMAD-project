/**
 * End-to-end smoke suite (TS-45): `npm run smoke` builds, then runs this. Serves dist/
 * with `vite preview`, drives a locally installed Chrome or Edge headless over the
 * DevTools Protocol (set CHROME_PATH to pick one), and runs each journey in a fresh
 * browser context. Any console error or uncaught exception fails the journey; a failing
 * journey leaves a screenshot in smoke-results/. Exits 1 if any journey failed.
 *
 * `node scripts/smoke/run.ts [filter]` runs only the journeys whose name contains `filter`.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { Browser, type Context } from './cdp.ts'
import { Skip, type Journey } from './journey.ts'
import { firstLaunch } from './journeys/first-launch.ts'
import { offline, updateBanner } from './journeys/offline.ts'
import { corruptData, reloadRestore, storageUnavailable, twoTabs } from './journeys/persistence.ts'
import { freePlay, play, postcard } from './journeys/play.ts'
import { freePort, PreviewServer, ROOT } from './server.ts'

/** In order; the update journey swaps the served build, so it runs last. */
const JOURNEYS: readonly Journey[] = [
  firstLaunch,
  play,
  postcard,
  freePlay,
  reloadRestore,
  twoTabs,
  offline,
  corruptData,
  storageUnavailable,
  updateBanner,
]

const RESULTS = join(ROOT, 'smoke-results')
const DEFAULT_TIMEOUT = 45_000

type Outcome = 'PASS' | 'FAIL' | 'SKIPPED'

function slug(i: number, name: string): string {
  const words = name.split(':')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${String(i + 1).padStart(2, '0')}-${words}`
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`journey timed out after ${ms / 1000}s`)), ms)
  })
  // An abandoned journey's later rejections are not ours to report.
  work.catch(() => {})
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

async function screenshots(context: Context, base: string): Promise<string[]> {
  const files: string[] = []
  for (const [n, page] of context.pages.entries()) {
    if (page.closed) continue
    const file = join(RESULTS, `${base}${context.pages.length > 1 ? `-tab${n + 1}` : ''}.png`)
    try {
      await withTimeout(page.screenshot(file), 5000)
      files.push(file)
    } catch {
      // The page may be gone.
    }
  }
  return files
}

async function runJourney(browser: Browser, server: PreviewServer, journey: Journey, index: number): Promise<{ outcome: Outcome; detail: string }> {
  const context = await browser.newContext()
  try {
    await withTimeout(
      journey.run({
        url: server.url,
        browser: context,
        server,
        skip: (reason: string) => {
          throw new Skip(reason)
        },
      }),
      journey.timeout ?? DEFAULT_TIMEOUT,
    )
    if (context.errors.length > 0) throw new Error(`console errors:\n      ${context.errors.join('\n      ')}`)
    return { outcome: 'PASS', detail: '' }
  } catch (e) {
    if (e instanceof Skip) return { outcome: 'SKIPPED', detail: e.message }
    const message = e instanceof Error ? e.message : String(e)
    const errors = context.errors.length > 0 && !message.startsWith('console errors') ? `\n      console errors: ${context.errors.join(' | ')}` : ''
    const shots = await screenshots(context, slug(index, journey.name))
    const where = shots.length > 0 ? `\n      screenshot: ${shots.join(', ')}` : ''
    return { outcome: 'FAIL', detail: `${message}${errors}${where}` }
  } finally {
    await context.dispose()
  }
}

async function main(filter: string | undefined): Promise<number> {
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.error('No dist/ build. Run `npm run smoke` (it builds first) or `npm run build`.')
    return 1
  }
  const journeys = JOURNEYS.map((j, i) => ({ j, i })).filter(({ j }) => !filter || j.name.toLowerCase().includes(filter.toLowerCase()))
  if (journeys.length === 0) {
    console.error(`No journey matches "${filter}".`)
    return 1
  }
  mkdirSync(RESULTS, { recursive: true })
  for (const f of readdirSync(RESULTS)) if (f.endsWith('.png')) rmSync(join(RESULTS, f), { force: true })

  const started = Date.now()
  const server = new PreviewServer(await freePort())
  let browser: Browser | null = null
  const cleanup = async () => {
    await browser?.close()
    await server.stop()
  }
  const onSignal = () => {
    void cleanup().finally(() => process.exit(130))
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  const counts: Record<Outcome, number> = { PASS: 0, FAIL: 0, SKIPPED: 0 }
  try {
    await server.start()
    console.log(`Serving dist/ at ${server.url}`)
    browser = await Browser.launch()
    for (const { j, i } of journeys) {
      const t0 = Date.now()
      const { outcome, detail } = await runJourney(browser, server, j, i)
      counts[outcome]++
      const secs = ((Date.now() - t0) / 1000).toFixed(1)
      console.log(`${outcome.padEnd(7)} ${String(i + 1).padStart(2)}. ${j.name} (${secs}s)${detail ? `\n      ${detail}` : ''}`)
    }
  } catch (e) {
    console.error(`Smoke run aborted: ${e instanceof Error ? e.message : String(e)}`)
    counts.FAIL++
  } finally {
    await cleanup()
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
  }
  const total = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\n${counts.PASS} passed, ${counts.FAIL} failed, ${counts.SKIPPED} skipped in ${total}s`)
  return counts.FAIL > 0 ? 1 : 0
}

process.exitCode = await main(process.argv[2])
