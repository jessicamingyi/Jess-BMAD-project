// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { cityById } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { cityKey } from '../../src/game/journey.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { Action, Album, AppState, Postcard } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'
import { PuzzleScreen } from '../../src/ui/puzzle-screen.tsx'
import { nearly } from './city-fixtures.ts'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const postcardCss = read('src/ui/postcard.css')
const puzzleCss = read('src/ui/puzzle.css')
const albumCss = read('src/ui/album.css')
const themeCss = read('src/ui/theme.css')

const TODAY = '2026-10-07'
const LISBON = cityById('lisbon')!

let host: HTMLDivElement
let root: Root | null = null

function render(element: ReturnType<typeof createElement>) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(element))
}
const mount = (initialState?: AppState) => render(createElement(App, { initialState, today: TODAY }))
/** Launch on a state with a Puzzle in progress (the launch rule opens it), then go to the Album. */
function mountOnAlbum(initialState: AppState) {
  mount(initialState)
  expect(host.querySelector('.puzzle-screen')).not.toBeNull()
  act(() => navLink('Album').click())
  expect(heading().textContent).toMatch(/^Where to/)
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host.remove()
})

const revealed = (...ids: string[]): Album => ids.map((cityId) => ({ cityId, collectedOn: '2026-10-01', revealed: true }))
const unrevealed = (cityId: string, collectedOn = '2026-10-06'): Postcard => ({ cityId, collectedOn, revealed: false })
const withAlbum = (album: Album): AppState => ({ ...createInitialState(), album })

const LISBON_READY = () => nearly(withAlbum(revealed('europe-near-1', 'europe-near-2', 'europe-near-3')), 'lisbon')

