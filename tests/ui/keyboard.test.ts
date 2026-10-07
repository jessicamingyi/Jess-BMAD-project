// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { App } from '../../src/ui/app.tsx'
import { keyToAction, type KeyContext } from '../../src/ui/keyboard.ts'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { givens } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
const EMPTY = emptyCells[0]
const GIVEN = givens.indexOf('5')

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

const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!
const value = (i: number) => cell(i).textContent
const live = () => host.querySelector('[aria-live="polite"]')!.textContent
const selected = () => [...host.querySelectorAll('[aria-current="true"]')].map((el) => Number(el.getAttribute('data-cell')))
const button = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.startsWith(name))!
const padKey = (d: number) => host.querySelectorAll<HTMLButtonElement>('.digit-pad-key')[d - 1]
const pressed = (name: string) => button(name).getAttribute('aria-pressed')

function focus(el: HTMLElement) {
  act(() => el.focus())
}

/** Dispatch a real keydown on the focused element (or `target`); returns whether it was preventDefault-ed. */
function press(key: string, init: KeyboardEventInit = {}, target: Element | null = document.activeElement): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    target!.dispatchEvent(event)
  })
  return event.defaultPrevented
}

describe('keyboard play on the mounted Puzzle screen', () => {
  it('arrows move the selection and focus, without wrapping', () => {
    focus(cell(40))
    expect(selected()).toEqual([40])
    expect(press('ArrowUp')).toBe(true)
    expect(selected()).toEqual([31])
    expect(document.activeElement).toBe(cell(31))
    press('ArrowRight')
    expect(document.activeElement).toBe(cell(32))
    press('ArrowDown')
    press('ArrowLeft')
    expect(document.activeElement).toBe(cell(40))

    focus(cell(4))
    expect(press('ArrowUp')).toBe(true)
    expect(selected()).toEqual([4])
    expect(document.activeElement).toBe(cell(4))
    focus(cell(8))
    press('ArrowRight')
    expect(selected()).toEqual([8])
  })

  it('keeps exactly one tab stop, on the selected cell (cell 0 before any selection)', () => {
    const stops = () => [...host.querySelectorAll('[role="gridcell"][tabindex="0"]')]
    expect(stops()).toEqual([cell(0)])
    expect(host.querySelectorAll('[role="gridcell"][tabindex="-1"]')).toHaveLength(80)
    focus(cell(40))
    press('ArrowDown')
    expect(stops()).toEqual([cell(49)])
  })

  it('cell-first: a digit key enters the digit, and in Notes toggles the Note', () => {
    focus(cell(EMPTY))
    press('7')
    expect(value(EMPTY)).toBe('7')
    expect(cell(EMPTY).getAttribute('aria-label')).toMatch(/, 7, your digit$/)
    expect(live()).toBe('7')

    focus(cell(emptyCells[1]))
    press('n')
    expect(pressed('Notes')).toBe('true')
    expect(live()).toBe('Notes')
    press('7')
    expect(cell(emptyCells[1]).getAttribute('aria-label')).toMatch(/, notes 7$/)
    expect(live()).toBe('note 7 added')
    press('7')
    expect(live()).toBe('note 7 removed')
  })

  it('number-first: a digit key chooses the current digit; Enter or Space places it in the grid', () => {
    focus(cell(EMPTY))
    press('m')
    expect(live()).toBe('number-first')
    press('7')
    expect(live()).toBe('current digit 7')
    expect(value(EMPTY)).toBe('')
    expect(press('Enter')).toBe(true)
    expect(value(EMPTY)).toBe('7')
    expect(live()).toBe('7')

    focus(cell(emptyCells[1]))
    expect(press(' ')).toBe(true)
    expect(value(emptyCells[1])).toBe('7')
  })

  it('a held digit key (auto-repeat) does not re-apply: the digit stays placed', () => {
    focus(cell(EMPTY))
    press('7')
    // Without the guard one repeat would clear it (same digit clears) and say "cleared".
    expect(press('7', { repeat: true })).toBe(false)
    expect(value(EMPTY)).toBe('7')
    expect(live()).toBe('7')
  })

  it('held arrows keep moving', () => {
    focus(cell(40))
    press('ArrowUp', { repeat: true })
    press('ArrowUp', { repeat: true })
    expect(document.activeElement).toBe(cell(22))
  })

  it('number-first: clicking a cell with the mouse places the current digit', () => {
    focus(cell(0))
    press('m')
    press('7')
    act(() => cell(EMPTY).click())
    expect(value(EMPTY)).toBe('7')
    expect(live()).toBe('7')
  })

  it('Enter and Space on a button are left to the button', () => {
    focus(cell(EMPTY))
    press('m')
    focus(padKey(3))
    expect(press('Enter')).toBe(false)
    expect(press(' ')).toBe(false)
  })

  it('Backspace/Delete clear a digit or Notes (undoably), and refuse a Given out loud', () => {
    focus(cell(EMPTY))
    press('7')
    press('Backspace')
    expect(value(EMPTY)).toBe('')
    expect(live()).toBe('cleared')

    press('n')
    press('3')
    press('5')
    press('Delete')
    expect(cell(EMPTY).getAttribute('aria-label')).toMatch(/, empty$/)
    press('z', { ctrlKey: true })
    expect(cell(EMPTY).getAttribute('aria-label')).toMatch(/, notes 3, 5$/)

    focus(cell(GIVEN))
    press('Backspace')
    expect(value(GIVEN)).toBe('5')
    expect(live()).toBe("Given, can't change")
    press('9')
    expect(value(GIVEN)).toBe('5')
    expect(live()).toBe("Given, can't change")
  })

  it('N, M, Ctrl+Z and H work from the side column', () => {
    focus(cell(EMPTY))
    press('4')
    focus(padKey(1))
    press('N')
    expect(pressed('Notes')).toBe('true')
    press('n')
    expect(pressed('Digit')).toBe('true')
    press('M')
    expect(pressed('Number first')).toBe('true')
    press('m')
    expect(pressed('Cell first')).toBe('true')
    const before = host.innerHTML
    expect(press('h')).toBe(false)
    expect(press('H')).toBe(false)
    expect(host.innerHTML).toBe(before)
    expect(press('z', { ctrlKey: true })).toBe(true)
    expect(value(EMPTY)).toBe('')
  })

  it('Cmd+Z is Undo on a Mac, Ctrl+Z elsewhere', () => {
    const ctx: KeyContext = {
      inGrid: false,
      inputMode: 'cellFirst',
      selectedCell: null,
      restartConfirming: false,
      isMac: true,
    }
    const k = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      ...mods,
    })
    expect(keyToAction(k('z', { metaKey: true }), ctx)).toEqual({ type: 'undoRequested' })
    expect(keyToAction(k('z', { ctrlKey: true }), ctx)).toBeNull()
    expect(keyToAction(k('z', { ctrlKey: true }), { ...ctx, isMac: false })).toEqual({ type: 'undoRequested' })
    expect(keyToAction(k('z', { metaKey: true }), { ...ctx, isMac: false })).toBeNull()
    expect(keyToAction(k('z', { ctrlKey: true, shiftKey: true }), { ...ctx, isMac: false })).toBeNull()
    expect(keyToAction(k('n', { ctrlKey: true }), ctx)).toBeNull()
    expect(keyToAction(k('ArrowUp'), ctx)).toBeNull()
  })

  it('keys pressed on body or the header change nothing', () => {
    focus(cell(EMPTY))
    press('7')
    const before = host.innerHTML
    act(() => (document.activeElement as HTMLElement).blur())
    const header = host.querySelector('.app-header')!
    for (const target of [document.body, header]) {
      for (const [key, init] of [
        ['5', {}],
        ['n', {}],
        ['m', {}],
        ['Backspace', {}],
        ['ArrowUp', {}],
        ['z', { ctrlKey: true }],
      ] as const) {
        expect(press(key, init, target)).toBe(false)
      }
    }
    expect(host.innerHTML).toBe(before)
  })

  it('Esc closes the Restart confirm and focus returns to Restart', () => {
    focus(cell(EMPTY))
    press('7')
    act(() => button('Restart').click())
    expect(document.activeElement?.textContent).toBe('Keep going')
    expect(press('Escape')).toBe(true)
    expect(host.querySelector('.action-row--confirm')).toBeNull()
    expect(document.activeElement).toBe(button('Restart'))
    expect(value(EMPTY)).toBe('7')
    expect(press('Escape')).toBe(false)
  })

  it('announces "Solved" when the last digit goes in', () => {
    const { solution } = samplePuzzle
    for (const c of emptyCells) {
      focus(cell(c))
      press(solution[c])
    }
    expect(live()).toBe('Solved')
    expect(host.textContent).toContain('Solved.')
  }, 20_000)

  it('re-announces the same text as a fresh node', () => {
    focus(cell(EMPTY))
    press('7')
    const first = host.querySelector('[aria-live="polite"] > span')
    focus(cell(emptyCells[1]))
    press('7')
    const second = host.querySelector('[aria-live="polite"] > span')
    expect(second?.textContent).toBe('7')
    expect(second).not.toBe(first)
  })

  it('Tab order: nav links, grid, entry segments, input segments, pad keys, Undo, Restart', () => {
    const tabbable = [...host.querySelectorAll<HTMLElement>('button, [tabindex]')].filter((el) => el.tabIndex >= 0)
    const names = tabbable.map((el) => (el.getAttribute('role') === 'gridcell' ? 'grid' : el.textContent))
    expect(names).toEqual([
      'Puzzle',
      'Settings',
      'grid',
      'Digit',
      'Notes',
      'Cell first',
      'Number first',
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => expect.stringMatching(new RegExp(`^${d}`))),
      expect.stringMatching(/^Undo/),
      'Restart',
    ])
  })
})
