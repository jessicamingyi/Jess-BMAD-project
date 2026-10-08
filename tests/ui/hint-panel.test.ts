// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'
import { HINT_POSITIONS, PUZZLES } from '../engine/fixtures.ts'

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
const panelButton = () => panel()!.querySelector<HTMLButtonElement>('.hint-panel-actions button')!
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

  it('the step button advances one step; "Show me the move" places the move and focus goes to the grid', () => {
    click(hintButton())
    expect(label()).toBe('Nudge')
    const button = panelButton()
    click(button)
    expect(panelButton()).toBe(button) // one stable button
    expect(label()).toBe('Explanation')
    expect(button.textContent).toBe('Show me the move')
    expect(button.hasAttribute('aria-disabled')).toBe(false)
    focus(button)
    click(button)
    expect(cell(40).textContent).toBe('5')
    expect(cell(40).getAttribute('aria-label')).toBe('Row 5, column 5, 5, your digit')
    expect(label()).toBe('Hint')
    expect(panelButton().textContent).toBe('Show a nudge')
    expect(text()).toBe('')
    expect(hinted()).toEqual([])
    expect(live()).toBe('5 placed, row 5, column 5')
    const tabStop = host.querySelector('[role="grid"] [tabindex="0"]')
    expect(document.activeElement).toBe(tabStop)
  })

  it('H at step 2 places the move; a third H opens a new nudge', () => {
    focus(cell(OTHER))
    press('h')
    press('h')
    press('h')
    expect(cell(40).textContent).toBe('5')
    expect(label()).toBe('Hint')
    expect(document.activeElement).toBe(cell(OTHER))
    press('h')
    expect(label()).toBe('Nudge')
    expect(cell(40).textContent).toBe('5')
  })

  it('the move lands over Notes: italic player digit, Notes hidden; Undo brings the Notes back', () => {
    focus(cell(40))
    press('n')
    press('3')
    expect(cell(40).getAttribute('aria-label')).toBe('Row 5, column 5, notes 3')
    press('h')
    press('h')
    press('h')
    expect(cell(40).getAttribute('aria-label')).toBe('Row 5, column 5, 5, your digit')
    press('z', { ctrlKey: true })
    expect(cell(40).getAttribute('aria-label')).toBe('Row 5, column 5, notes 3')
    expect(label()).toBe('Hint')
  })

  it('the action-row Hint at step 2 places the move too; focus stays on it', () => {
    const button = hintButton()
    focus(button)
    click(button)
    click(button)
    expect(label()).toBe('Explanation')
    click(button)
    expect(cell(40).textContent).toBe('5')
    expect(label()).toBe('Hint')
    expect(live()).toBe('5 placed, row 5, column 5')
    expect(document.activeElement).toBe(button)
  })

  it('the move placed with focus on the digit pad: focus stays put', () => {
    focus(cell(OTHER))
    press('h')
    press('h')
    const pad = host.querySelector<HTMLButtonElement>('.digit-pad-key')!
    focus(pad)
    press('h')
    expect(cell(40).textContent).toBe('5')
    expect(document.activeElement).toBe(pad)
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
    expect(names.slice(0, 4)).toEqual(['grid', "What's a naked single?", 'Explain it', 'Digit'])
    expect(names.slice(-3)).toEqual([expect.stringMatching(/^Undo/), 'HintH', 'Restart'])
  })
})

