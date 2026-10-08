// @vitest-environment jsdom
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cityPuzzle } from '../../src/content/city-puzzles.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cityKey } from '../../src/game/journey.ts'
import { createInitialState, createSession, DEFAULT_SETTINGS, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { AppState, Session } from '../../src/game/types.ts'
import { toDocument, type SaveDocument } from '../../src/persistence/document.ts'
import type { SaveStore } from '../../src/persistence/store.ts'
import { boot as bootApp, LOAD_TIMEOUT_MS } from '../../src/ui/boot.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const TODAY = '2026-10-08'
const PARIS = 'europe-near-1'
const LONDON = 'europe-near-2'
const TOKYO = 'asia-near-1'

/** An in-memory stand-in for IndexedDB (jsdom has none): the value survives remounts, like a reload. */
function fakeStore(initial?: unknown) {
  const box = { value: initial }
  const save = vi.fn(async (doc: SaveDocument) => {
    box.value = structuredClone(doc)
  })
  const store: SaveStore = { load: async () => box.value, save }
  return { store, save, box }
}

let host: HTMLDivElement | null = null
let root: Root | null = null

/** Start the app exactly as main.tsx does (`ui/boot`), on `html` (the page's <html> by default). */
async function boot(fake: ReturnType<typeof fakeStore>, html: HTMLElement = document.documentElement) {
  host = document.createElement('div')
  document.body.appendChild(host)
  await act(async () => {
    root = await bootApp(fake.store, host!, html, { today: TODAY })
  })
}

function unmount() {
  act(() => root?.unmount())
  root = null
  host?.remove()
  host = null
}

/** Close the tab and open it again on the same storage. */
async function reload(fake: ReturnType<typeof fakeStore>) {
  await flush()
  unmount()
  await boot(fake)
}

/** Let queued writes run. */
const flush = () => act(async () => new Promise<void>((r) => setTimeout(r, 0)))

afterEach(() => {
  unmount()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.ready
  vi.useRealTimers()
})

const q = <E extends Element = HTMLElement>(sel: string) => host!.querySelector<E>(sel)
const navLink = (name: string) => [...host!.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const button = (label: string) =>
  [...host!.querySelectorAll<HTMLButtonElement>('main button')].find((b) => (b.querySelector('.button-label')?.textContent ?? b.textContent) === label)!
const segment = (prefix: string) => [...host!.querySelectorAll<HTMLButtonElement>('.segment')].find((b) => b.textContent!.startsWith(prefix))!
const cell = (i: number) => q(`[data-cell="${i}"]`)!
const slot = (id: string) => q(`.album-slot[data-city="${id}"]`)!
const heading = () => q<HTMLHeadingElement>('main h1')!
const title = () => q('header .puzzle-title')?.textContent
const toggle = (prefix: string) =>
  [...host!.querySelectorAll<HTMLButtonElement>('[role="switch"]')].find((s) => s.textContent!.startsWith(prefix))!
const shownDigits = () => [...host!.querySelectorAll<HTMLElement>('[role="gridcell"]')].map((c) => (c.classList.contains('sudoku-cell--notes') ? '0' : c.textContent || '0')).join('')

function press(key: string, init: KeyboardEventInit = {}, target: Element | null = document.activeElement) {
  act(() => {
    target!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  })
}

const emptyCells = (givens: string) => [...givens].flatMap((d, i) => (d === '0' ? [i] : []))

/** A City Session part-played: the first `n` empty cells filled correctly, Notes 1 and 3 on the next. */
function partPlayed(cityId: string, n = 1): Session {
  const puzzle = cityPuzzle(cityId)!
  const key = cityKey(cityId)
  const open = emptyCells(puzzle.givens)
  const filled = new Set(open.slice(0, n))
  const digits = [...puzzle.givens].map((d, i) => (filled.has(i) ? puzzle.solution[i] : d)).join('')
  const notes = Array.from({ length: 81 }, (_, i) => (i === open[n] ? 0b101 : 0))
  return { ...createSession(key, puzzle), digits, notes }
}

function solvedCity(cityId: string): Session {
  const s = createSession(cityKey(cityId), cityPuzzle(cityId)!)
  return { ...s, digits: s.solution, status: 'solved' }
}

const docFor = (patch: Partial<AppState>) => toDocument({ ...createInitialState(), ...patch })
const card = (cityId: string, collectedOn: string, revealed = true) => ({ cityId, collectedOn, revealed })

describe('when to write', () => {
  it('a first visit writes nothing', async () => {
    const fake = fakeStore()
    await boot(fake)
    await flush()
    expect(heading().textContent).toBe('Where to first?')
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBeUndefined()
  })

  it('a restore writes nothing until a saved slice changes', async () => {
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS) } }))
    await boot(fake)
    await flush()
    expect(title()).toBe('Paris · Near · Easy')
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('an action that changes a saved slice writes the whole document once', async () => {
    const fake = fakeStore()
    await boot(fake)
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
    const doc = fake.box.value as SaveDocument
    expect(doc.schemaVersion).toBe(1)
    expect(Object.keys(doc).sort()).toEqual(['album', 'meta', 'schemaVersion', 'sessions', 'settings'])
    expect(doc.sessions[cityKey(PARIS)].digits).toBe(cityPuzzle(PARIS)!.givens)
  })

  it('UI-only actions never write: select, Notes mode, Hint steps, Restart confirm, screens, the viewer', async () => {
    const fake = fakeStore(
      docFor({
        album: [card(LONDON, '2026-10-01')],
        sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) },
        meta: { lastPlayedKey: FREE_PLAY_KEY },
      }),
    )
    await boot(fake)
    expect(title()).toBe('Free Play · Easy')
    const open = emptyCells(samplePuzzle.givens)
    act(() => cell(open[0]).focus())
    act(() => cell(open[1]).focus())
    act(() => segment('Notes').click())
    act(() => segment('Digit').click())
    act(() => button('Hint').click())
    act(() => button('Hint').click())
    press('Escape')
    act(() => button('Restart').click())
    act(() => button('Keep going').click())
    act(() => navLink('Settings').click())
    act(() => navLink('Free Play').click())
    act(() => navLink('Album').click())
    act(() => slot(LONDON).click())
    expect(q('.album-viewer section.postcard')).not.toBeNull()
    press('Escape')
    act(() => navLink('Puzzle').click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('rapid changes write in order and the stored document ends as the final state', async () => {
    const fake = fakeStore(docFor({ sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) } }))
    await boot(fake)
    const open = emptyCells(samplePuzzle.givens).slice(0, 3)
    for (const i of open) {
      act(() => cell(i).focus())
      press(samplePuzzle.solution[i])
    }
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(3)
    const placed = fake.save.mock.calls.map(([doc]) => open.filter((i) => doc.sessions[FREE_PLAY_KEY].digits[i] !== '0').length)
    expect(placed).toEqual([1, 2, 3])
    expect((fake.box.value as SaveDocument).sessions[FREE_PLAY_KEY].digits).toBe(shownDigits())
  })
})

