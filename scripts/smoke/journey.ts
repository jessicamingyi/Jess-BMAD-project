/** Shared journey types and app-specific helpers for the smoke suite. */
import { CITIES } from '../../src/content/cities.ts'
import { CITY_PUZZLES } from '../../src/content/city-puzzles.ts'
import { copy } from '../../src/content/copy.ts'
import { byText, sleep, type Context, type Page } from './cdp.ts'
import type { PreviewServer } from './server.ts'

export type JourneyContext = {
  /** The app's URL (base path included). */
  readonly url: string
  /** A fresh browser context for this journey: empty storage, no service worker. */
  readonly browser: Context
  readonly server: PreviewServer
  /** Throw this to report the journey as SKIPPED. */
  skip: (reason: string) => never
}

export type Journey = {
  readonly name: string
  readonly run: (ctx: JourneyContext) => Promise<void>
  /** Per-journey timeout (ms); default 45 s. */
  readonly timeout?: number
}

export class Skip extends Error {}

export function check(ok: unknown, message: string): void {
  if (!ok) throw new Error(message)
}

export const GRID_CELLS = `document.querySelectorAll('[role=gridcell]')`
export const cell = (i: number): string => `${GRID_CELLS}[${i}]`
export const navButton = (label: string): string => byText('nav button, nav a', label)
export const gotIt = (): string => byText('button', copy.bannerGotIt)

/** A City by name, with its pre-built Puzzle. */
export function city(name: string): { id: string; name: string; country: string; line: string; givens: string; solution: string } {
  const c = CITIES.find((x) => x.name === name)
  if (!c) throw new Error(`No City named ${name}`)
  const p = CITY_PUZZLES.find((x) => x.cityId === c.id)
  if (!p) throw new Error(`No Puzzle for ${c.id}`)
  return { id: c.id, name: c.name, country: c.country, line: c.line, givens: p.givens, solution: p.solution }
}

/** Indices of the cells a Puzzle leaves empty. */
export const emptyCells = (givens: string): number[] => [...givens].flatMap((d, i) => (d === '0' ? [i] : []))

export const cellLabel = (page: Page, i: number): Promise<string> => page.eval<string>(`${cell(i)}.getAttribute('aria-label')`)

export const countEmpty = (page: Page): Promise<number> =>
  page.eval<number>(`[...${GRID_CELLS}].filter(c=>c.getAttribute('aria-label').includes(', empty')).length`)

/** Wait until the app has started and rendered (after a navigation or reload). */
export async function rendered(page: Page): Promise<void> {
  await page.waitFor(`document.documentElement.dataset.ready !== undefined && document.querySelector('nav')`, 'app rendered', 10_000)
}

/** Load the app and wait until it has rendered. */
export async function open(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await rendered(page)
}

/** From anywhere: Album, then the Near City's "Travel here" slot; waits for its grid. */
export async function travelTo(page: Page, name: string): Promise<void> {
  const c = city(name)
  if (!(await page.eval<boolean>(`!!document.querySelector('[aria-label^=${JSON.stringify(`${c.name}, ${c.country}, Near`)}]')`))) {
    await page.click(navButton(copy.navAlbum))
  }
  const slot = `document.querySelector('[aria-label^=${JSON.stringify(`${c.name}, ${c.country}, Near`)}]')`
  await page.waitFor(slot, `${c.name} slot in the Album`)
  await page.click(slot)
  await page.waitFor(`${GRID_CELLS}.length===81 && document.body.innerText.includes(${JSON.stringify(c.name)})`, `${c.name} grid`)
}

/** Select a cell with the mouse and type a digit. */
export async function placeDigit(page: Page, i: number, digit: string): Promise<void> {
  await page.click(cell(i), 30)
  await page.type(digit)
}

export { sleep }