describe("What's a [Technique]?", () => {
  const link = () => panel()?.querySelector<HTMLButtonElement>('.hint-panel-link') ?? null
  const definition = () => panel()?.querySelector<HTMLElement>('.hint-panel-definition') ?? null
  const closeButton = () => definition()!.querySelector<HTMLButtonElement>('button')!
  const gridSnapshot = () => host.querySelector('[role="grid"]')!.outerHTML

  it('shows the link at steps 1 and 2, not when idle; it names the hardest Technique in the chain', () => {
    const digits = HINT_POSITIONS.pointing
    mount(createInitialState({ givens: digits, solution, difficulty: 'hard' }))
    focus(cell(digits.indexOf('0')))
    press('h')
    expect(label()).toBe('Nudge')
    expect(link()?.textContent).toBe("What's pointing?")
    expect(link()?.getAttribute('aria-expanded')).toBe('false')
    expect(link()?.hasAttribute('aria-controls')).toBe(false)
    expect(definition()).toBeNull()
    press('h')
    expect(label()).toBe('Explanation')
    expect(link()?.textContent).toBe("What's pointing?")
    press('h') // places the move: idle
    expect(label()).toBe('Hint')
    expect(link()).toBeNull()
  })

  it('opens below the link with focus on it; step, text, marks, live region and grid unchanged', () => {
    focus(cell(OTHER))
    press('h')
    const before = { text: text(), marks: hinted(), live: live(), grid: gridSnapshot() }
    focus(link()!)
    click(link()!)
    const def = definition()!
    expect(def).not.toBeNull()
    expect(link()!.getAttribute('aria-expanded')).toBe('true')
    expect(link()!.getAttribute('aria-controls')).toBe(def.id)
    expect(link()!.nextElementSibling).toBe(def)
    expect(def.getAttribute('role')).toBe('region')
    expect(def.tabIndex).toBe(-1)
    const title = def.querySelector('.hint-panel-definition-title')!
    expect(def.getAttribute('aria-labelledby')).toBe(title.id)
    expect(title.textContent).toBe('Naked single')
    expect(def.textContent).toContain(
      'A cell where only one digit is left, because the other eight are already in its row, column or box.',
    )
    expect(closeButton().textContent).toBe('Close')
    expect(document.activeElement).toBe(def)
    expect(label()).toBe('Nudge')
    expect({ text: text(), marks: hinted(), live: live(), grid: gridSnapshot() }).toEqual(before)
    expect(panel()!.contains(def)).toBe(true)
    expect(host.querySelector('.grid-card')!.contains(def)).toBe(false)
  })

  it('Esc closes it and focus returns to the link; a second Esc closes the panel', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    expect(document.activeElement).toBe(definition())
    expect(press('Escape')).toBe(true)
    expect(definition()).toBeNull()
    expect(label()).toBe('Nudge')
    expect(document.activeElement).toBe(link())
    press('Escape')
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(cell(OTHER))
  })

  it('the Close control and the link again close it; focus goes to the link', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    focus(closeButton())
    click(closeButton())
    expect(definition()).toBeNull()
    expect(document.activeElement).toBe(link())
    click(link()!)
    expect(definition()).not.toBeNull()
    focus(link()!)
    click(link()!)
    expect(definition()).toBeNull()
    expect(link()!.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(link())
  })

  it('Esc from the grid closes it and focus stays in the grid', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    focus(cell(OTHER))
    press('Escape')
    expect(definition()).toBeNull()
    expect(panel()).not.toBeNull()
    expect(document.activeElement).toBe(cell(OTHER))
  })

  it('Esc order: Restart confirm, then the definition, then the panel', () => {
    focus(cell(OTHER))
    // A correct digit (a Mistake would give a Mistake Hint, which has no definition).
    press(solution[OTHER])
    press('h')
    click(link()!)
    click(host.querySelector<HTMLButtonElement>('.action-row button:last-child')!)
    expect(host.querySelector('.action-row--confirm')).not.toBeNull()
    focus(cell(OTHER))
    press('Escape')
    expect(host.querySelector('.action-row--confirm')).toBeNull()
    expect(definition()).not.toBeNull()
    press('Escape')
    expect(definition()).toBeNull()
    expect(panel()).not.toBeNull()
    press('Escape')
    expect(panel()).toBeNull()
  })

  it('stays open when the step advances', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    focus(cell(OTHER))
    press('h')
    expect(label()).toBe('Explanation')
    expect(definition()).not.toBeNull()
  })

  it('a digit placed from the grid: panel idle, definition gone, focus stays in the grid', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    focus(cell(OTHER))
    press('1')
    expect(label()).toBe('Hint')
    expect(definition()).toBeNull()
    expect(link()).toBeNull()
    expect(document.activeElement).toBe(cell(OTHER))
  })

  it('a reset with focus in the definition sends focus to the grid tab stop', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    expect(document.activeElement).toBe(definition())
    press('z', { ctrlKey: true }) // nothing to undo: no change
    expect(document.activeElement).toBe(definition())
    press('5') // cell-first with OTHER selected: places a digit
    expect(label()).toBe('Hint')
    expect(definition()).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('[role="grid"] [tabindex="0"]'))
  })

  it('H with focus inside the open definition advances the step; focus and the definition stay', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    const def = definition()!
    expect(document.activeElement).toBe(def)
    press('h')
    expect(label()).toBe('Explanation')
    expect(definition()).toBe(def)
    expect(document.activeElement).toBe(def)
  })

  it('after Esc closes the panel, H opens a fresh Hint with the definition closed', () => {
    focus(cell(OTHER))
    press('h')
    click(link()!)
    focus(cell(OTHER))
    press('Escape')
    press('Escape')
    expect(panel()).toBeNull()
    press('h')
    expect(label()).toBe('Nudge')
    expect(definition()).toBeNull()
    expect(link()!.getAttribute('aria-expanded')).toBe('false')
  })

  it('a stray definitionOpen flag without a Technique never swallows Esc: it closes the panel', () => {
    const base = createInitialState(samplePuzzle)
    mount({ ...base, ui: { ...base.ui, hint: { sessionKey: 'free', step: 'idle', result: null, definitionOpen: true } } })
    focus(cell(OTHER))
    expect(panel()).not.toBeNull()
    expect(link()).toBeNull()
    expect(press('Escape')).toBe(true)
    expect(panel()).toBeNull()
  })

  it('opening it leaves the grid card first and in place', () => {
    const screen = host.querySelector('.puzzle-screen')!
    const card = host.querySelector('.grid-card')!
    focus(cell(OTHER))
    press('h')
    click(link()!)
    expect(screen.firstElementChild).toBe(card)
    expect(host.querySelector('.grid-card')).toBe(card)
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

describe('a Hint move that solves', () => {
  it('both the panel step button and the action-row Hint are aria-disabled, and clicking them changes nothing', () => {
    const last = solution.slice(0, 40) + '0' + solution.slice(41)
    mount(createInitialState({ givens: last, solution, difficulty: 'easy' }))
    const hint = hintButton()
    click(hint)
    click(hint)
    expect(label()).toBe('Explanation')
    click(panelButton())
    expect(cell(40).textContent).toBe('5')
    expect(live()).toBe('5 placed, row 5, column 5. Solved')
    expect(label()).toBe('Hint')
    for (const b of [panelButton(), hintButton()]) {
      expect(b.getAttribute('aria-disabled')).toBe('true')
      expect(b.disabled).toBe(false)
    }
    const before = host.innerHTML
    click(panelButton())
    click(hintButton())
    expect(host.innerHTML).toBe(before)
  })
})

describe('solved Puzzle', () => {
  it('Hint is aria-disabled, focusable, and does nothing (click or H)', () => {
    const solvedState = createInitialState(samplePuzzle)
    // Nothing in progress: the launch rule opens the Album with the last-played Puzzle current; "Puzzle" returns to it.
    mount({
      ...solvedState,
      sessions: { free: { ...solvedState.sessions.free, digits: solution, status: 'solved' } },
      meta: { lastPlayedKey: FREE_PLAY_KEY },
    })
    click([...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === 'Puzzle')!)
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

describe('Mistake Hint', () => {
  /** Row 4, column 6 (1-based): empty in the sample. */
  const M = 32
  /** Row 6, column 6: a later Mistake. */
  const M2 = 50
  const wrongAt = (c: number) => String((Number(solution[c]) % 9) + 1)
  const mistakes = () => [...host.querySelectorAll('.sudoku-cell--mistake')].map((el) => Number(el.getAttribute('data-cell')))

  beforeEach(() => {
    // A Note under M, then Mistakes at M2 and M; Mistake Assist Off (the default).
    focus(cell(M))
    press('n')
    press('3')
    press('n')
    focus(cell(M2))
    press(wrongAt(M2))
    focus(cell(M))
    press(wrongAt(M))
  })

  it('H×3 from the grid: row nudge, explanation without a link, then the clear; Notes back; Undo restores it', () => {
    expect(mistakes()).toEqual([])
    press('h')
    expect(label()).toBe('Nudge')
    expect(text()).toBe("One of your digits doesn't fit — look at row 4.")
    expect(panelButton().textContent).toBe('Explain it')
    expect(live()).toBe(text())
    expect(hinted()).toEqual([M])
    expect(panel()!.querySelector('.hint-panel-link')).toBeNull()
    // Assist Off: only the Hint's cell carries the Mistake mark and name.
    expect(mistakes()).toEqual([M])
    expect(cell(M).getAttribute('aria-label')).toBe(`Row 4, column 6, ${wrongAt(M)}, your digit, mistake, hint`)
    expect(cell(M2).getAttribute('aria-label')).toBe(`Row 6, column 6, ${wrongAt(M2)}, your digit`)
    press('h')
    expect(label()).toBe('Explanation')
    expect(text()).toBe(`The ${wrongAt(M)} in row 4, column 6 isn't part of this Puzzle's solution. Clearing it gets you back on track.`)
    expect(panelButton().textContent).toBe('Show me the move')
    expect(panel()!.textContent).not.toContain("What's a")
    expect(hinted()).toEqual([M])
    expect(mistakes()).toEqual([M])
    press('h')
    expect(cell(M).getAttribute('aria-label')).toBe('Row 4, column 6, notes 3')
    expect(live()).toBe('row 4, column 6 cleared')
    expect(label()).toBe('Hint')
    expect(hinted()).toEqual([])
    expect(mistakes()).toEqual([])
    press('z', { ctrlKey: true })
    expect(cell(M).textContent).toBe(wrongAt(M))
    expect(label()).toBe('Hint')
    expect(mistakes()).toEqual([])
  })

  it('Esc at step 1 closes the panel and the forced mark goes with it', () => {
    press('h')
    expect(mistakes()).toEqual([M])
    press('Escape')
    expect(panel()).toBeNull()
    expect(mistakes()).toEqual([])
  })

  it('the action-row Hint and "Show me the move" clear it too', () => {
    click(hintButton())
    click(hintButton())
    click(panelButton())
    expect(cell(M).textContent).not.toBe(wrongAt(M))
    expect(live()).toBe('row 4, column 6 cleared')
    // The next Hint reports the next Mistake.
    click(hintButton())
    expect(text()).toBe("One of your digits doesn't fit — look at row 6.")
  })
})

describe("Something doesn't fit yet", () => {
  /** Two side-by-side empty cells in one row. */
  const A = [...givens].findIndex((ch, i) => ch === '0' && i % 9 !== 8 && givens[i + 1] === '0')
  const B = A + 1
  const line = () => host.querySelector<HTMLElement>('.full-grid-line')
  const lineButton = () => line()!.querySelector<HTMLButtonElement>('button')!
  /** Every player cell holds its solution digit except A (B's digit) and B (empty). */
  function mountAlmost() {
    const base = createInitialState(samplePuzzle)
    const digits = solution.slice(0, A) + solution[B] + '0' + solution.slice(B + 1)
    mount({ ...base, sessions: { free: { ...base.sessions.free, digits } } })
  }
  /** Fill B with A's digit: the grid is full and wrong. */
  function fillWrong() {
    focus(cell(B))
    press(solution[A])
  }

  beforeEach(mountAlmost)

  it('appears when the grid fills up wrong: below the action row, default-style Hint; cue announced; grid in place', () => {
    const screen = host.querySelector('.puzzle-screen')!
    const card = host.querySelector('.grid-card')!
    expect(line()).toBeNull()
    fillWrong()
    expect(line()).not.toBeNull()
    expect(line()!.textContent).toBe("Something doesn't fit yet — want a hint?Hint")
    expect(line()!.classList.contains('puzzle-status')).toBe(true)
    expect(line()!.previousElementSibling?.classList.contains('action-row')).toBe(true)
    expect(line()!.closest('.side-column')).not.toBeNull()
    expect(lineButton().classList.contains('button')).toBe(true)
    expect(lineButton().classList.contains('button--primary')).toBe(false)
    expect(line()!.hasAttribute('aria-live')).toBe(false)
    expect(live()).toBe(`${solution[A]}. Something doesn't fit yet — want a hint?`)
    expect(screen.firstElementChild).toBe(card)
    expect(host.querySelector('.grid-card')).toBe(card)
    expect(card.contains(line())).toBe(false)
    // Still in progress: no solved line, Hint not disabled.
    expect(host.textContent).not.toContain('Solved')
    expect(hintButton().hasAttribute('aria-disabled')).toBe(false)
  })

  it('its Hint opens step 1 of the Mistake Hint, then explains, then clears; the line goes and focus moves to the grid', () => {
    fillWrong()
    focus(lineButton())
    click(lineButton())
    expect(label()).toBe('Nudge')
    expect(text()).toBe(`One of your digits doesn't fit — look at row ${Math.floor(A / 9) + 1}.`)
    expect(hinted()).toEqual([A])
    click(lineButton())
    expect(label()).toBe('Explanation')
    expect(document.activeElement).toBe(lineButton())
    click(lineButton())
    expect(cell(A).getAttribute('aria-label')).toMatch(/empty$/)
    expect(line()).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('[role="grid"] [tabindex="0"]'))
  })

  it('side-column focus order: panel, mode indicator, pad, Undo · Hint · Restart, then the line', () => {
    fillWrong()
    press('h')
    const side = host.querySelector('.side-column')!
    const tabbable = [...side.querySelectorAll<HTMLElement>('button, [tabindex]')].filter((el) => el.tabIndex >= 0)
    const names = tabbable.map((el) => el.textContent)
    expect(names[0]).toBe('Explain it')
    expect(names[1]).toBe('Digit')
    expect(names.slice(-4)).toEqual([expect.stringMatching(/^Undo/), 'HintH', 'Restart', 'Hint'])
    // The line's "Hint" is described by the line, so it isn't just a second "Hint".
    const describedBy = lineButton().getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe("Something doesn't fit yet — want a hint?")
    expect(line()!.contains(document.getElementById(describedBy!))).toBe(true)
  })

  it('goes when a cell is emptied by the player; focus stays put when it was not in the line', () => {
    fillWrong()
    expect(line()).not.toBeNull()
    focus(cell(B))
    press('Backspace')
    expect(line()).toBeNull()
    expect(document.activeElement).toBe(cell(B))
  })

  const tabStop = () => host.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')

  it('Undo from inside the line: the line goes and focus lands on the grid', () => {
    fillWrong()
    focus(lineButton())
    expect(press('z', { ctrlKey: true })).toBe(true)
    expect(line()).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(tabStop())
    expect(document.activeElement?.getAttribute('role')).toBe('gridcell')
  })

  it('Backspace from inside the line empties the selected cell: the line goes and focus lands on the grid', () => {
    fillWrong()
    focus(lineButton())
    expect(press('Backspace')).toBe(true)
    expect(cell(B).getAttribute('aria-label')).toMatch(/empty$/)
    expect(line()).toBeNull()
    expect(document.activeElement).toBe(tabStop())
    expect(document.activeElement?.getAttribute('role')).toBe('gridcell')
  })

  it('Restart (its confirm takes focus out of the line first): the line goes and focus returns to Restart, not body', () => {
    fillWrong()
    focus(lineButton())
    click(host.querySelector<HTMLButtonElement>('.action-row button:last-child')!)
    expect(document.activeElement?.textContent).toBe('Keep going')
    click([...host.querySelectorAll<HTMLButtonElement>('.action-row--confirm button')].find((b) => b.textContent === 'Restart')!)
    expect(line()).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.textContent).toBe('Restart')
  })

  it('goes when the grid is solved', () => {
    fillWrong()
    focus(cell(A))
    press(solution[A])
    expect(line()).not.toBeNull()
    focus(lineButton())
    focus(cell(B))
    press(solution[B])
    expect(line()).toBeNull()
    expect(host.textContent).toContain('Solved. Another one?')
  })
})