describe('reload', () => {
  it('a City played, Notes taken and Lamplight on come back exactly, with Undo empty', async () => {
    const fake = fakeStore()
    await boot(fake)
    act(() => slot(PARIS).click())
    const { givens, solution } = cityPuzzle(PARIS)!
    const [a, b] = emptyCells(givens)
    act(() => cell(a).focus())
    press(solution[a])
    act(() => segment('Notes').click())
    act(() => cell(b).focus())
    press('2')
    press('7')
    act(() => navLink('Settings').click())
    act(() => toggle('Lamplight').click())
    act(() => navLink('Puzzle').click())
    const grid = shownDigits()
    expect(cell(b).textContent).toBe('27')

    await reload(fake)
    expect(title()).toBe('Paris · Near · Easy')
    expect(shownDigits()).toBe(grid)
    expect(cell(a).textContent).toBe(solution[a])
    expect(cell(b).textContent).toBe('27')
    expect(document.documentElement.dataset.theme).toBe('lamplight')
    // Undo history is not kept across a reload.
    const saves = fake.save.mock.calls.length
    act(() => cell(a).focus())
    press('z', { ctrlKey: true })
    expect(shownDigits()).toBe(grid)
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(saves)
  })

  it('several half-finished Cities and Free Play reopen as left; the Album reads "Carry on"; Settings kept', async () => {
    const paris = partPlayed(PARIS, 2)
    const tokyo = partPlayed(TOKYO, 1)
    const free = { ...createSession(FREE_PLAY_KEY, { ...samplePuzzle, difficulty: 'hard' as const }), notes: Array.from({ length: 81 }, (_, i) => (i === emptyCells(samplePuzzle.givens)[0] ? 0b110 : 0)) }
    const fake = fakeStore(
      docFor({
        sessions: { [paris.key]: paris, [tokyo.key]: tokyo, [FREE_PLAY_KEY]: free },
        settings: { ...DEFAULT_SETTINGS, mistakeHighlighting: true, sameDigitHighlighting: false, lamplight: true, freePlayDifficulty: 'hard' },
        meta: { lastPlayedKey: tokyo.key },
      }),
    )
    await boot(fake)
    // The launch rule opens the last-played City.
    expect(title()).toBe('Tokyo · Near · Easy')
    expect(shownDigits()).toBe(tokyo.digits)

    act(() => navLink('Album').click())
    expect(slot(PARIS).textContent).toContain('Carry on')
    act(() => slot(PARIS).click())
    expect(title()).toBe('Paris · Near · Easy')
    expect(shownDigits()).toBe(paris.digits)
    const noteCell = paris.notes.findIndex((m) => m !== 0)
    expect(cell(noteCell).textContent).toBe('13')

    act(() => navLink('Free Play').click())
    expect(segment('Hard').getAttribute('aria-pressed')).toBe('true')
    act(() => button('Carry on').click())
    expect(title()).toBe('Free Play · Hard')
    expect(cell(emptyCells(samplePuzzle.givens)[0]).textContent).toBe('23')

    act(() => navLink('Settings').click())
    expect(toggle('Mistake').getAttribute('aria-checked')).toBe('true')
    expect(toggle('Same-digit').getAttribute('aria-checked')).toBe('false')
    expect(toggle('Row').getAttribute('aria-checked')).toBe('true')
    expect(toggle('Lamplight').getAttribute('aria-checked')).toBe('true')
    expect(document.documentElement.dataset.theme).toBe('lamplight')
  })

  it('a solved last-played City gives way to the City in progress', async () => {
    const fake = fakeStore(
      docFor({
        album: [card(PARIS, '2026-10-01')],
        sessions: { [cityKey(PARIS)]: solvedCity(PARIS), [cityKey(LONDON)]: partPlayed(LONDON) },
        meta: { lastPlayedKey: cityKey(PARIS) },
      }),
    )
    await boot(fake)
    expect(title()).toMatch(/^London ·/)
  })

  it('an unrevealed Postcard shows first, and stays unrevealed if the page reloads during the reveal', async () => {
    const fake = fakeStore(
      docFor({
        album: [card(PARIS, '2026-10-07', false)],
        sessions: { [cityKey(LONDON)]: partPlayed(LONDON) },
        meta: { lastPlayedKey: cityKey(LONDON) },
      }),
    )
    await boot(fake)
    expect(title()).toBe('Paris · Near · Easy')
    expect(q('section.postcard')).not.toBeNull()
    await reload(fake)
    expect(q('section.postcard')).not.toBeNull()
    const add = [...host!.querySelectorAll<HTMLButtonElement>('section.postcard button')].find((b) => b.textContent === 'Add to Album')!
    act(() => add.click())
    await reload(fake)
    expect(q('section.postcard')).toBeNull()
    expect((fake.box.value as SaveDocument).album).toEqual([card(PARIS, '2026-10-07', true)])
  })

  it('a solve after a reload saves its Postcard, which survives another reload', async () => {
    const puzzle = cityPuzzle(PARIS)!
    const last = puzzle.givens.lastIndexOf('0')
    const digits = puzzle.solution.slice(0, last) + '0' + puzzle.solution.slice(last + 1)
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: { ...createSession(cityKey(PARIS), puzzle), digits } }, meta: { lastPlayedKey: cityKey(PARIS) } }))
    await boot(fake)
    act(() => cell(last).focus())
    press(puzzle.solution[last])
    expect(q('section.postcard')).not.toBeNull()
    await reload(fake)
    // The reveal shows again: the Postcard was saved unrevealed.
    expect(q('section.postcard')).not.toBeNull()
    const add = [...host!.querySelectorAll<HTMLButtonElement>('section.postcard button')].find((b) => b.textContent === 'Add to Album')!
    act(() => add.click())
    await reload(fake)
    expect(heading().textContent).toBe('Where to next?')
    expect(slot(PARIS).textContent).not.toContain('Carry on')
    expect((fake.box.value as SaveDocument).album).toEqual([card(PARIS, TODAY, true)])
  })

  it("a solved City's grid Postmark shows its Postcard's date; a City in progress shows today", async () => {
    const fake = fakeStore(
      docFor({
        album: [card(PARIS, '2026-09-30')],
        sessions: { [cityKey(PARIS)]: solvedCity(PARIS) },
        meta: { lastPlayedKey: cityKey(PARIS) },
      }),
    )
    await boot(fake)
    act(() => navLink('Puzzle').click())
    expect(title()).toBe('Paris · Near · Easy')
    expect(q('.grid-card .postmark')!.textContent).toBe('Paris30 SEP 26')

    act(() => navLink('Album').click())
    act(() => slot(LONDON).click())
    expect(q('.grid-card .postmark')!.textContent).toBe('London08 OCT 26')
  })
})

