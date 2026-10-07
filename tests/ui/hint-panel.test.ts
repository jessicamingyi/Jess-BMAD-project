// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'
import { PUZZLES } from '../engine/fixtures.ts'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
/** An empty cell outside row 5 (the sample's first Hint is a naked single at cell 40, row 5). */
const OTHER = emptyCells.find((c) => Math.floor(c / 9) !== 4)!
const ROW5 = [36, 37, 38, 39, 40, 41, 42, 43, 44]

let host: HTMLDivElement
let root: Root | undefined

/** (Re)mount the App on `state`: a fresh root, since `initialState` is read only once. */
function mount(state: AppState = createInitialState(samplePuzzle)) {
  const old = root
  if (old) act(() => old.unmount())
  const next = createRoot(host)
  root = next
  act(() => next.render(createElement(App, { initialState: state })))
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  mount()
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  host.remove()
})

const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!
const panel = () => host.querySelector<HTMLElement>('.hint-panel')
const panelButton = () => panel()!.querySelector<HTMLButtonElement>('button')!
const label = () => panel()!.querySelector('.hint-panel-label')!.textContent
const text = () => panel()!.querySelector('.hint-panel-text')?.textContent ?? ''
const live = () => host.querySelector('[aria-live="polite"]')!.textContent
const hintButton = () => host.querySelector<HTMLButtonElement>('.action-row .button--primary')!
const hinted = () =>
  [...host.querySelectorAll('.sudoku-cell--hint-focus')].map((el) => Number(el.getAttribute('data-cell'))).sort((a, b) => a - b)

function focus(el: HTMLElement) {
  act(() => el.focus())
}

function press(key: string, init: KeyboardEventInit = {}, target: Element | null = document.activeElement): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    target!.dispatchEvent(event)
  })
  return event.defaultPrevented
}

const click = (el: HTMLElement) => act(() => el.click())

