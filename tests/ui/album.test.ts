// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CITIES, cityById } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createInitialState, createSession } from '../../src/game/session.ts'
import type { Album, AppState } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(resolve(process.cwd(), 'src/ui/album.css'), 'utf8')

let host: HTMLDivElement
let root: Root | null = null

function mount(initialState?: AppState) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(createElement(App, { initialState, today: '2026-10-06' })))
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host.remove()
})

const postcards = (...ids: string[]): Album => ids.map((cityId) => ({ cityId, collectedOn: '2026-10-06', revealed: true }))
const withAlbum = (album: Album): AppState => ({ ...createInitialState(), album })

const navLink = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const heading = () => host.querySelector<HTMLHeadingElement>('main h1')!
const tabs = () => [...host.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Regions"] button')]
const tab = (prefix: string) => tabs().find((b) => b.textContent!.startsWith(prefix))!
const slotList = () => host.querySelector<HTMLUListElement>('ul.album-slots')!
const slots = () => [...slotList().querySelectorAll<HTMLElement>(':scope > li > .album-slot')]
const slot = (id: string) => host.querySelector<HTMLElement>(`.album-slot[data-city="${id}"]`)!
const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!
const digits = () => [...host.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent).join('|')
const live = () => host.querySelector('[aria-live="polite"]')!.textContent

function press(key: string, init: KeyboardEventInit = {}, target: Element | null = document.activeElement) {
  act(() => {
    target!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  })
}

/** Every visible string and accessible name the page exposes (text, aria-label, title, alt). */
function exposed(): string {
  const names = [...host.querySelectorAll('*')].flatMap((el) =>
    ['aria-label', 'aria-description', 'title', 'alt', 'aria-valuetext'].map((a) => el.getAttribute(a) ?? ''),
  )
  return [host.textContent, ...names, document.title].join('\n')
}

describe('Album: first load', () => {
  it('opens on the Album: "Where to first?", Europe tab pressed, Album current in the nav', () => {
    mount()
    expect(heading().textContent).toBe('Where to first?')
    expect(heading().tabIndex).toBe(-1)
    expect(heading().className).toBe('album-heading')
    expect(navLink('Album').getAttribute('aria-current')).toBe('page')
    expect(navLink('Puzzle').getAttribute('aria-disabled')).toBe('true')
    expect(host.querySelector('[role="grid"]')).toBeNull()
  })

  it('Region tabs are native buttons with aria-pressed and counts', () => {
    mount()
    expect(tabs().map((b) => b.textContent)).toEqual(['Europe 0 / 10', 'Asia 0 / 10', 'The Americas 0 / 10'])
    expect(tabs().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
    for (const b of tabs()) expect(b.type).toBe('button')
  })

  it('shows the Region’s 10 slots Near → Mid → Far in a list labelled with the Region name', () => {
    mount()
    expect(slotList().getAttribute('aria-label')).toBe('Europe')
    expect(slots().map((s) => s.dataset.city)).toEqual(CITIES.filter((c) => c.region === 'europe').map((c) => c.id))
  })

  it('a tab switches Region; the list and pressed state follow', () => {
    mount()
    act(() => tab('Asia').click())
    expect(slotList().getAttribute('aria-label')).toBe('Asia')
    expect(tabs().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(slots().map((s) => s.dataset.city)).toEqual(CITIES.filter((c) => c.region === 'asia').map((c) => c.id))
    act(() => tab('The Americas').click())
    expect(slotList().getAttribute('aria-label')).toBe('The Americas')
    expect(slot('americas-near-1').textContent).toContain('New York')
  })
})

describe('Album: slot states', () => {
  it('Reachable: a button with City, "{country} · {Tier}" and "Travel here"', () => {
    mount()
    const paris = slot('europe-near-1')
    expect(paris.tagName).toBe('BUTTON')
    expect(paris.hasAttribute('aria-disabled')).toBe(false)
    expect(paris.textContent).toBe('ParisFrance · NearTravel here')
    expect(paris.getAttribute('aria-label')).toBe('Paris, France, Near — Travel here')
  })

  it('Locked: aria-disabled but focusable, no City name, the "Opens after…" line, and does nothing', () => {
    mount()
    const lisbon = slot('lisbon')
    expect(lisbon.tagName).toBe('BUTTON')
    expect(lisbon.getAttribute('aria-disabled')).toBe('true')
    expect((lisbon as HTMLButtonElement).disabled).toBe(false)
    expect(lisbon.tabIndex).toBe(0)
    expect(lisbon.textContent).toBe('Opens after 3 Near Postcards')
    expect(lisbon.getAttribute('aria-label')).toBe('Mid slot — opens after 3 Near Postcards, 0 of 3')
    expect(slot('europe-far-1').textContent).toBe('Opens after 3 Mid Postcards')
    expect(slot('europe-far-1').getAttribute('aria-label')).toBe('Far slot — opens after 3 Mid Postcards, 0 of 3')
    for (const c of CITIES.filter((c) => c.region === 'europe' && c.tier !== 'near')) {
      expect(slot(c.id).textContent, c.id).not.toContain(c.name)
      expect(slot(c.id).textContent, c.id).not.toContain(c.country)
    }
    act(() => lisbon.click())
    expect(heading().textContent).toBe('Where to first?')
    expect(host.querySelector('[role="grid"]')).toBeNull()
  })

  it('Mid opens at 3 Near Postcards; Collected is a static card with name, caption and its own line, no action', () => {
    mount(withAlbum(postcards('europe-near-1', 'europe-near-2', 'europe-near-3')))
    expect(heading().textContent).toBe('Where to next?')
    expect(tab('Europe').textContent).toBe('Europe 3 / 10')
    const paris = slot('europe-near-1')
    expect(paris.tagName).toBe('DIV')
    expect(paris.textContent).toBe(`ParisFrance · Near${cityById('europe-near-1')!.line}`)
    expect(paris.querySelector('.album-slot-line')!.textContent).toBe(cityById('europe-near-1')!.line)
    expect(paris.querySelector('.album-slot-arrived')).toBeNull()
    expect(paris.querySelector('button')).toBeNull()
    expect(slot('lisbon').textContent).toBe('LisbonPortugal · MidTravel here')
    expect(slot('lisbon').getAttribute('aria-label')).toBe('Lisbon, Portugal, Mid — Travel here')
    expect(slot('europe-far-1').getAttribute('aria-disabled')).toBe('true')
    expect(slot('europe-far-1').getAttribute('aria-label')).toBe('Far slot — opens after 3 Mid Postcards, 0 of 3')
  })

  it('a locked slot names its progress towards the unlock', () => {
    mount(withAlbum(postcards('europe-near-1')))
    expect(slot('lisbon').getAttribute('aria-label')).toBe('Mid slot — opens after 3 Near Postcards, 1 of 3')
  })

  it('counts are per Region and ignore unknown ids', () => {
    mount(withAlbum(postcards('asia-near-1', 'atlantis', 'asia-near-2')))
    expect(tabs().map((b) => b.textContent)).toEqual(['Europe 0 / 10', 'Asia 2 / 10', 'The Americas 0 / 10'])
  })

  it('keeps the chosen Region tab across a trip: Asia → travel → back to the Album is Asia', () => {
    mount()
    act(() => tab('Asia').click())
    act(() => slot('asia-near-1').click())
    expect(host.querySelector('header .puzzle-title')!.textContent).toBe('Tokyo · Near · Easy')
    act(() => navLink('Album').click())
    expect(slotList().getAttribute('aria-label')).toBe('Asia')
    expect(tab('Asia').getAttribute('aria-pressed')).toBe('true')
  })

  it('opens on the Region of the latest Postcard when chosen from the nav', () => {
    mount({ ...createInitialState(samplePuzzle), album: postcards('europe-near-1', 'asia-near-1') })
    act(() => navLink('Album').click())
    expect(slotList().getAttribute('aria-label')).toBe('Asia')
    expect(document.activeElement).toBe(heading())
  })
})

describe('Album: travel and carry on', () => {
  it('"Travel here" opens the City Puzzle with focus on the grid; "Puzzle" in the nav is enabled', () => {
    mount()
    act(() => slot('europe-near-1').click())
    const { givens } = cityPuzzle('europe-near-1')!
    expect(digits()).toBe([...givens].map((d) => (d === '0' ? '' : d)).join('|'))
    expect(document.activeElement).toBe(cell(0))
    expect(navLink('Puzzle').getAttribute('aria-current')).toBe('page')
    expect(navLink('Puzzle').hasAttribute('aria-disabled')).toBe(false)
    expect(host.querySelector('header .puzzle-title')!.textContent).toBe('Paris · Near · Easy')
  })

  it('"Carry on" returns to the City exactly as left: digits, selection and Undo', () => {
    mount()
    act(() => slot('europe-near-1').click())
    const { givens, solution } = cityPuzzle('europe-near-1')!
    const [a, b] = [...givens].flatMap((d, i) => (d === '0' ? [i] : []))
    act(() => cell(a).focus())
    press(solution[a])
    act(() => cell(b).focus())
    press(solution[b])
    const grid = digits()

    act(() => navLink('Album').click())
    expect(document.activeElement).toBe(heading())
    const paris = slot('europe-near-1')
    expect(paris.textContent).toBe('ParisFrance · NearCarry on')
    expect(paris.getAttribute('aria-label')).toBe('Paris, France, Near — Carry on')
    act(() => paris.click())

    expect(digits()).toBe(grid)
    expect(cell(b).getAttribute('aria-current')).toBe('true')
    expect(document.activeElement).toBe(cell(b))
    press('z', { ctrlKey: true })
    expect(cell(b).textContent).toBe('')
    press('z', { ctrlKey: true })
    expect(cell(a).textContent).toBe('')
  })

  it('the Free Play entry\'s "Carry on" returns to Free Play from a City', () => {
    mount(createInitialState(samplePuzzle))
    act(() => navLink('Album').click())
    act(() => slot('europe-near-1').click())
    expect(host.querySelector('header .puzzle-title')!.textContent).toBe('Paris · Near · Easy')
    act(() => navLink('Free Play').click())
    const carryOn = [...host.querySelectorAll<HTMLButtonElement>('main button')].find((b) => b.textContent === 'Carry on')!
    act(() => carryOn.click())
    expect(host.querySelector('header .puzzle-title')!.textContent).toBe('Free Play · Easy')
    expect(document.activeElement).toBe(cell(0))
  })
})

describe('Postcard line secrecy', () => {
  /**
   * Album on every Region, then Paris (part-played to its last cell) carried on,
   * solved and its Postcard added: no uncollected City's line anywhere.
   */
  function tour(base: AppState, collected: string[]) {
    const puzzle = cityPuzzle('europe-near-1')!
    const last = puzzle.givens.lastIndexOf('0')
    const key = cityKey('europe-near-1')
    const digits = puzzle.solution.slice(0, last) + '0' + puzzle.solution.slice(last + 1)
    mount({ ...base, sessions: { ...base.sessions, [key]: { ...createSession(key, puzzle), digits } } })
    const check = (where: string) => {
      const secret = CITIES.filter((c) => !collected.includes(c.id))
      const text = exposed()
      const announced = live()
      for (const c of secret) {
        expect(text.includes(c.line), `${c.id} line in ${where}`).toBe(false)
        expect(announced.includes(c.line), `${c.id} line in live region (${where})`).toBe(false)
      }
    }
    for (const region of ['Europe', 'Asia', 'The Americas']) {
      act(() => tab(region).click())
      check(`Album ${region}`)
    }
    act(() => tab('Europe').click())
    act(() => slot('europe-near-1').click())
    check('City Puzzle')
    act(() => cell(last).focus())
    press(puzzle.solution[last])
    expect(live()).toBe('Solved')
    // The solve put Paris in the Album: its own line may now show (on the Postcard), no other.
    collected.push('europe-near-1')
    check('Postcard reveal')
    const add = [...host.querySelectorAll<HTMLButtonElement>('main button')].find((b) => b.textContent === 'Add to Album')!
    act(() => add.click())
    check('Album after a solve')
  }

  it('an empty Album exposes no line in text, accessible names or the live region', () => {
    tour(createInitialState(), [])
  })

  it('with Lisbon collected, its Collected slot shows its own line and no other City’s line appears', () => {
    const collected = ['europe-near-2', 'europe-near-3', 'europe-near-4', 'lisbon']
    tour(withAlbum(postcards(...collected)), collected)
    act(() => tab('Europe').click())
    expect(slot('lisbon').textContent).toBe(`LisbonPortugal · Mid${cityById('lisbon')!.line}`)
  })
})

describe('Album styles', () => {
  it('uses tokens only: 5-column grid with the 12px gap token, double ink rule on the pressed tab, dashed locked slot', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(/\.album-slots\s*\{([^}]*)\}/.exec(css)![1]).toContain('repeat(var(--size-album-columns)')
    expect(/\.album-slots\s*\{([^}]*)\}/.exec(css)![1]).toContain('gap: var(--size-album-gap)')
    expect(/\.album-tab\[aria-pressed='true'\]\s*\{([^}]*)\}/.exec(css)![1]).toContain('border-bottom-color: var(--color-ink)')
    expect(/\.album-tab\s*\{([^}]*)\}/.exec(css)![1]).toContain('var(--rule-double) double')
    const locked = /\.album-slot--locked\s*\{([^}]*)\}/.exec(css)![1]
    expect(locked).toContain('dashed var(--color-rule-thin)')
    expect(locked).toContain('background-color: transparent')
  })
})
