// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { cityById } from '../../src/content/cities.ts'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { Album, AppState } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'
import { nearly } from './city-fixtures.ts'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const albumCss = readFileSync(resolve(process.cwd(), 'src/ui/album.css'), 'utf8')

const TODAY = '2026-10-07'
const LISBON = cityById('lisbon')!
const lisbonPuzzle = cityPuzzle('lisbon')!

let host: HTMLDivElement
let root: Root | null = null

function mount(initialState: AppState) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(createElement(App, { initialState, today: TODAY })))
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host.remove()
})

const card = (cityId: string, collectedOn = '2026-10-01') => ({ cityId, collectedOn, revealed: true })
/** Europe with three Near Postcards and Lisbon collected on 30 Sep. */
const ALBUM: Album = [card('europe-near-1'), card('europe-near-2'), card('europe-near-3'), card('lisbon', '2026-09-30')]
const collected = (): AppState => ({ ...createInitialState(), album: ALBUM })
/** Lisbon collected, with a replay in progress one digit from solved. */
const replaying = (): AppState => nearly(collected(), 'lisbon')

const slot = (id: string) => host.querySelector<HTMLButtonElement>(`.album-slot[data-city="${id}"]`)!
const carryOn = () => host.querySelector<HTMLButtonElement>('.album-slot-carry-on')
const viewer = () => host.querySelector<HTMLElement>('.album-viewer section.postcard')
const button = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === name)
const heading = () => host.querySelector<HTMLHeadingElement>('main h1')
const tab = (prefix: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Regions"] button')].find((b) => b.textContent!.startsWith(prefix))!
const grid = () => [...host.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent || '0').join('')
const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!

function press(key: string, target: Element | null = document.activeElement): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  act(() => {
    target!.dispatchEvent(e)
  })
  return e
}

const openLisbon = () => act(() => slot('lisbon').click())

describe('the Collected slot', () => {
  it('is a native button named "… — See Postcard"; Enter is left to the browser, which clicks it', () => {
    mount(collected())
    const face = slot('lisbon')
    expect(face.tagName).toBe('BUTTON')
    expect(face.type).toBe('button')
    expect(face.getAttribute('aria-label')).toBe('Lisbon, Portugal, Mid — See Postcard')
    expect(carryOn()).toBeNull()
    act(() => face.focus())
    expect(press('Enter', face).defaultPrevented).toBe(false)
    act(() => face.click())
    expect(viewer()).not.toBeNull()
  })

  it('with a replay in progress adds a sibling "Carry on" in the same list item', () => {
    mount(replaying())
    const face = slot('lisbon')
    expect(face.className).toContain('album-slot--replay')
    const c = carryOn()!
    expect(c.textContent).toBe('Carry on')
    expect(c.getAttribute('aria-label')).toBe('Lisbon, Portugal, Mid — Carry on')
    expect(c.parentElement).toBe(face.parentElement)
    expect(face.contains(c)).toBe(false)
  })
})

describe('the Postcard viewer', () => {
  it('shows the Postcard over the Album: line, Postmark = collectedOn, "Play again" focused, non-modal dialog', () => {
    mount(collected())
    openLisbon()
    const pc = viewer()!
    expect(pc.getAttribute('role')).toBe('dialog')
    expect(pc.hasAttribute('aria-modal')).toBe(false)
    expect(pc.getAttribute('aria-label')).toBe('Postcard from Lisbon')
    expect(pc.querySelector('.postcard-line')!.textContent).toBe(LISBON.line)
    expect(pc.querySelector('.postmark')!.textContent).toBe('Lisbon30 SEP 26')
    expect(document.activeElement).toBe(button('Play again'))
    expect(button('Play again')!.className).toBe('button button--primary')
    // Non-blocking: the Album stays in place and nothing is inert.
    expect(heading()!.textContent).toBe('Where to next?')
    expect(host.querySelectorAll('[inert]')).toHaveLength(0)
    expect(pc.closest('.album-slots-area')).not.toBeNull()
  })

  it('Esc closes it and focus returns to the slot', () => {
    mount(collected())
    openLisbon()
    press('Escape', button('Play again'))
    expect(viewer()).toBeNull()
    expect(document.activeElement).toBe(slot('lisbon'))
  })

  it('Esc after focus left the viewer still closes it', () => {
    mount(collected())
    openLisbon()
    act(() => (document.activeElement as HTMLElement).blur())
    press('Escape', document.body)
    expect(viewer()).toBeNull()
    expect(document.activeElement).toBe(slot('lisbon'))
  })

  it('a click outside closes it and focus returns to the slot', () => {
    mount(collected())
    openLisbon()
    act(() => viewer()!.querySelector<HTMLElement>('.postcard-face')!.click())
    expect(viewer()).not.toBeNull()
    act(() => document.body.click())
    expect(viewer()).toBeNull()
    expect(document.activeElement).toBe(slot('lisbon'))
  })

  it('a click outside also does its own action: a Reachable slot travels', () => {
    mount(collected())
    openLisbon()
    act(() => slot('europe-near-4').click())
    expect(viewer()).toBeNull()
    expect(host.querySelector('header .puzzle-title')!.textContent).toBe('Amsterdam · Near · Easy')
  })

  it('a click on another Collected slot opens that Postcard instead', () => {
    mount(collected())
    openLisbon()
    act(() => slot('europe-near-1').click())
    expect(viewer()!.getAttribute('aria-label')).toBe('Postcard from Paris')
    expect(host.querySelectorAll('.album-viewer')).toHaveLength(1)
  })

  it('a Region tab closes it', () => {
    mount(collected())
    openLisbon()
    act(() => tab('Asia').click())
    expect(viewer()).toBeNull()
  })

  it('"Play again" opens a fresh Lisbon grid; the Album count is unchanged', () => {
    mount(collected())
    openLisbon()
    act(() => button('Play again')!.click())
    expect(viewer()).toBeNull()
    expect(host.querySelector('header .puzzle-title')!.textContent).toBe('Lisbon · Mid · Medium')
    expect(grid()).toBe(lisbonPuzzle.givens)
    expect(host.querySelector('section.postcard')).toBeNull()
    act(() => button('Album')!.click())
    expect(tab('Europe').textContent).toBe('Europe 4 / 10')
    expect(carryOn()).not.toBeNull()
  })
})

