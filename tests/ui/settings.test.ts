// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { App } from '../../src/ui/app.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { givens, solution } = samplePuzzle
/** An empty cell whose solution is 3 (a player 5 there is a Mistake). */
const MISTAKE_CELL = [...givens].findIndex((ch, i) => ch === '0' && solution[i] === '3')

let host: HTMLDivElement
let root: Root

function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(createElement(App)))
}

beforeEach(mount)

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

const navLink = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const switches = () => [...host.querySelectorAll<HTMLButtonElement>('[role="switch"]')]
const label = (s: Element) => s.querySelector('.settings-toggle-label')!.textContent
const toggle = (prefix: string) => switches().find((s) => label(s)!.startsWith(prefix))!
const word = (prefix: string) => toggle(prefix).querySelector('.settings-toggle-state')!.textContent
const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!
const withClass = (c: string) =>
  [...host.querySelectorAll(`.sudoku-cell--${c}`)].map((el) => Number(el.getAttribute('data-cell')))

function press(key: string, init: KeyboardEventInit = {}, target: Element | null = document.activeElement): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    target!.dispatchEvent(event)
  })
  return event.defaultPrevented
}

const openSettings = () => act(() => navLink('Settings').click())
const openPuzzle = () => act(() => navLink('Puzzle').click())

describe('Settings screen', () => {
  it('lays out heading, Assists group, hairline rule, then Lamplight', () => {
    openSettings()
    const screen = host.querySelector('.settings-screen')!
    expect(screen.querySelector('h1')!.textContent).toBe('Settings')
    const group = screen.querySelector('[role="group"]')!
    const labelId = group.getAttribute('aria-labelledby')!
    expect(host.querySelector(`[id="${labelId}"]`)!.textContent).toBe('Assists')
    expect([...group.querySelectorAll('[role="switch"]')].map(label)).toEqual([
      'Mistake highlighting',
      'Same-digit highlighting',
      'Row, column and box highlighting',
    ])
    const hr = screen.querySelector('hr')!
    expect(hr.previousElementSibling).toBe(group)
    expect(hr.nextElementSibling && label(hr.nextElementSibling)).toBe('Lamplight')
    expect(screen.textContent).not.toMatch(/Tidy/i)
  })

  it('defaults: Mistake Off, Same digit On, Row/column/box On, Lamplight Off', () => {
    openSettings()
    expect(switches().map((s) => [label(s), s.getAttribute('aria-checked')])).toEqual([
      ['Mistake highlighting', 'false'],
      ['Same-digit highlighting', 'true'],
      ['Row, column and box highlighting', 'true'],
      ['Lamplight', 'false'],
    ])
    expect([word('Mistake'), word('Same-digit'), word('Row'), word('Lamplight')]).toEqual(['Off', 'On', 'On', 'Off'])
  })

  it('toggles are native buttons with role="switch", so click and Space flip them', () => {
    openSettings()
    for (const s of switches()) {
      expect(s.tagName).toBe('BUTTON')
      expect(s.type).toBe('button')
    }
  })

  it('clicking flips the word and aria-checked, and back', () => {
    openSettings()
    act(() => toggle('Mistake').click())
    expect(word('Mistake')).toBe('On')
    expect(toggle('Mistake').getAttribute('aria-checked')).toBe('true')
    act(() => toggle('Mistake').click())
    expect(word('Mistake')).toBe('Off')
    expect(toggle('Mistake').getAttribute('aria-checked')).toBe('false')
  })

  it('Mistake On: the Puzzle marks a wrong player digit on return; Off: plain', () => {
    act(() => cell(MISTAKE_CELL).focus())
    press('5')
    expect(withClass('mistake')).toEqual([])
    expect(cell(MISTAKE_CELL).getAttribute('aria-label')).toMatch(/, 5, your digit$/)

    openSettings()
    act(() => toggle('Mistake').click())
    openPuzzle()
    expect(withClass('mistake')).toEqual([MISTAKE_CELL])
    expect(cell(MISTAKE_CELL).getAttribute('aria-label')).toMatch(/, 5, your digit, mistake$/)
  })

  it('toggling records no Undo entry', () => {
    act(() => cell(MISTAKE_CELL).focus())
    press('5')
    openSettings()
    act(() => toggle('Mistake').click())
    act(() => toggle('Row').click())
    openPuzzle()
    press('z', { ctrlKey: true })
    expect(cell(MISTAKE_CELL).textContent).toBe('')
    // The toggles were never recorded: they are still applied after the Undo.
    openSettings()
    expect([word('Mistake'), word('Row')]).toEqual(['On', 'Off'])
  })

  it('Row/column/box Off removes highlight fills and ticks; Same digit Off removes same-digit marks', () => {
    const given7 = givens.indexOf('7')
    act(() => cell(given7).focus())
    expect(withClass('highlight')).toHaveLength(21)
    expect(host.querySelectorAll('.frame-tick')).toHaveLength(2)
    expect(host.querySelectorAll('[class*="box-corner"]')).toHaveLength(4)
    expect(withClass('same-digit').length).toBeGreaterThan(1)

    openSettings()
    act(() => toggle('Row').click())
    act(() => toggle('Same-digit').click())
    openPuzzle()
    expect(withClass('highlight')).toEqual([])
    expect(host.querySelectorAll('.frame-tick')).toHaveLength(0)
    expect(host.querySelectorAll('[class*="box-corner"]')).toHaveLength(0)
    expect(withClass('same-digit')).toEqual([])
  })

  it('1–9, N, M, H, Backspace and Ctrl+Z in Settings change nothing', () => {
    openSettings()
    const t = toggle('Mistake')
    act(() => t.focus())
    for (const key of ['1', '7', 'n', 'm', 'h', 'Backspace']) expect(press(key, {}, t), key).toBe(false)
    expect(press('z', { ctrlKey: true }, t)).toBe(false)
    expect(word('Mistake')).toBe('Off')
    openPuzzle()
    expect(host.querySelectorAll('.sudoku-cell--player')).toHaveLength(0)
    expect(host.querySelector('.segment--active')?.textContent).toBe('Digit')
    expect(host.querySelector('.mode-status')?.textContent).toMatch(/^cell-first/)
  })
})

describe('Lamplight', () => {
  it('is applied only by the toggle: data-theme on <html>, removed again when Off', () => {
    expect(document.documentElement.dataset.theme).toBeUndefined()
    openSettings()
    act(() => toggle('Lamplight').click())
    expect(document.documentElement.dataset.theme).toBe('lamplight')
    expect(word('Lamplight')).toBe('On')
    act(() => toggle('Lamplight').click())
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('ignores a system dark preference: still Daylight on load', () => {
    act(() => root.unmount())
    host.remove()
    const matchMedia = vi.fn((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))
    vi.stubGlobal('matchMedia', matchMedia)
    mount()
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(matchMedia).not.toHaveBeenCalled()
  })
})