describe('unreadable saved data', () => {
  it.each([
    ['a newer schemaVersion', { ...docFor({}), schemaVersion: 2 }],
    ['a broken document', { schemaVersion: 1, album: 'nope' }],
  ])('%s: starts from defaults, never writes, and leaves the stored value untouched', async (_name, stored) => {
    const fake = fakeStore(stored)
    await boot(fake)
    expect(heading().textContent).toBe('Where to first?')
    act(() => slot(PARIS).click())
    act(() => navLink('Settings').click())
    act(() => toggle('Lamplight').click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBe(stored)
  })

  it('a load that rejects starts from defaults and never writes', async () => {
    const fake = fakeStore()
    fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    await boot(fake)
    expect(heading().textContent).toBe('Where to first?')
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })
})

describe('boot', () => {
  /** A detached <html> the App never touches, recording attribute and render order. */
  async function bootRecorded(fake: ReturnType<typeof fakeStore>) {
    const html = document.createElement('html')
    const order: string[] = []
    host = document.createElement('div')
    document.body.appendChild(host)
    const observer = new MutationObserver((records) => {
      for (const r of records) order.push(r.type === 'attributes' ? `attr ${r.attributeName}` : 'render')
    })
    observer.observe(html, { attributes: true })
    observer.observe(host, { childList: true })
    await act(async () => {
      root = await bootApp(fake.store, host!, html, { today: TODAY })
    })
    observer.disconnect()
    return { html, order }
  }

  it('sets data-theme (Lamplight document) and data-ready before the first render', async () => {
    const fake = fakeStore(docFor({ settings: { ...DEFAULT_SETTINGS, lamplight: true } }))
    const { html, order } = await bootRecorded(fake)
    expect(html.dataset.theme).toBe('lamplight')
    expect(html.hasAttribute('data-ready')).toBe(true)
    expect(order.slice(0, 3)).toEqual(['attr data-theme', 'attr data-ready', 'render'])
  })

  it.each([
    ['empty', undefined],
    ['Daylight', docFor({})],
  ])('an %s load sets data-ready but no data-theme', async (_name, stored) => {
    const { html } = await bootRecorded(fakeStore(stored))
    expect(html.hasAttribute('data-ready')).toBe(true)
    expect(html.hasAttribute('data-theme')).toBe(false)
  })

  it.each([
    ['empty', undefined],
    ['loaded', docFor({})],
  ])('saving is on after an %s load', async (_name, stored) => {
    const fake = fakeStore(stored)
    await boot(fake)
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
  })

  it('a load that never settles gives up after the timeout: page ready, defaults, saving off', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fake = fakeStore()
    fake.store.load = () => new Promise(() => {})
    host = document.createElement('div')
    document.body.appendChild(host)
    const html = document.createElement('html')
    await act(async () => {
      const started = bootApp(fake.store, host!, html, { today: TODAY })
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS - 1)
      expect(html.hasAttribute('data-ready')).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      root = await started
    })
    vi.useRealTimers()
    expect(html.hasAttribute('data-ready')).toBe(true)
    expect(heading().textContent).toBe('Where to first?')
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })
})

describe('a failed write', () => {
  it('is dropped quietly; play goes on and the next change stores the full latest state', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      const fake = fakeStore(docFor({ sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) } }))
      fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
      await boot(fake)
      const [a, b] = emptyCells(samplePuzzle.givens)
      act(() => cell(a).focus())
      press(samplePuzzle.solution[a])
      await flush()
      expect(fake.save).toHaveBeenCalledTimes(1)
      expect((fake.box.value as SaveDocument).sessions[FREE_PLAY_KEY].digits).toBe(samplePuzzle.givens)
      // Play continues.
      expect(cell(a).textContent).toBe(samplePuzzle.solution[a])
      act(() => cell(b).focus())
      press(samplePuzzle.solution[b])
      await flush()
      expect(fake.save).toHaveBeenCalledTimes(2)
      const digits = (fake.box.value as SaveDocument).sessions[FREE_PLAY_KEY].digits
      expect(digits[a]).toBe(samplePuzzle.solution[a])
      expect(digits[b]).toBe(samplePuzzle.solution[b])
      expect(digits).toBe(shownDigits())
      await new Promise((r) => setTimeout(r, 0))
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })
})
