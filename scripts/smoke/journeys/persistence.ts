import { copy } from '../../../src/content/copy.ts'
import { byText, type Page } from '../cdp.ts'
import {
  cell,
  cellLabel,
  check,
  city,
  emptyCells,
  GRID_CELLS,
  navButton,
  open,
  rendered,
  placeDigit,
  sleep,
  travelTo,
  type Journey,
} from '../journey.ts'

/**
 * Where the app keeps its save: idb-keyval's default database and store, key `SAVE_KEY`
 * in src/persistence/store.ts. (scripts/ may not import persistence; keep in step by hand.)
 */
const DB = 'keyval-store'
const STORE = 'keyval'
const SAVE_KEY = 'traveller-save'
const GARBAGE = 'not json at all {{{'

/** Run `body` (JS with `db` in scope, resolving through `res`) against the app's database, in the page. */
function withDb<T>(page: Page, body: string): Promise<T> {
  return page.eval<T>(
    `new Promise((res,rej)=>{const q=indexedDB.open(${JSON.stringify(DB)});q.onerror=()=>rej(q.error);q.onupgradeneeded=()=>q.result.createObjectStore(${JSON.stringify(STORE)});q.onsuccess=()=>{const db=q.result;try{${body}}catch(e){db.close();rej(e)}}})`,
  )
}

const lamplightOn = (page: Page): Promise<boolean> => page.eval<boolean>(`document.documentElement.dataset.theme==='lamplight'`)

export const reloadRestore: Journey = {
  name: 'Reload restore: digits, Notes and Lamplight survive; Undo empty',
  async run({ browser, url }) {
    const page = await browser.newPage()
    await open(page, url)
    const paris = city('Paris')
    await travelTo(page, paris.name)
    const [a, b, c] = emptyCells(paris.givens)
    await placeDigit(page, a, paris.solution[a])
    await placeDigit(page, b, paris.solution[b])
    await page.click(cell(c), 30)
    await page.type('n')
    await page.type('2')
    await page.type('8')
    await page.type('n')

    await page.click(navButton(copy.navSettings))
    const lamp = `[...document.querySelectorAll('[role=switch]')].find(s=>s.parentElement.innerText.includes(${JSON.stringify(copy.settingLamplight)}))`
    await page.waitFor(lamp, 'Lamplight switch')
    await page.click(lamp)
    await page.waitFor(`document.documentElement.dataset.theme==='lamplight'`, 'Lamplight applied')
    await page.click(navButton(copy.navPuzzle))
    await page.waitFor(`${GRID_CELLS}.length===81`, 'Puzzle screen')

    const before = await Promise.all([a, b, c].map((i) => cellLabel(page, i)))
    check(before[2].includes('notes 2, 8'), `Notes not added: ${before[2]}`)
    await sleep(800)
    await page.reload()
    await rendered(page)
    await page.waitFor(`${GRID_CELLS}.length===81`, 'Puzzle restored after reload')
    const after = await Promise.all([a, b, c].map((i) => cellLabel(page, i)))
    check(JSON.stringify(after) === JSON.stringify(before), `cells differ after reload: ${JSON.stringify(before)} vs ${JSON.stringify(after)}`)
    check(await lamplightOn(page), 'Lamplight off after reload')
    // Undo history is not saved: Ctrl/Cmd+Z and the Undo button change nothing.
    await page.click(cell(a), 30)
    await page.undo()
    await page.click(byText('button', copy.undo))
    const undone = await Promise.all([a, b, c].map((i) => cellLabel(page, i)))
    check(JSON.stringify(undone) === JSON.stringify(before), `Undo changed restored cells: ${JSON.stringify(undone)}`)
  },
}