describe('the replay confirm', () => {
  it('"Play again" with a replay in progress asks inline, focus on "Keep going"', () => {
    mount(replaying())
    openLisbon()
    act(() => button('Play again')!.click())
    const group = viewer()!.querySelector('[role="group"]')!
    expect(group.className).toBe('action-row action-row--confirm')
    expect(group.getAttribute('aria-label')).toBe('Start Lisbon again?')
    expect(group.querySelector('.action-row-text')!.textContent).toBe('This replaces your replay in progress.')
    expect([...group.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Start fresh', 'Keep going'])
    expect(button('Play again')).toBeUndefined()
    expect(document.activeElement).toBe(button('Keep going'))
  })

  it('Esc during the confirm closes the whole viewer', () => {
    mount(replaying())
    openLisbon()
    act(() => button('Play again')!.click())
    press('Escape', button('Keep going'))
    expect(viewer()).toBeNull()
    expect(document.activeElement).toBe(slot('lisbon'))
  })

  it('"Start fresh" opens a fresh grid', () => {
    mount(replaying())
    openLisbon()
    act(() => button('Play again')!.click())
    act(() => button('Start fresh')!.click())
    expect(grid()).toBe(lisbonPuzzle.givens)
  })

  it('"Keep going" opens the replay as it was left', () => {
    const state = replaying()
    mount(state)
    openLisbon()
    act(() => button('Play again')!.click())
    act(() => button('Keep going')!.click())
    expect(grid()).toBe(state.sessions['city:lisbon'].digits)
  })
})

describe('"Carry on" and solving again', () => {
  it('"Carry on" opens the replay; one keyed digit shows "Solved again", no Postcard, and the slot is plain Collected', () => {
    const state = replaying()
    mount(state)
    act(() => carryOn()!.click())
    const digits = state.sessions['city:lisbon'].digits
    expect(grid()).toBe(digits)
    const last = digits.indexOf('0')
    act(() => cell(last).focus())
    press(lisbonPuzzle.solution[last])
    expect(host.querySelector('section.postcard')).toBeNull()
    expect(host.querySelector('.puzzle-status')!.textContent).toBe('Solved again. Lisbon is already in your Album. Album')
    act(() => button('Album')!.click())
    expect(slot('lisbon').className).toBe('album-slot album-slot--collected')
    expect(carryOn()).toBeNull()
    expect(tab('Europe').textContent).toBe('Europe 4 / 10')
  })
})

describe('viewer styles', () => {
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(albumCss)![1]
  }

  it('in place over the slots, centred, the reveal’s width, no motion; the button row on card', () => {
    const v = rule('.album-viewer')
    expect(v).toContain('position: absolute')
    expect(v).toContain('width: min(var(--size-postcard-width), 100%)')
    expect(v).toContain('translate(-50%, -50%)')
    expect(v).not.toContain('animation')
    expect(rule('.album-slots-area')).toContain('position: relative')
    expect(rule('.album-viewer .postcard-actions')).toContain('background-color: var(--color-card)')
    expect(albumCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
  })

  it('forced colours: the viewer’s button row keeps a CanvasText edge', () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(albumCss)![1]
    expect(forced).toMatch(/\.album-viewer \.postcard-actions\s*\{[^}]*CanvasText/)
  })
})
