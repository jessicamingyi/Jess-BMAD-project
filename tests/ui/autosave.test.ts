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
import { acquireSaveLock, LOCK_NAME } from '../../src/persistence/lock.ts'
import type { SaveStore } from '../../src/persistence/store.ts'
import { boot as bootApp, LOAD_TIMEOUT_MS, type BootOptions } from '../../src/ui/boot.tsx'

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
  /** Backup keys and their values, in the order written. */
  const backups = new Map<string, unknown>()
  const save = vi.fn(async (doc: SaveDocument) => {
    box.value = structuredClone(doc)
  })
  const saveBackup = vi.fn(async (key: string, raw: unknown) => {
    if (backups.has(key)) throw new Error(`${key} exists`)
    backups.set(key, raw)
  })
  const store: SaveStore = { load: async () => box.value, save, saveBackup }
  return { store, save, saveBackup, backups, box }
}

let host: HTMLDivElement | null = null
let root: Root | null = null

/** Start the app exactly as main.tsx does (`ui/boot`), on `html` (the page's <html> by default). */
async function boot(fake: ReturnType<typeof fakeStore>, options: Omit<BootOptions, 'today'> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  await act(async () => {
    root = await bootApp(fake.store, host!, document.documentElement, { today: TODAY, ...options })
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
const banner = () => q<HTMLElement>('.notice-banner')
const bannerText = () => banner()?.querySelector('p')?.textContent
const gotIt = () => banner()!.querySelector('button')!
const live = () => host!.querySelector('[aria-live="polite"]')!.textContent
/** Another tab holds the save lock. */
const otherTab = async () => ({ held: false, release: () => {} })
const UNREADABLE = "We couldn't read your saved progress. It's been kept safe, not overwritten."

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
  it('a newer schemaVersion that does not read as v1: defaults, read-only, never written, the stored value byte-for-byte untouched', async () => {
    const stored = { ...docFor({}), schemaVersion: 2, album: { renamed: true } }
    const bytes = JSON.stringify(stored)
    const fake = fakeStore(stored)
    await boot(fake)
    expect(heading().textContent).toBe('Where to first?')
    expect(bannerText()).toBe('A newer version saved your progress. Reload to carry on.')
    act(() => slot(PARIS).click())
    act(() => navLink('Settings').click())
    act(() => toggle('Lamplight').click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(fake.box.value).toBe(stored)
    expect(JSON.stringify(fake.box.value)).toBe(bytes)
  })

  it('a newer schemaVersion that still reads as v1: its half-finished Puzzle shows, not editable; never written', async () => {
    const stored = {
      ...docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS) } }),
      schemaVersion: 2,
      extra: 'from the future',
    }
    const bytes = JSON.stringify(stored)
    const fake = fakeStore(stored)
    await boot(fake)
    expect(title()).toBe('Paris · Near · Easy')
    expect(bannerText()).toBe('A newer version saved your progress. Reload to carry on.')
    expect(q('.grid-card')!.hasAttribute('inert')).toBe(true)
    expect(q('.side-column-body')!.hasAttribute('inert')).toBe(true)
    const before = shownDigits()
    const [, b] = emptyCells(cityPuzzle(PARIS)!.givens)
    act(() => cell(b).focus())
    press(cityPuzzle(PARIS)!.solution[b])
    expect(shownDigits()).toBe(before)
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(JSON.stringify(fake.box.value)).toBe(bytes)
  })

  it('a broken document: backed up first, defaults, the unreadable notice on the Album, then normal saving', async () => {
    const stored = { schemaVersion: 1, album: 'nope' }
    const fake = fakeStore(stored)
    await boot(fake, { now: () => new Date('2026-10-08T09:30:00.000Z') })
    expect(fake.backups).toEqual(new Map([['traveller-save-backup-2026-10-08T09:30:00.000Z', stored]]))
    // Then the main key gets the default document, so the next load is clean.
    expect(fake.save).toHaveBeenCalledTimes(1)
    expect(fake.box.value).toEqual(docFor({}))
    expect(heading().textContent).toBe('Where to first?')
    expect(bannerText()).toBe(UNREADABLE)
    expect(q('.app-banner .notice-banner')).not.toBeNull()
    expect(banner()!.classList.contains('notice-banner--info')).toBe(true)
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(2)
    expect((fake.box.value as SaveDocument).sessions[cityKey(PARIS)]).toBeDefined()
    // The backup is written once and never touched again.
    expect(fake.saveBackup).toHaveBeenCalledTimes(1)
  })

  it('a reload after an unreadable start makes no second backup', async () => {
    const fake = fakeStore({ schemaVersion: 1, album: 'nope' })
    await boot(fake)
    expect(fake.saveBackup).toHaveBeenCalledTimes(1)
    await reload(fake)
    expect(fake.saveBackup).toHaveBeenCalledTimes(1)
    expect(fake.backups.size).toBe(1)
    expect(banner()).toBeNull()
    expect(heading().textContent).toBe('Where to first?')
  })

  it('a migration that throws is unreadable: backup, defaults, banner', async () => {
    const stored = { ...docFor({}), schemaVersion: 0 }
    const fake = fakeStore(stored)
    await boot(fake, {
      migrations: [
        () => {
          throw new Error('boom')
        },
      ],
    })
    expect([...fake.backups.values()]).toEqual([stored])
    expect(bannerText()).toBe(UNREADABLE)
    expect(fake.box.value).toEqual(docFor({}))
  })

  it('the backup write fails: read-only with the unreadable text, nothing written, no throw', async () => {
    const stored = { schemaVersion: 1, album: 'nope' }
    const fake = fakeStore(stored)
    fake.saveBackup.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake)
    expect(bannerText()).toBe(UNREADABLE)
    expect(banner()!.dataset.banner).toBe('readOnly')
    act(() => slot(PARIS).click())
    await flush()
    expect(heading().textContent).toBe('Where to first?')
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBe(stored)
  })

  it('a load that rejects: defaults, read-only with the unreadable text, never writes', async () => {
    const fake = fakeStore()
    fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    await boot(fake)
    expect(heading().textContent).toBe('Where to first?')
    expect(bannerText()).toBe(UNREADABLE)
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })
})