const postcard = () => host.querySelector<HTMLElement>('section.postcard')
const addButton = () => [...host.querySelectorAll<HTMLButtonElement>('section.postcard button')].find((b) => b.textContent === 'Add to Album')!
const heading = () => host.querySelector<HTMLHeadingElement>('main h1')!
const navLink = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const tab = (prefix: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Regions"] button')].find((b) => b.textContent!.startsWith(prefix))!
const slot = (id: string) => host.querySelector<HTMLElement>(`.album-slot[data-city="${id}"]`)!
const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!
const live = () => host.querySelector('[aria-live="polite"]')!.textContent
const title = () => host.querySelector('header .puzzle-title')?.textContent

function press(key: string, target: Element | null = document.activeElement) {
  act(() => {
    target!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

/** Place the missing digit(s) of the current City Puzzle by keyboard (fixtures leave one or two). */
function solveByKeys(cityId: string) {
  const { solution } = cityPuzzle(cityId)!
  for (let i = 0; i < 81; i++) {
    const open = cell(i).classList.contains('sudoku-cell--empty') || cell(i).classList.contains('sudoku-cell--notes')
    if (!postcard() && open) {
      act(() => cell(i).focus())
      press(solution[i])
    }
  }
}

/** Carry on `cityId` from the Album (on its Region) and play its last move. */
function travelAndSolve(cityId: string) {
  act(() => slot(cityId).click())
  solveByKeys(cityId)
}

describe('the reveal', () => {
  it('slides the Postcard onto the finished grid: region, line, divider, Postmark over Stamp, address lines', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    const pc = postcard()!
    expect(pc).not.toBeNull()
    expect(pc.getAttribute('aria-label')).toBe('Postcard from Lisbon')
    expect(pc.parentElement!.className).toBe('postcard-reveal')
    expect(pc.closest('.puzzle-screen')).not.toBeNull()
    expect(pc.closest('.grid-card')).toBeNull()

    const line = pc.querySelector<HTMLParagraphElement>('p.postcard-line')!
    expect(line.textContent).toBe(LISBON.line)
    expect(line.id).not.toBe('')
    expect(pc.querySelector('.postcard-divider')!.getAttribute('aria-hidden')).toBe('true')

    const marks = pc.querySelector('.postcard-address .postcard-marks')!
    const postmark = marks.querySelector('.postmark')!
    expect(postmark.textContent).toBe('Lisbon07 OCT 26')
    expect(postmark.getAttribute('aria-hidden')).toBe('true')
    const stamp = marks.querySelector('.stamp')!
    expect(stamp.className).toBe('stamp stamp--postcard')
    expect(stamp.getAttribute('aria-hidden')).toBe('true')
    expect([...pc.querySelectorAll('.postcard-address-line')].map((p) => p.textContent)).toEqual([
      'To: the Traveller',
      'Album · Europe',
      'Lisbon, Portugal',
    ])

    const buttons = pc.querySelectorAll('button')
    expect(buttons).toHaveLength(1)
    expect(addButton().className).toBe('button button--primary')
    expect(addButton().getAttribute('aria-describedby')).toBe(line.id)
  })

  it('the grid keeps its finished digits; grid, side column and nav are inert; focus is on "Add to Album"; "Solved" is announced', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    const { solution } = cityPuzzle('lisbon')!
    expect([...host.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent).join('')).toBe(solution)
    expect(host.querySelector('.grid-card')!.hasAttribute('inert')).toBe(true)
    expect(host.querySelector('.side-column')!.hasAttribute('inert')).toBe(true)
    expect(host.querySelector('nav')!.hasAttribute('inert')).toBe(true)
    expect(document.activeElement).toBe(addButton())
    expect(live()).toBe('Solved')
    // The solve line waits until after the reveal.
    expect(host.querySelector('.puzzle-status')).toBeNull()
  })

  it('a click outside the Postcard (grid, side column, nav, page) does nothing', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    act(() => cell(0).click())
    act(() => host.querySelector<HTMLButtonElement>('.side-column button')!.click())
    act(() => navLink('Album').click())
    act(() => document.body.click())
    act(() => host.querySelector<HTMLElement>('.postcard-face')!.click())
    expect(postcard()).not.toBeNull()
    expect(title()).toBe('Lisbon · Mid · Medium')
  })

  it('Esc adds the Postcard', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    press('Escape', addButton())
    expect(postcard()).toBeNull()
    expect(heading().textContent).toBe('Where to next?')
  })

  it('is a labelled modal dialog', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    expect(postcard()!.getAttribute('role')).toBe('dialog')
    expect(postcard()!.getAttribute('aria-modal')).toBe('true')
    expect(postcard()!.getAttribute('aria-label')).toBe('Postcard from Lisbon')
  })

  it('Esc still adds after focus has left the Postcard (a click outside)', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    act(() => (document.activeElement as HTMLElement).blur())
    expect(document.activeElement).toBe(document.body)
    press('Escape', document.body)
    expect(postcard()).toBeNull()
    expect(heading().textContent).toBe('Where to next?')
  })

  it('a held (auto-repeated) Esc adds nothing more', () => {
    mount(withAlbum([unrevealed('asia-near-1'), unrevealed('europe-near-1')]))
    press('Escape', addButton())
    expect(postcard()!.getAttribute('aria-label')).toBe('Postcard from Paris')
    act(() => {
      addButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', repeat: true, bubbles: true, cancelable: true }))
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', repeat: true, bubbles: true, cancelable: true }))
    })
    expect(postcard()!.getAttribute('aria-label')).toBe('Postcard from Paris')
  })

  it('the grid’s Postmark shows the Postcard’s date during the reveal and afterwards (the City is solved)', () => {
    mount(withAlbum([...revealed('europe-near-2'), unrevealed('europe-near-1', '2026-09-30')]))
    expect(host.querySelector('.grid-card > .postmark')!.textContent).toBe('Paris30 SEP 26')
    act(() => addButton().click())
    act(() => navLink('Puzzle').click())
    expect(host.querySelector('.grid-card > .postmark')!.textContent).toBe('Paris30 SEP 26')
  })
})

