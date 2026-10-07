// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { App } from '../../src/ui/app.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(createElement(App)))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const navLink = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)
const digits = () => [...host.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent).join('|')

function press(key: string, init: KeyboardEventInit = {}, target: Element | null = document.activeElement): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    target!.dispatchEvent(event)
  })
  return event.defaultPrevented
}

describe('header nav', () => {
  it('shows "Puzzle · Settings" as buttons in a labelled nav, Puzzle current', () => {
    const nav = host.querySelector('header nav')!
    expect(nav.getAttribute('aria-label')).toBe('Main')
    expect(nav.textContent).toBe('Puzzle·Settings')
    expect(navLink('Puzzle').getAttribute('aria-current')).toBe('page')
    expect(navLink('Settings').hasAttribute('aria-current')).toBe(false)
    expect(navLink('Puzzle').className).toBe('nav-link')
  })

  it('clicking Settings shows Settings and focuses its heading; Puzzle returns and focuses the grid tab stop', () => {
    act(() => navLink('Settings').click())
    const heading = host.querySelector('h1')!
    expect(heading.textContent).toBe('Settings')
    expect(heading.tabIndex).toBe(-1)
    expect(document.activeElement).toBe(heading)
    expect(navLink('Settings').getAttribute('aria-current')).toBe('page')
    expect(host.querySelector('[role="grid"]')).toBeNull()

    act(() => navLink('Puzzle').click())
    expect(document.activeElement).toBe(cell(0))
    expect(cell(0)!.tabIndex).toBe(0)
    expect(navLink('Puzzle').getAttribute('aria-current')).toBe('page')
  })

  it('Enter on a nav link activates it like a click (native button)', () => {
    // jsdom does not synthesise click from Enter; the native <button> does in browsers.
    // Assert the link is a real button with no key handler of its own.
    const link = navLink('Settings')
    expect(link.tagName).toBe('BUTTON')
    expect(link.type).toBe('button')
    expect(press('Enter', {}, link)).toBe(false)
  })

  it('1–9, N, M, H, Ctrl+Z on a nav link change nothing', () => {
    act(() => cell(emptyCells[0])!.click())
    act(() => cell(emptyCells[0])!.focus())
    press('7')
    const before = digits()
    const link = navLink('Settings')
    act(() => link.focus())
    for (const key of ['1', '5', '9', 'n', 'N', 'm', 'M', 'h', 'H', 'Backspace']) {
      expect(press(key, {}, link), key).toBe(false)
    }
    expect(press('z', { ctrlKey: true }, link)).toBe(false)
    expect(press('z', { metaKey: true }, link)).toBe(false)
    expect(digits()).toBe(before)
    expect(host.querySelector('.segment--active')?.textContent).toBe('Digit')
    expect(host.querySelector('.mode-status')?.textContent).toMatch(/^cell-first/)
  })

  it('round trip to Settings keeps digits, Notes, selection and Undo history', () => {
    const [a, b] = emptyCells
    act(() => cell(a)!.focus())
    press(solution[a])
    act(() => cell(b)!.focus())
    press('N')
    press('3')
    press('N')
    const grid = digits()
    expect(cell(b)!.getAttribute('aria-label')).toMatch(/notes 3$/)

    act(() => navLink('Settings').click())
    act(() => navLink('Puzzle').click())

    expect(digits()).toBe(grid)
    expect(cell(b)!.getAttribute('aria-current')).toBe('true')
    expect(document.activeElement).toBe(cell(b))
    press('z', { ctrlKey: true })
    expect(cell(b)!.getAttribute('aria-label')).toMatch(/empty$/)
    press('z', { ctrlKey: true })
    expect(cell(a)!.textContent).toBe('')
  })
})