describe('Hint panel', () => {
  it('is absent until asked for; H opens it first in the side column at "Nudge"', () => {
    expect(panel()).toBeNull()
    focus(cell(OTHER))
    expect(press('h')).toBe(true)
    const side = host.querySelector('.side-column')!
    expect(side.firstElementChild).toBe(panel())
    expect(panel()!.getAttribute('role')).toBe('region')
    expect(panel()!.getAttribute('aria-label')).toBe('Hint')
    expect(panel()!.hasAttribute('aria-live')).toBe(false)
    expect(panel()!.nextElementSibling?.className).toBe('mode-indicator')
    expect(label()).toBe('Nudge')
    expect(text()).toBe('Look for a naked single in row 5.')
    expect(panelButton().textContent).toBe('Explain it')
    expect(panel()!.textContent).toContain('Esc to set aside')
    expect(live()).toBe('Look for a naked single in row 5.')
    // Focus stays where it was.
    expect(document.activeElement).toBe(cell(OTHER))
  })

  it('marks the nudge unit, then the chain cells, with ", hint" in their names', () => {
    focus(cell(OTHER))
    press('H')
    expect(hinted()).toEqual(ROW5)
    expect(cell(40).getAttribute('aria-label')).toBe('Row 5, column 5, empty, hint')
    expect(cell(OTHER).getAttribute('aria-label')).not.toMatch(/hint$/)
    press('h')
    expect(label()).toBe('Explanation')
    expect(text()).toBe('Row 5, column 5 can only be a 5. Every other digit is already in its row, column or box.')
    expect(live()).toBe(text())
    expect(hinted()).toEqual([40])
    expect(cell(36).getAttribute('aria-label')).not.toMatch(/hint$/)
  })

  it('the step button advances one step; "Show me the move" is focusable but inert', () => {
    click(hintButton())
    expect(label()).toBe('Nudge')
    const button = panelButton()
    click(button)
    expect(panelButton()).toBe(button) // one stable button
    expect(label()).toBe('Explanation')
    expect(button.textContent).toBe('Show me the move')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.disabled).toBe(false)
    const before = host.innerHTML
    click(button)
    press('h', {}, cell(0))
    expect(host.innerHTML).toBe(before)
  })

  it('a digit change resets the panel to idle; no marks; focus stays in the grid', () => {
    focus(cell(OTHER))
    press('h')
    press('h')
    press('1')
    expect(label()).toBe('Hint')
    expect(text()).toBe('')
    expect(panelButton().textContent).toBe('Show a nudge')
    expect(hinted()).toEqual([])
    expect(document.activeElement).toBe(cell(OTHER))
    expect(live()).toBe('1')
    press('h')
    expect(label()).toBe('Nudge')
  })

  it('reset with focus in the panel moves focus to the grid tab stop', () => {
    focus(cell(OTHER))
    press('h')
    focus(panelButton())
    press('z', { ctrlKey: true }) // nothing to undo: no reset, focus stays
    expect(document.activeElement).toBe(panelButton())
    press('5') // cell-first with OTHER selected: places a digit
    expect(label()).toBe('Hint')
    expect(document.activeElement).toBe(cell(OTHER))
  })

  it('Esc sets the panel aside: gone, marks gone; focus returns to the grid if it was inside', () => {
    focus(cell(OTHER))
    press('h')
    focus(panelButton())
    expect(press('Escape')).toBe(true)
    expect(panel()).toBeNull()
    expect(hinted()).toEqual([])
    expect(document.activeElement).toBe(cell(OTHER))
    expect(press('Escape')).toBe(false)
  })

  it('Esc from the grid closes the panel and focus stays put', () => {
    focus(cell(OTHER))
    press('h')
    press('Escape')
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(cell(OTHER))
  })

  it('Esc closes the Restart confirm first, then the panel', () => {
    focus(cell(OTHER))
    press('1')
    press('h')
    click(host.querySelector<HTMLButtonElement>('.action-row button:last-child')!)
    expect(host.querySelector('.action-row--confirm')).not.toBeNull()
    press('Escape')
    expect(host.querySelector('.action-row--confirm')).toBeNull()
    expect(panel()).not.toBeNull()
    press('Escape')
    expect(panel()).toBeNull()
  })

  it('H from the header nav does nothing', () => {
    const nav = host.querySelector<HTMLElement>('.app-header button, .app-header a')!
    focus(nav)
    const before = host.innerHTML
    expect(press('h')).toBe(false)
    expect(press('H')).toBe(false)
    expect(host.innerHTML).toBe(before)
  })

  it('opening the panel leaves the grid card first and in place', () => {
    const screen = host.querySelector('.puzzle-screen')!
    const card = host.querySelector('.grid-card')!
    expect(screen.firstElementChild).toBe(card)
    focus(cell(OTHER))
    press('h')
    expect(screen.firstElementChild).toBe(card)
    expect(host.querySelector('.grid-card')).toBe(card)
    expect(card.contains(panel())).toBe(false)
  })

  it('focus order with the panel open: grid, panel button, mode segments, pad, Undo, Hint, Restart', () => {
    focus(cell(OTHER))
    press('h')
    const tabbable = [...host.querySelectorAll<HTMLElement>('main button, main [tabindex]')].filter((el) => el.tabIndex >= 0)
    const names = tabbable.map((el) => (el.getAttribute('role') === 'gridcell' ? 'grid' : el.textContent))
    expect(names.slice(0, 3)).toEqual(['grid', 'Explain it', 'Digit'])
    expect(names.slice(-3)).toEqual([expect.stringMatching(/^Undo/), 'HintH', 'Restart'])
  })
})

describe('no Hint found', () => {
  it('the panel opens idle with its step button aria-disabled', () => {
    const base = createInitialState(samplePuzzle)
    mount({ ...base, sessions: { free: { ...base.sessions.free, givens: PUZZLES.beyondMvp.givens, digits: PUZZLES.beyondMvp.givens } } })
    focus(cell(1))
    press('h')
    expect(label()).toBe('Hint')
    expect(panelButton().textContent).toBe('Show a nudge')
    expect(panelButton().getAttribute('aria-disabled')).toBe('true')
    expect(panelButton().disabled).toBe(false)
  })
})

describe('solved Puzzle', () => {
  it('Hint is aria-disabled, focusable, and does nothing (click or H)', () => {
    const solvedState = createInitialState(samplePuzzle)
    mount({ ...solvedState, sessions: { free: { ...solvedState.sessions.free, digits: solution, status: 'solved' } } })
    const button = hintButton()
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.disabled).toBe(false)
    focus(button)
    expect(document.activeElement).toBe(button)
    click(button)
    press('h')
    expect(panel()).toBeNull()
  })
})
