// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { Album, AppState, Session } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root | null = null

function mount(initialState: AppState) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(createElement(App, { initialState, today: '2026-10-08' })))
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host.remove()
})

const PARIS = 'europe-near-1'
const TOKYO = 'asia-near-1'
const NO_RUSH = 'No rush - your Puzzle will wait.'

const navLink = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const heading = () => host.querySelector<HTMLHeadingElement>('main h1')!
const title = () => host.querySelector('header .puzzle-title')?.textContent
const tab = (prefix: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Regions"] button')].find((b) => b.textContent!.startsWith(prefix))!
const gridStop = () => host.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')
const cell = (i: number) => host.querySelector<HTMLElement>(`[data-cell="${i}"]`)!
const noRush = () => host.querySelector('.album-no-rush')

/** Paris with one player digit and one cell of Notes (1 and 3). */
function parisPlayed(): Session {
  const puzzle = cityPuzzle(PARIS)!
  const empty = [...puzzle.givens].flatMap((d, i) => (d === '0' ? [i] : []))
  const [digitCell, noteCell] = empty
  const digits = puzzle.givens.slice(0, digitCell) + puzzle.solution[digitCell] + puzzle.givens.slice(digitCell + 1)
  const notes = Array.from({ length: 81 }, (_, i) => (i === noteCell ? 0b101 : 0))
  return { ...createSession(cityKey(PARIS), puzzle), digits, notes }
}

function state(sessions: Record<string, Session>, lastPlayedKey: string | null, album: Album = []): AppState {
  return { ...createInitialState(), album, sessions, meta: { lastPlayedKey } }
}

const revealed = (...ids: string[]): Album => ids.map((cityId) => ({ cityId, collectedOn: '2026-10-01', revealed: true }))

describe('launch with a Puzzle in progress', () => {
  it('opens the last-played Puzzle with digits and Notes as stored, focus on the grid tab stop', () => {
    const paris = parisPlayed()
    mount(state({ [cityKey(PARIS)]: paris, [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) }, cityKey(PARIS)))
    expect(title()).toBe('Paris · Near · Easy')
    const shown = [...host.querySelectorAll<HTMLElement>('[role="gridcell"]')].map((c) => c.textContent || '0')
    const digitCell = paris.digits.split('').findIndex((d, i) => d !== paris.givens[i])
    expect(shown[digitCell]).toBe(paris.digits[digitCell])
    const noteCell = paris.notes.findIndex((m) => m !== 0)
    expect(cell(noteCell).classList.contains('sudoku-cell--notes')).toBe(true)
    expect(cell(noteCell).textContent).toBe('13')
    expect(gridStop()).not.toBeNull()
    expect(document.activeElement).toBe(gridStop())
    expect(navLink('Puzzle').hasAttribute('aria-disabled')).toBe(false)
    expect(navLink('Puzzle').getAttribute('aria-current')).toBe('page')
  })

  it('a solved last-played Puzzle gives way to the first City in progress', () => {
    const solved = { ...createSession(cityKey(TOKYO), cityPuzzle(TOKYO)!), status: 'solved' as const }
    mount(state({ [cityKey(TOKYO)]: solved, [cityKey(PARIS)]: parisPlayed() }, cityKey(TOKYO)))
    expect(title()).toBe('Paris · Near · Easy')
    expect(document.activeElement).toBe(gridStop())
  })

  it('the Album then shows "No rush" under the heading, and "Puzzle" returns to the grid with focus', () => {
    mount(state({ [cityKey(PARIS)]: parisPlayed() }, cityKey(PARIS)))
    act(() => navLink('Album').click())
    const line = noRush()!
    expect(line.textContent).toBe(NO_RUSH)
    expect(line.tagName).toBe('P')
    expect(line.previousElementSibling).toBe(heading())
    expect(line.nextElementSibling!.className).toBe('album-tabs')
    act(() => navLink('Puzzle').click())
    expect(title()).toBe('Paris · Near · Easy')
    expect(document.activeElement).toBe(gridStop())
  })
})

describe('after launching onto a Puzzle', () => {
  it('focus moves once on mount: a re-render on the same screen does not pull it back to the grid', () => {
    mount(state({ [cityKey(PARIS)]: parisPlayed() }, cityKey(PARIS)))
    const stop = gridStop()
    expect(document.activeElement).toBe(stop)
    const notes = [...host.querySelectorAll<HTMLButtonElement>('.segment')].find((b) => b.textContent!.startsWith('Notes'))!
    act(() => notes.focus())
    act(() => notes.click())
    expect(notes.getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(notes)
  })

  it('the first Album visit opens on the latest Postcard’s Region', () => {
    mount(state({ [cityKey(PARIS)]: parisPlayed() }, cityKey(PARIS), revealed(TOKYO)))
    expect(title()).toBe('Paris · Near · Easy')
    act(() => navLink('Album').click())
    expect(tab('Asia').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('launch with nothing in progress', () => {
  it('opens the Album on the latest Postcard’s Region with focus on the heading; "Puzzle" disabled, no "No rush"', () => {
    mount(state({}, null, revealed(PARIS, TOKYO)))
    expect(heading().textContent).toBe('Where to next?')
    expect(document.activeElement).toBe(heading())
    expect(tab('Asia').getAttribute('aria-pressed')).toBe('true')
    expect(navLink('Puzzle').getAttribute('aria-disabled')).toBe('true')
    act(() => navLink('Puzzle').click())
    expect(heading().textContent).toBe('Where to next?')
    expect(noRush()).toBeNull()
  })

  it('an empty start opens "Where to first?" on Europe', () => {
    mount(createInitialState())
    expect(heading().textContent).toBe('Where to first?')
    expect(document.activeElement).toBe(heading())
    expect(tab('Europe').getAttribute('aria-pressed')).toBe('true')
  })

  it('a solved last-played Puzzle is current: "Puzzle" is enabled and returns to it', () => {
    const solved = { ...createSession(cityKey(PARIS), cityPuzzle(PARIS)!), status: 'solved' as const }
    mount(state({ [cityKey(PARIS)]: { ...solved, digits: solved.solution } }, cityKey(PARIS), revealed(PARIS)))
    expect(heading().textContent).toBe('Where to next?')
    expect(navLink('Puzzle').hasAttribute('aria-disabled')).toBe(false)
    expect(noRush()).toBeNull()
    act(() => navLink('Puzzle').click())
    expect(title()).toBe('Paris · Near · Easy')
    expect(document.activeElement).toBe(gridStop())
  })
})

describe('"No rush"', () => {
  it('shows for Free Play in progress', () => {
    mount(state({ [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) }, FREE_PLAY_KEY))
    expect(host.querySelector('.puzzle-screen')).not.toBeNull()
    act(() => navLink('Album').click())
    expect(noRush()!.textContent).toBe(NO_RUSH)
  })

  it('ignores an in-progress Session with an unknown key (nothing is resumable)', () => {
    const nope = { ...createSession('city:nope', cityPuzzle(PARIS)!), key: 'city:nope' }
    mount(state({ 'city:nope': nope }, 'city:nope'))
    expect(heading().textContent).toBe('Where to first?')
    expect(navLink('Puzzle').getAttribute('aria-disabled')).toBe('true')
    expect(noRush()).toBeNull()
  })

  it('goes once nothing is in progress', () => {
    const solved = { ...createSession(FREE_PLAY_KEY, samplePuzzle), status: 'solved' as const }
    mount(state({ [FREE_PLAY_KEY]: solved }, FREE_PLAY_KEY))
    expect(noRush()).toBeNull()
  })
})

describe('an unrevealed Postcard at launch', () => {
  it('shows the reveal first with focus on "Add to Album", then the Album as in 3.3', () => {
    // Paris is last played and in progress; Tokyo's Postcard still waits to be revealed.
    mount(state({ [cityKey(PARIS)]: parisPlayed() }, cityKey(PARIS), [{ cityId: TOKYO, collectedOn: '2026-10-07', revealed: false }]))
    const add = [...host.querySelectorAll<HTMLButtonElement>('section.postcard button')].find((b) => b.textContent === 'Add to Album')!
    expect(title()).toBe('Tokyo · Near · Easy')
    expect(document.activeElement).toBe(add)
    act(() => add.click())
    expect(heading().textContent).toBe('Where to next?')
    expect(tab('Asia').getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(heading())
    // Paris is still in progress and waits.
    expect(noRush()!.textContent).toBe(NO_RUSH)
  })
})
