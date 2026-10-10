import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copy } from '../../../src/content/copy.ts'
import { removeDir, type Page } from '../cdp.ts'
import { ROOT } from '../server.ts'
import { cellLabel, check, city, emptyCells, gotIt, open, rendered, placeDigit, sleep, travelTo, type Journey } from '../journey.ts'
import { startFreePlay } from './play.ts'

/** Wait until the service worker is active, then reload so it controls the page. */
async function controlledBySw(page: Page): Promise<void> {
  await page.waitFor(
    `navigator.serviceWorker.getRegistration().then(r=>r?.active?.state==='activated')`,
    'service worker activated',
    15_000,
  )
  await page.reload()
  await rendered(page)
  await page.waitFor(`!!navigator.serviceWorker.controller`, 'page controlled by the service worker')
}

const network = (page: Page, offline: boolean): Promise<unknown> =>
  page.send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

export const offline: Journey = {
  name: 'Offline: loads, opens a City and generates Free Play with no network',
  timeout: 60_000,
  async run({ browser, url, server }) {
    const page = await browser.newPage()
    await open(page, url)
    await controlledBySw(page)
    // Both: the browser reports offline and nothing is listening.
    await server.stop()
    await network(page, true)
    try {
      check(await page.eval<boolean>(`navigator.onLine === false`), 'offline emulation not applied')
      await open(page, url)
      const london = city('London')
      await travelTo(page, london.name)
      const [a] = emptyCells(london.givens)
      await placeDigit(page, a, london.solution[a])
      check((await cellLabel(page, a)).includes('your digit'), 'digit not placed offline')
      await startFreePlay(page)
    } finally {
      await network(page, false).catch(() => {})
      await server.start()
    }
  },
}

/** A copy of dist/ that differs only in index.html (and its revision in sw.js): a new version for the service worker. */
function makeUpdatedDist(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ts-upd-'))
  cpSync(join(ROOT, 'dist'), dir, { recursive: true })
  const html = join(dir, 'index.html')
  writeFileSync(html, readFileSync(html, 'utf8') + '\n<!-- smoke: new version -->\n')
  const sw = join(dir, 'sw.js')
  const source = readFileSync(sw, 'utf8')
  const next = source.replace(/\{[^{}]*url:"index\.html"[^{}]*\}/, (entry) =>
    entry.replace(/revision:"[^"]*"/, 'revision:"smoke-new-version"'),
  )
  if (next === source) throw new Error('could not find index.html in the sw.js precache manifest')
  writeFileSync(sw, next)
  return dir
}

export const updateBanner: Journey = {
  name: 'Update: "new version is ready" banner, no self-reload',
  timeout: 60_000,
  async run({ browser, url, server }) {
    const page = await browser.newPage()
    await open(page, url)
    // Banners show one at a time and the first-launch storage notice outranks the update banner.
    await page.click(gotIt())
    await page.waitFor(`!document.body.innerText.includes(${JSON.stringify(copy.bannerStorageNotice)})`, 'storage notice dismissed')
    await controlledBySw(page)

    const updated = makeUpdatedDist()
    try {
      await server.start(updated)
      await page.reload()
      await rendered(page)
      await page.eval(`window.__smokeMarker = 'same page'`)
      let navigations = 0
      const off = page.on((method, params) => {
        if (method === 'Page.frameNavigated' && !params.frame.parentId) navigations++
      })
      await page.waitFor(`document.body.innerText.includes(${JSON.stringify(copy.bannerUpdateReady)})`, 'update banner', 20_000)
      await sleep(2000)
      off()
      check(navigations === 0, `page navigated ${navigations} time(s) after the update`)
      check((await page.eval<string>(`window.__smokeMarker`)) === 'same page', 'page reloaded itself')
    } finally {
      await server.start()
      removeDir(updated)
    }
  },
}
