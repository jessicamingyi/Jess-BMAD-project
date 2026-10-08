// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copy } from '../../src/content/copy.ts'
import { CITIES } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// jsdom gives import.meta.url a non-file scheme, so resolve from the project root (vitest's cwd).
const css = readFileSync(resolve(process.cwd(), 'src/ui/puzzle.css'), 'utf8')

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(createElement(App, { initialState: createInitialState(samplePuzzle) })))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const navLink = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!

describe('copy.freePlayTitle', () => {
  it.each([
    ['easy', 'Free Play · Easy'],
    ['medium', 'Free Play · Medium'],
    ['hard', 'Free Play · Hard'],
  ] as const)('%s → %s', (d, text) => {
    expect(copy.freePlayTitle(d)).toBe(text)
  })
})

describe('Puzzle header title', () => {
  it('shows "Free Play · Easy" as an h1 in the app header', () => {
    const title = host.querySelector('header.app-header h1.puzzle-title')
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Free Play · Easy')
  })

  it('has no Stamp', () => {
    expect(host.querySelector('header [class*="stamp" i]')).toBeNull()
    expect(host.querySelector('header img, header svg')).toBeNull()
  })

  it('uses city-title type tokens only', () => {
    const rule = /\.puzzle-title\s*\{([^}]*)\}/.exec(css)![1]
    expect(rule).toContain('font-size: var(--type-city-title-size)')
    expect(rule).toContain('line-height: var(--type-city-title-line-height)')
    expect(rule).toContain('color: var(--color-ink)')
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('belongs to the Puzzle screen: hidden on Settings, back on Puzzle', () => {
    act(() => navLink('Settings').click())
    expect(host.querySelector('.puzzle-title')).toBeNull()
    act(() => navLink('Puzzle').click())
    expect(host.querySelector('.puzzle-title')!.textContent).toBe('Free Play · Easy')
  })
})

describe('City Puzzle header (Story 3.2)', () => {
  const stampCss = readFileSync(resolve(process.cwd(), 'src/ui/stamp.css'), 'utf8')
  /** Lisbon is Mid: open it with 3 Near Postcards in Europe. */
  const lisbonState = (): AppState =>
    reducer(
      {
        ...createInitialState(),
        album: ['europe-near-1', 'europe-near-2', 'europe-near-3'].map((cityId) => ({ cityId, collectedOn: '2026-10-01', revealed: true })),
      },
      { type: 'cityChosen', cityId: 'lisbon' },
    )

  beforeEach(() => {
    act(() => root.unmount())
    root = createRoot(host)
    act(() => root.render(createElement(App, { initialState: lisbonState(), today: '2026-10-06' })))
  })

  it('shows "Lisbon · Mid · Medium" as the h1 and the meta line "Portugal — Europe, Postcard 5 of 10"', () => {
    expect(host.querySelector('header h1.puzzle-title')!.textContent).toBe('Lisbon · Mid · Medium')
    expect(host.querySelector('header .city-meta')!.textContent).toBe('Portugal — Europe, Postcard 5 of 10')
  })

  it('shows the 74×88 Stamp (country, glyph, Tier), hidden from assistive tech', () => {
    const stamp = host.querySelector<HTMLElement>('header .stamp')!
    expect(stamp.getAttribute('aria-hidden')).toBe('true')
    expect(stamp.classList.contains('stamp--header')).toBe(true)
    expect(stamp.textContent).toBe(`Portugal${CITIES.find((c) => c.id === 'lisbon')!.glyph}Mid`)
  })

  it("puts the Postmark (City and today's date) on the grid card, hidden from assistive tech", () => {
    const postmark = host.querySelector<HTMLElement>('main .grid-card > .postmark')!
    expect(postmark.getAttribute('aria-hidden')).toBe('true')
    expect(postmark.textContent).toBe('Lisbon06 OCT 26')
    expect(postmark.closest('[role="grid"]')).toBeNull()
  })

  it('shows the interim solve line "Solved. Where to next?" with an Album link', () => {
    const { givens, solution } = cityPuzzle('lisbon')!
    let state = lisbonState()
    for (let i = 0; i < 81; i++) {
      if (givens[i] !== '0') continue
      state = reducer(reducer(state, { type: 'cellSelected', cell: i }), { type: 'digitEntered', digit: Number(solution[i]) })
    }
    act(() => root.unmount())
    root = createRoot(host)
    act(() => root.render(createElement(App, { initialState: state, today: '2026-10-06' })))
    const line = host.querySelector('.puzzle-status')!
    expect(line.textContent).toBe('Solved. Where to next? Album')
    act(() => line.querySelector('button')!.click())
    expect(host.querySelector('main h1')!.textContent).toBe('Where to next?')
  })

  it('Stamp and Postmark use tokens only; the glyph is text presentation in the serif family', () => {
    expect(stampCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    const glyph = /\.stamp-glyph\s*\{([^}]*)\}/.exec(stampCss)![1]
    expect(glyph).toContain('font-family: var(--font-family)')
    expect(glyph).toContain('font-variant-emoji: text')
    const stamp = /\.stamp\s*\{([^}]*)\}/.exec(stampCss)![1]
    expect(stamp).toContain('background-color: var(--color-airmail-red)')
    expect(stamp).toContain('color: var(--color-card)')
    expect(stamp).toContain('rotate(var(--stamp-tilt))')
    const header = /\.stamp--header\s*\{([^}]*)\}/.exec(stampCss)![1]
    expect(header).toContain('width: var(--size-stamp-width)')
    const postmark = /\.postmark\s*\{([^}]*)\}/.exec(stampCss)![1]
    expect(postmark).toContain('double var(--color-postmark)')
    expect(postmark).toContain('opacity: var(--postmark-opacity)')
    // Names break only between words; the date stays on one line.
    expect(stampCss).not.toMatch(/overflow-wrap:\s*anywhere|word-break:\s*break-all/)
    expect(/\.postmark-date\s*\{([^}]*)\}/.exec(stampCss)![1]).toContain('white-space: nowrap')
    // The Postmark sits wholly above the frame line, so the frame never crosses its text.
    const placed = /\.grid-card > \.postmark\s*\{([^}]*)\}/.exec(css)![1]
    expect(placed).toContain('bottom: calc(100% + var(--rule-frame))')
  })
})

describe('Free Play has neither Stamp nor Postmark', () => {
  it('no .stamp, no .postmark, no meta line', () => {
    expect(host.querySelector('.stamp')).toBeNull()
    expect(host.querySelector('.postmark')).toBeNull()
    expect(host.querySelector('.city-meta')).toBeNull()
  })
})

describe('copy for the City header', () => {
  it('formats the title, meta line and Postmark date', () => {
    expect(copy.cityTitle('Lisbon', 'mid', 'medium')).toBe('Lisbon · Mid · Medium')
    expect(copy.cityMeta('Portugal', 'europe', 5, 10)).toBe('Portugal — Europe, Postcard 5 of 10')
    expect(copy.postmarkDate('2026-10-06')).toBe('06 OCT 26')
    expect(copy.postmarkDate('2027-01-31')).toBe('31 JAN 27')
    expect(copy.postmarkDate('2026-12-01')).toBe('01 DEC 26')
    expect(copy.regionTabCount('americas', 4, 10)).toBe('The Americas 4 / 10')
  })
})