describe('keys on "Add to Album" (PuzzleScreen with a spy dispatch)', () => {
  /** Lisbon solved with its Postcard pending, on the Puzzle screen. */
  function pendingLisbon(): AppState {
    let s: AppState = reducer(LISBON_READY(), { type: 'cityChosen', cityId: 'lisbon' })
    const last = s.sessions[cityKey('lisbon')].digits.indexOf('0')
    const { solution } = cityPuzzle('lisbon')!
    s = reducer(reducer(s, { type: 'cellSelected', cell: last }), { type: 'digitEntered', digit: Number(solution[last]), date: TODAY })
    expect(s.album.at(-1)).toEqual({ cityId: 'lisbon', collectedOn: TODAY, revealed: false })
    return s
  }

  it('digits, N, M, H and arrows leave the state unchanged; Esc dispatches postcardAdded once', () => {
    const state = pendingLisbon()
    const sent: Action[] = []
    render(createElement(PuzzleScreen, { state, dispatch: (a: Action) => sent.push(a), today: TODAY }))
    expect(document.activeElement).toBe(addButton())
    for (const key of ['1', '5', '9', 'n', 'N', 'm', 'M', 'h', 'H', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace']) {
      press(key, addButton())
    }
    for (const action of sent) expect(reducer(state, action), action.type).toBe(state)
    expect(sent.some((a) => a.type === 'postcardAdded')).toBe(false)

    sent.length = 0
    press('Escape', addButton())
    expect(sent).toEqual([{ type: 'postcardAdded', cityId: 'lisbon' }])
  })

  it('only the four solving actions leave the screen stamped with today’s date', () => {
    const state = pendingLisbon()
    const sent: Action[] = []
    render(createElement(PuzzleScreen, { state, dispatch: (a: Action) => sent.push(a), today: TODAY }))
    act(() => addButton().click())
    press('5', addButton())
    press('n', addButton())
    expect(sent).toEqual([
      { type: 'postcardAdded', cityId: 'lisbon' },
      { type: 'digitEntered', digit: 5, date: TODAY },
      { type: 'entryModeToggled' },
    ])
  })
})

describe('after "Add to Album"', () => {
  it('the Album opens on the City’s Region: "Where to next?", count +1, focus on the heading, Lisbon "just arrived"', () => {
    mountOnAlbum(LISBON_READY())
    expect(tab('Europe').textContent).toBe('Europe 3 / 10')
    // Leave the Album on another Region, then finish Lisbon (current since launch).
    act(() => tab('Asia').click())
    act(() => navLink('Puzzle').click())
    solveByKeys('lisbon')
    act(() => addButton().click())

    expect(heading().textContent).toBe('Where to next?')
    expect(document.activeElement).toBe(heading())
    expect(tab('Europe').getAttribute('aria-pressed')).toBe('true')
    expect(tab('Europe').textContent).toBe('Europe 4 / 10')
    expect(host.querySelector('nav')!.hasAttribute('inert')).toBe(false)

    const lisbon = slot('lisbon')
    expect(lisbon.className).toBe('album-slot album-slot--collected album-slot--just-arrived')
    expect(lisbon.querySelector('.album-slot-line')!.textContent).toBe(LISBON.line)
    expect(lisbon.querySelector('.album-slot-arrived')!.textContent).toBe('just arrived')
    expect(lisbon.textContent).toBe(`LisbonPortugal · Mid${LISBON.line}just arrived`)
    // Region tabs keep the mark; it goes on the next Album visit.
    act(() => tab('Asia').click())
    act(() => tab('Europe').click())
    expect(slot('lisbon').querySelector('.album-slot-arrived')).not.toBeNull()
    act(() => navLink('Settings').click())
    act(() => navLink('Album').click())
    expect(slot('lisbon').querySelector('.album-slot-arrived')).toBeNull()
    expect(slot('lisbon').className).toBe('album-slot album-slot--collected')
  })

  it('the solved City shows "Solved. Where to next?" when revisited through "Puzzle"', () => {
    mountOnAlbum(LISBON_READY())
    travelAndSolve('lisbon')
    act(() => addButton().click())
    act(() => navLink('Puzzle').click())
    expect(postcard()).toBeNull()
    expect(host.querySelector('.puzzle-status')!.textContent).toBe('Solved. Where to next? Album')
    expect(host.querySelector('.grid-card')!.hasAttribute('inert')).toBe(false)
  })

  it('the third Near Postcard opens that Region’s Mid slots: "Travel here", no extra message', () => {
    mountOnAlbum(nearly(withAlbum(revealed('europe-near-1', 'europe-near-2')), 'europe-near-3'))
    expect(slot('lisbon').getAttribute('aria-disabled')).toBe('true')
    travelAndSolve('europe-near-3')
    act(() => addButton().click())
    for (const id of ['lisbon', 'europe-mid-2', 'europe-mid-3']) {
      const s = slot(id)
      expect(s.getAttribute('aria-disabled'), id).toBeNull()
      expect(s.textContent, id).toBe(`${cityById(id)!.name}${cityById(id)!.country} · MidTravel here`)
    }
    expect(slot('europe-far-1').getAttribute('aria-disabled')).toBe('true')
    expect(slot('asia-mid-1')).toBeNull()
  })
})

describe('a pending Postcard at launch (state fixture)', () => {
  it('opens on the oldest one’s solved City, then the next, then the Album', () => {
    mount(withAlbum([...revealed('europe-near-2'), unrevealed('asia-near-1', '2026-10-05'), unrevealed('europe-near-1')]))
    expect(title()).toBe('Tokyo · Near · Easy')
    expect(postcard()!.getAttribute('aria-label')).toBe('Postcard from Tokyo')
    expect(postcard()!.querySelector('.postmark')!.textContent).toBe('Tokyo05 OCT 26')
    const { solution } = cityPuzzle('asia-near-1')!
    expect([...host.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent).join('')).toBe(solution)
    expect(document.activeElement).toBe(addButton())

    act(() => addButton().click())
    expect(title()).toBe('Paris · Near · Easy')
    expect(postcard()!.getAttribute('aria-label')).toBe('Postcard from Paris')
    expect(document.activeElement).toBe(addButton())

    act(() => addButton().click())
    expect(postcard()).toBeNull()
    expect(heading().textContent).toBe('Where to next?')
    expect(tab('Europe').getAttribute('aria-pressed')).toBe('true')
    expect(slot('europe-near-1').querySelector('.album-slot-arrived')).not.toBeNull()
    expect(slot('europe-near-2').querySelector('.album-slot-arrived')).toBeNull()
    act(() => tab('Asia').click())
    expect(slot('asia-near-1').querySelector('.album-slot-arrived')).not.toBeNull()
  })

  it('an unrevealable entry (unknown City) blocks nothing: the Album shows, the nav works', () => {
    mount(withAlbum([unrevealed('atlantis')]))
    expect(postcard()).toBeNull()
    expect(host.querySelector('nav')!.hasAttribute('inert')).toBe(false)
    expect(heading().textContent).toBe('Where to next?')
    act(() => navLink('Settings').click())
    expect(heading().textContent).toBe('Settings')
  })

  it('a placeholder City’s Postcard shows its line exactly as written', () => {
    mount(withAlbum([unrevealed('europe-near-1')]))
    expect(postcard()!.querySelector('.postcard-line')!.textContent).toBe('PLACEHOLDER: Postcard line for Paris (TS-40).')
  })
})

describe('UJ-1: the Lisbon journey end to end', () => {
  it('Album → Lisbon with Stamp → Notes → Hint nudge and explanation → solve → Postcard → Add to Album → Europe, "just arrived"', () => {
    // Lisbon is part-played (two cells left), so the journey runs in a few moves.
    mountOnAlbum(nearly(withAlbum(revealed('europe-near-1', 'europe-near-2', 'europe-near-3')), 'lisbon', 2))
    expect(heading().textContent).toBe('Where to next?')
    act(() => slot('lisbon').click())
    expect(title()).toBe('Lisbon · Mid · Medium')
    expect(host.querySelector('header .stamp.stamp--header')).not.toBeNull()

    const { solution } = cityPuzzle('lisbon')!
    const empty = [...host.querySelectorAll<HTMLElement>('.sudoku-cell--empty')].map((c) => Number(c.dataset.cell))
    expect(empty).toHaveLength(2)
    // Notes: pencil a candidate, then back to digits.
    act(() => cell(empty[0]).focus())
    press('n')
    press(solution[empty[0]])
    expect(cell(empty[0]).getAttribute('aria-label')).toContain('notes')
    press('n')

    // Hint: nudge, then explanation, then the move.
    press('h')
    expect(host.querySelector('.hint-panel')!.textContent).toContain('Nudge')
    press('h')
    expect(host.querySelector('.hint-panel')!.textContent).toContain('Explanation')
    press('h')
    expect(live()).toMatch(/placed, row \d, column \d/)
    expect(postcard()).toBeNull()

    solveByKeys('lisbon')
    expect(live()).toBe('Solved')
    expect(postcard()!.getAttribute('aria-label')).toBe('Postcard from Lisbon')
    expect(postcard()!.textContent).toContain(LISBON.line)
    expect(document.activeElement).toBe(addButton())

    act(() => addButton().click())
    expect(heading().textContent).toBe('Where to next?')
    expect(document.activeElement).toBe(heading())
    expect(tab('Europe').textContent).toBe('Europe 4 / 10')
    expect(slot('lisbon').querySelector('.album-slot-arrived')!.textContent).toBe('just arrived')
  })
})

describe('Postcard and reveal styles', () => {
  const rule = (css: string, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)![1]
  }

  it('tokens only (no raw colours)', () => {
    expect(postcardCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
    expect(albumCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
  })

  it('the Postcard: card, 8px airmail-stripe border, square corners, -1deg, the Postcard shadow; the line in postcard-line ink', () => {
    const face = rule(postcardCss, '.postcard-face')
    expect(face).toContain('background-color: var(--color-card)')
    expect(face).toContain('border: var(--size-airmail-stripe) solid transparent')
    expect(face).toContain('border-image: var(--airmail-stripe) var(--airmail-stripe-slice) / var(--size-airmail-stripe)')
    expect(face).toContain('border-radius: var(--rounded-none)')
    expect(face).toContain('rotate(var(--postcard-tilt))')
    expect(face).toContain('box-shadow: var(--shadow-postcard)')
    const line = rule(postcardCss, '.postcard-line')
    expect(line).toContain('font-size: var(--type-postcard-line-size)')
    expect(line).toContain('font-style: var(--type-postcard-line-style)')
    expect(line).toContain('color: var(--color-ink)')
    expect(rule(postcardCss, '.postcard-divider')).toContain('var(--color-rule-thin)')
    expect(rule(postcardCss, '.postcard-address-line')).toContain('var(--rule-thin) solid var(--color-rule-thin)')
  })

  it('theme tokens: the stripe pattern (repointed by the colour roles in Lamplight), -1deg, the 30% shadow with its twin', () => {
    expect(themeCss).toMatch(/--postcard-tilt:\s*-1deg;/)
    expect(themeCss).toMatch(/--size-airmail-stripe:\s*8px;/)
    expect(themeCss).toMatch(/--size-airmail-stripe-edge:\s*4px;/)
    const stripe = /--airmail-stripe:\s*repeating-linear-gradient\(([^;]*)\);/.exec(themeCss)![1].replace(/\s+/g, ' ').trim()
    expect(stripe).toBe(
      '-45deg, var(--color-airmail-red) 0 12px, var(--color-desk) 12px 20px, var(--color-rule-box) 20px 32px, var(--color-desk) 32px 40px',
    )
    expect(themeCss).toMatch(/--airmail-stripe-slice:\s*8;/)
    expect(themeCss).not.toContain('--airmail-stripe-lamplight')
    expect(themeCss).toContain('--shadow-postcard: 0 10px 26px color-mix(in srgb, var(--color-ink) 30%, transparent);')
    expect(themeCss).toContain('--shadow-postcard-lamplight: 0 10px 26px color-mix(in srgb, black 30%, transparent);')
    const lamplight = /:root\[data-theme='lamplight'\]\s*\{([^}]*)\}/.exec(themeCss)![1]
    expect(lamplight).toContain('--shadow-postcard: var(--shadow-postcard-lamplight)')
  })

  it('the small Stamp: country and Tier at the small Stamp size, so "Netherlands" fits the 48px face', () => {
    const small = /\.postcard-marks \.stamp-country,\s*\.postcard-marks \.stamp-tier\s*\{([^}]*)\}/.exec(postcardCss)![1]
    expect(small).toContain('font-size: var(--type-stamp-small-size)')
    expect(small).toContain('letter-spacing: var(--type-stamp-small-letter-spacing)')
    expect(themeCss).toMatch(/--type-stamp-small-size:\s*7px;/)
    expect(themeCss).toMatch(/--type-stamp-small-letter-spacing:\s*0;/)
  })

  it('forced colours: a solid CanvasText edge on the Postcard and the Collected slot', () => {
    const pc = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(postcardCss)![1]
    expect(pc).toContain('border-image: none')
    expect(pc).toContain('border-color: CanvasText')
    const album = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(albumCss)![1]
    expect(album).toContain('solid CanvasText')
  })

  it('the arrival: rises 24px and fades in over 500ms ease-out, fill-mode both, ending at rest; nothing else on the Puzzle screen moves', () => {
    const reveal = rule(puzzleCss, '.puzzle-screen .postcard-reveal')
    expect(reveal).toContain('position: absolute')
    expect(reveal).toContain('animation: postcard-arrive var(--motion-postcard-arrive) var(--motion-ease-out) both')
    expect(themeCss).toMatch(/--motion-postcard-arrive:\s*500ms;/)
    expect(themeCss).toMatch(/--motion-postcard-rise:\s*24px;/)
    const keyframes = /@keyframes postcard-arrive\s*\{([\s\S]*?)\n\}/.exec(puzzleCss)![1]
    expect(keyframes).toMatch(/from\s*\{[^}]*opacity: 0;[^}]*translateY\(var\(--motion-postcard-rise\)\)/)
    expect(keyframes).toMatch(/to\s*\{[^}]*opacity: 1;[^}]*transform: none;/)
    expect(puzzleCss).toMatch(/\.puzzle-screen,\s*\n\.puzzle-screen \*\s*\{[^}]*animation: none;/)
    expect([...puzzleCss.matchAll(/animation: (?!none)/g)]).toHaveLength(1)
  })

  it('"just arrived": 2px airmail-red outline and caption, a 400ms fade-in', () => {
    const arrived = rule(albumCss, '.album-slot--just-arrived')
    expect(arrived).toContain('outline: var(--rule-box) solid var(--color-airmail-red)')
    expect(arrived).toContain('animation: album-just-arrived-outline var(--motion-just-arrived) var(--motion-ease-out) both')
    const caption = rule(albumCss, '.album-slot-arrived')
    expect(caption).toContain('color: var(--color-airmail-red)')
    expect(caption).toContain('font-size: var(--type-caption-size)')
    expect(caption).toContain('var(--motion-just-arrived)')
    expect(themeCss).toMatch(/--motion-just-arrived:\s*400ms;/)
    expect(themeCss).toMatch(/--rule-box:\s*2px;/)
  })

  it('the Collected slot: 1px rule-thin border on card, a 4px stripe top edge, the line in meta italic ink', () => {
    expect(rule(albumCss, '.album-slot')).toContain('border: var(--rule-thin) solid var(--color-rule-thin)')
    const edge = rule(albumCss, '.album-slot--collected::before')
    expect(edge).toContain('height: var(--size-airmail-stripe-edge)')
    expect(edge).toContain('background-image: var(--airmail-stripe)')
    const line = rule(albumCss, '.album-slot-line')
    expect(line).toContain('color: var(--color-ink)')
    expect(line).toContain('font-size: var(--type-meta-size)')
    expect(line).toContain('font-style: italic')
  })

  it('reduced motion stops both: the global rule zeroes every animation', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(themeCss)![1]
    expect(reduced).toContain('animation-duration: 0s !important')
    expect(reduced).toMatch(/\*,\s*\n\s*\*::before,\s*\n\s*\*::after/)
  })
})