export const twoTabs: Journey = {
  name: 'Two tabs: second tab read-only and inert; first tab still saves',
  async run({ browser, url }) {
    const first = await browser.newPage()
    await open(first, url)
    const london = city('London')
    await travelTo(first, london.name)

    const second = await browser.newPage()
    await open(second, url)
    await second.waitFor(`document.body.innerText.includes(${JSON.stringify(copy.bannerOtherTab)})`, 'other-tab banner')
    await second.waitFor(`${GRID_CELLS}.length===81`, 'second tab shows the Puzzle')
    const inert = await second.eval<boolean>(
      `(()=>{let e=document.querySelector('[role=grid]'); while(e){ if(e.inert) return true; e=e.parentElement } return false})()`,
    )
    check(inert, 'second tab grid is not inert')
    const [a, b] = emptyCells(london.givens)
    const untouched = await cellLabel(second, a)
    await second.click(cell(a)).catch(() => {})
    await second.type(london.solution[a])
    check((await cellLabel(second, a)) === untouched, 'second tab accepted a digit')

    await first.send('Page.bringToFront')
    await placeDigit(first, b, london.solution[b])
    const placed = await cellLabel(first, b)
    check(placed.includes('your digit'), `first tab did not place a digit: ${placed}`)
    check(!(await first.hasText(copy.bannerOtherTab)), 'first tab shows the other-tab banner')
    await sleep(800)
    // The first tab's write reached storage: its digit is back after a reload.
    await second.close()
    await first.reload()
    await rendered(first)
    await first.waitFor(`${GRID_CELLS}.length===81`, 'first tab Puzzle after reload')
    check((await cellLabel(first, b)) === placed, "first tab's digit was not saved")
  },
}

export const corruptData: Journey = {
  name: 'Corrupt data: unreadable notice, kept safe, fresh start',
  async run({ browser, url }) {
    const page = await browser.newPage()
    await open(page, url)
    const paris = city('Paris')
    await travelTo(page, paris.name)
    const [a] = emptyCells(paris.givens)
    await placeDigit(page, a, paris.solution[a])
    await sleep(800)
    // Write the garbage from a same-origin page where the app isn't running, so no app write can race it.
    await page.send('Network.setBypassServiceWorker', { bypass: true })
    await page.goto(`${url}favicon.svg`)
    const readSave = () =>
      withDb<unknown>(page, `const g=db.transaction(${JSON.stringify(STORE)}).objectStore(${JSON.stringify(STORE)}).get(${JSON.stringify(SAVE_KEY)});g.onsuccess=()=>{db.close();res(g.result)}`)
    const before = await readSave()
    check(before && typeof before === 'object', 'no save to corrupt')
    await withDb<string>(
      page,
      `const tx=db.transaction(${JSON.stringify(STORE)},'readwrite');tx.objectStore(${JSON.stringify(STORE)}).put(${JSON.stringify(GARBAGE)},${JSON.stringify(SAVE_KEY)});tx.oncomplete=()=>{db.close();res('ok')};tx.onerror=()=>{db.close();rej(tx.error)}`,
    )
    await sleep(300)
    const now = await readSave()
    check(now === GARBAGE, `garbage was overwritten before the app loaded: ${JSON.stringify(now).slice(0, 120)}`)
    await page.send('Network.setBypassServiceWorker', { bypass: false })
    await open(page, url)
    await page.waitFor(`document.body.innerText.includes(${JSON.stringify(copy.bannerUnreadable)})`, 'unreadable notice')
    check(await page.hasText(copy.albumHeadingEmpty), 'game did not start fresh (no empty Album)')
    const travel = copy.slotLabel(paris.name, paris.country, 'near', copy.slotTravel)
    check(await page.eval<boolean>(`!!document.querySelector('[aria-label=${JSON.stringify(travel)}]')`), 'Paris still in progress after a fresh start')
    const keys = await withDb<[string, unknown][]>(
      page,
      `const s=db.transaction(${JSON.stringify(STORE)}).objectStore(${JSON.stringify(STORE)});const t=s.getAll();const k=s.getAllKeys();k.onsuccess=()=>{db.close();res(k.result.map((key,i)=>[String(key),t.result[i]]))}`,
    )
    const backup = keys.find(([k]) => k.startsWith(`${SAVE_KEY}-backup-`))
    check(backup, `unreadable data not backed up; keys: ${JSON.stringify(keys.map(([k]) => k))}`)
    check(backup?.[1] === GARBAGE, 'backup does not hold the unreadable data')
  },
}

export const storageUnavailable: Journey = {
  name: 'Storage unavailable: saving-off banner, still playable',
  async run({ browser, url }) {
    const page = await browser.newPage()
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `IDBFactory.prototype.open = function () { throw new DOMException('Blocked by the smoke test', 'InvalidStateError') }`,
    })
    await open(page, url)
    await page.waitFor(`document.body.innerText.includes(${JSON.stringify(copy.bannerSavingOff)})`, 'saving-off banner', 10_000)
    const paris = city('Paris')
    await travelTo(page, paris.name)
    const [a] = emptyCells(paris.givens)
    await placeDigit(page, a, paris.solution[a])
    const label = await cellLabel(page, a)
    check(label.includes(`, ${paris.solution[a]}, your digit`), `digit not placed with saving off: ${label}`)
  },
}