describe('migrations', () => {
  /** A pretend v0 of `v1`: `album` was called `postcards`. */
  const toV0 = ({ album, ...rest }: SaveDocument) => ({ ...rest, schemaVersion: 0, postcards: album })
  const v0to1 = ({ postcards, ...doc }: Readonly<Record<string, unknown>>) => ({ ...doc, album: postcards })

  it('a v0 document loads as v1 with every Postcard and Session, written back once', async () => {
    const v1 = docFor({
      album: [card(LONDON, '2026-10-01')],
      sessions: { [cityKey(PARIS)]: partPlayed(PARIS, 2), [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) },
      meta: { lastPlayedKey: cityKey(PARIS) },
    })
    const fake = fakeStore(toV0(v1))
    await boot(fake, { migrations: [v0to1] })
    await flush()
    expect(title()).toBe('Paris · Near · Easy')
    expect(banner()).toBeNull()
    expect(fake.save).toHaveBeenCalledTimes(1)
    expect(fake.box.value).toEqual(v1)
    // Nothing more is written until a saved slice changes.
    act(() => navLink('Album').click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
  })

  it('the write-back is rejected: the Puzzle still loads and the save-failed banner shows', async () => {
    const v1 = docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS) } })
    const fake = fakeStore(toV0(v1))
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake, { migrations: [v0to1] })
    expect(title()).toBe('Paris · Near · Easy')
    expect(bannerText()).toBe("Your last change couldn't be saved. Your next move will try again - your Puzzle is still here.")
    expect(banner()!.classList.contains('notice-banner--alert')).toBe(true)
  })

  it('a second tab migrates in memory but never writes back', async () => {
    const v0 = toV0(docFor({ album: [card(LONDON, '2026-10-01')] }))
    const fake = fakeStore(v0)
    await boot(fake, { migrations: [v0to1], acquireLock: otherTab })
    await flush()
    expect(slot(LONDON).textContent).toContain('London')
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBe(v0)
  })
})

describe('a second tab', () => {
  const OTHER_TAB = 'Traveller Sudoku is open in another tab. Play there, or close it and reload this one.'

  it('shows the saved state read-only: banner, inert grid and side column, Hint unavailable, nothing written', async () => {
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS) } }))
    await boot(fake, { acquireLock: otherTab })
    expect(title()).toBe('Paris · Near · Easy')
    expect(bannerText()).toBe(OTHER_TAB)
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    // On the Puzzle screen the banner heads the side column and is not inert; the rest is.
    expect(q('.side-column')!.firstElementChild).toBe(banner())
    expect(banner()!.closest('[inert]')).toBeNull()
    expect(q('.app-banner')).toBeNull()
    expect(q('.grid-card')!.hasAttribute('inert')).toBe(true)
    expect(q('.side-column-body')!.hasAttribute('inert')).toBe(true)
    expect(button('Hint').getAttribute('aria-disabled')).toBe('true')
    const before = shownDigits()
    const [a] = emptyCells(cityPuzzle(PARIS)!.givens)
    // jsdom doesn't enforce inert, so this also proves the reducer refuses the change.
    act(() => cell(a).focus())
    press(cityPuzzle(PARIS)!.solution[a])
    press('h')
    act(() => button('Hint').click())
    expect(shownDigits()).toBe(before)
    expect(q('.hint-panel')).toBeNull()
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('can browse: open an existing Puzzle from the Album, never start a new one; Settings toggles are inert', async () => {
    const fake = fakeStore(
      docFor({
        sessions: { [cityKey(PARIS)]: partPlayed(PARIS), [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) },
        meta: { lastPlayedKey: FREE_PLAY_KEY },
      }),
    )
    await boot(fake, { acquireLock: otherTab })
    expect(title()).toBe('Free Play · Easy')
    act(() => navLink('Album').click())
    // Elsewhere the banner spans the content width under the header.
    expect(q('.app-banner .notice-banner')).not.toBeNull()
    expect(q('main .notice-banner')).toBeNull()
    act(() => slot(PARIS).click())
    expect(title()).toBe('Paris · Near · Easy')
    expect(q('.grid-card')!.hasAttribute('inert')).toBe(true)
    act(() => navLink('Album').click())
    // London has no Session yet: starting one would change a saved slice, so the Album stays.
    act(() => slot(LONDON).click())
    expect(heading().textContent).toBe('Where to first?')
    act(() => navLink('Settings').click())
    expect(toggle('Lamplight').closest('[inert]')).not.toBeNull()
    expect(toggle('Mistake').closest('[inert]')).not.toBeNull()
    act(() => toggle('Lamplight').click())
    expect(toggle('Lamplight').getAttribute('aria-checked')).toBe('false')
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('"Got it" hides the banner, the tab stays read-only, focus goes to the page heading', async () => {
    const fake = fakeStore()
    await boot(fake, { acquireLock: otherTab })
    act(() => gotIt().click())
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(heading())
    act(() => slot(PARIS).click())
    await flush()
    expect(heading().textContent).toBe('Where to first?')
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('"Got it" on the Puzzle screen: the inert grid can\'t take focus, so the current nav item does', async () => {
    const fake = fakeStore(docFor({ sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) } }))
    await boot(fake, { acquireLock: otherTab })
    act(() => gotIt().click())
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(navLink('Puzzle'))
    expect(q('.grid-card')!.hasAttribute('inert')).toBe(true)
  })

  it('a pending Postcard: the banner stays reachable during the reveal; "Add to Album" opens the Album; nothing is saved', async () => {
    const fake = fakeStore(docFor({ album: [card(PARIS, '2026-10-07', false)] }))
    await boot(fake, { acquireLock: otherTab })
    expect(q('section.postcard')).not.toBeNull()
    expect(q('.side-column')!.firstElementChild).toBe(banner())
    expect(gotIt().closest('[inert]')).toBeNull()
    expect(q('.side-column-body')!.hasAttribute('inert')).toBe(true)
    const add = [...host!.querySelectorAll<HTMLButtonElement>('section.postcard button')].find((b) => b.textContent === 'Add to Album')!
    act(() => add.click())
    expect(q('section.postcard')).toBeNull()
    expect(heading().textContent).toBe('Where to next?')
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('without the Web Locks API the tab is the writer', async () => {
    expect((navigator as Navigator & { locks?: unknown }).locks).toBeUndefined()
    const fake = fakeStore()
    await boot(fake)
    expect(banner()).toBeNull()
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
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

  it('a lock request that never settles gives up after the timeout: page ready, defaults, read-only', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) } }))
    host = document.createElement('div')
    document.body.appendChild(host)
    const html = document.createElement('html')
    await act(async () => {
      const started = bootApp(fake.store, host!, html, { today: TODAY, acquireLock: () => new Promise(() => {}) })
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS - 1)
      expect(html.hasAttribute('data-ready')).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      root = await started
    })
    vi.useRealTimers()
    expect(html.hasAttribute('data-ready')).toBe(true)
    expect(heading().textContent).toBe('Where to first?')
    expect(bannerText()).toBe(UNREADABLE)
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('a lock request that throws counts as the holder', async () => {
    const fake = fakeStore()
    await boot(fake, { acquireLock: () => Promise.reject(new Error('SecurityError')) })
    expect(banner()).toBeNull()
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['newerVersion', { ...docFor({}), schemaVersion: 2 }, undefined],
    ['storageUnavailable', undefined, () => Promise.reject(new Error('IndexedDB unavailable'))],
  ] as const)('a holder that ends read-only (%s) releases the lock', async (_name, stored, load) => {
    const fake = fakeStore(stored)
    if (load) fake.store.load = load
    const release = vi.fn()
    await boot(fake, { acquireLock: async () => ({ held: true, release }) })
    expect(banner()!.dataset.banner).toBe('readOnly')
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('with a real LockManager: a newerVersion tab gives traveller-save back, so another tab can write', async () => {
    const held = new Set<string>()
    const locks = {
      request: async (name: string, _options: LockOptions, cb: (lock: Lock | null) => unknown) => {
        if (held.has(name)) return cb(null)
        held.add(name)
        try {
          return await cb({ name, mode: 'exclusive' } as Lock)
        } finally {
          held.delete(name)
        }
      },
    } as unknown as LockManager
    await boot(fakeStore({ ...docFor({}), schemaVersion: 2 }), { acquireLock: () => acquireSaveLock(locks) })
    expect(bannerText()).toBe('A newer version saved your progress. Reload to carry on.')
    await flush()
    expect(held.has(LOCK_NAME)).toBe(false)
    expect((await acquireSaveLock(locks)).held).toBe(true)
  })

  it('a writing holder keeps the lock', async () => {
    const release = vi.fn()
    await boot(fakeStore(), { acquireLock: async () => ({ held: true, release }) })
    expect(release).not.toHaveBeenCalled()
  })

  it('a load that never settles gives up after the timeout: page ready, defaults, read-only', async () => {
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
    expect(bannerText()).toBe(UNREADABLE)
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

describe('save failed', () => {
  const SAVE_FAILED = "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here."

  it('two rejected writes: one banner (airmail-red, top of the side column), one announcement; a success clears it', async () => {
    const fake = fakeStore(docFor({ sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) } }))
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError')).mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake)
    const [a, b, c, d] = emptyCells(samplePuzzle.givens)
    act(() => cell(a).focus())
    press(samplePuzzle.solution[a])
    await flush()
    expect(bannerText()).toBe(SAVE_FAILED)
    expect(banner()!.classList.contains('notice-banner--alert')).toBe(true)
    expect(q('.side-column')!.firstElementChild).toBe(banner())
    expect(live()).toBe(SAVE_FAILED)
    act(() => cell(b).focus())
    press(samplePuzzle.solution[b])
    await flush()
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    // The second failure is not announced again: the live region still holds the digit.
    expect(live()).toBe(samplePuzzle.solution[b])
    // Play goes on and the next write lands: the banner goes.
    act(() => cell(c).focus())
    press(samplePuzzle.solution[c])
    await flush()
    expect(banner()).toBeNull()
    expect((fake.box.value as SaveDocument).sessions[FREE_PLAY_KEY].digits).toBe(shownDigits())
    // A later failure shows and is announced again.
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
    act(() => cell(d).focus())
    press(samplePuzzle.solution[d])
    await flush()
    expect(bannerText()).toBe(SAVE_FAILED)
    expect(live()).toBe(SAVE_FAILED)
  })

  it('"Got it" hides it and moves focus to the grid', async () => {
    const fake = fakeStore(docFor({ sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) } }))
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake)
    const [a] = emptyCells(samplePuzzle.givens)
    act(() => cell(a).focus())
    press(samplePuzzle.solution[a])
    await flush()
    act(() => gotIt().focus())
    act(() => gotIt().click())
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(q('[role="grid"] [tabindex="0"]'))
  })

  it('on the Album the banner sits under the header', async () => {
    const fake = fakeStore()
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake)
    act(() => navLink('Settings').click())
    act(() => toggle('Lamplight').click())
    await flush()
    expect(q('.app-banner .notice-banner--alert')).not.toBeNull()
    act(() => gotIt().click())
    expect(document.activeElement).toBe(heading())
  })

  it('save failed outranks unreadable; unreadable shows again once it is dismissed', async () => {
    const fake = fakeStore({ schemaVersion: 1, album: 'nope' })
    // The start-up write of the defaults lands; the next write is rejected.
    fake.save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake)
    expect(bannerText()).toBe(UNREADABLE)
    act(() => slot(PARIS).click())
    await flush()
    expect(bannerText()).toBe(SAVE_FAILED)
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    act(() => gotIt().click())
    expect(bannerText()).toBe(UNREADABLE)
  })
})
