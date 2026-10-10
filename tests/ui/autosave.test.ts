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
const SAVING_OFF = "We can't save your progress in this browser right now. Anything saved before is left untouched. You can keep playing, but this session won't be kept - reload to try again."

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

/** Fake `navigator.storage` answers: records whether a tab ever asks. */
const fakeBrowser = () => ({ persist: vi.fn(async () => true), persisted: vi.fn(async () => true), isSafari: vi.fn(() => true) })

/**
 * Saving is off: the info banner with the saving-off line (never the unreadable one),
 * defaults, and play allowed (Paris opens from its slot, a digit places), with `save`
 * never called. `browser`, when given, was never asked about persistent storage.
 */
async function expectPlaysWithoutSaving(fake: ReturnType<typeof fakeStore>, browser?: ReturnType<typeof fakeBrowser>) {
  expect(heading().textContent).toBe('Where to first?')
  expect(banner()!.dataset.banner).toBe('savingOff')
  expect(bannerText()).toBe(SAVING_OFF)
  expect(banner()!.classList.contains('notice-banner--info')).toBe(true)
  act(() => slot(PARIS).click())
  await flush()
  expect(title()).toBe('Paris · Near · Easy')
  const puzzle = cityPuzzle(PARIS)!
  const [a] = emptyCells(puzzle.givens)
  act(() => cell(a).focus())
  press(puzzle.solution[a])
  await flush()
  expect(cell(a).textContent).toBe(puzzle.solution[a])
  expect(banner()!.dataset.banner).toBe('savingOff')
  // Banners stay silent, except save-failed.
  expect(live()).not.toContain(SAVING_OFF)
  expect(fake.save).not.toHaveBeenCalled()
  if (browser) {
    expect(browser.persist).not.toHaveBeenCalled()
    expect(browser.persisted).not.toHaveBeenCalled()
  }
}

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

/** A saved document; the storage notice was acknowledged long ago unless `patch.meta` says otherwise. */
const docFor = (patch: Partial<AppState>) =>
  toDocument({ ...createInitialState(), meta: { lastPlayedKey: null, seenStorageNotice: true, persistGranted: null }, ...patch })
const card = (cityId: string, collectedOn: string, revealed = true) => ({ cityId, collectedOn, revealed })
/** `doc` exactly as Story 4.3's build saved it: version 1, `meta` with only `lastPlayedKey`. */
const toV1 = ({ meta, ...rest }: SaveDocument) => JSON.parse(JSON.stringify({ ...rest, schemaVersion: 1, meta: { lastPlayedKey: meta.lastPlayedKey } }))

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
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null } }))
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
    expect(doc.schemaVersion).toBe(2)
    expect(Object.keys(doc).sort()).toEqual(['album', 'meta', 'schemaVersion', 'sessions', 'settings'])
    expect(doc.sessions[cityKey(PARIS)].digits).toBe(cityPuzzle(PARIS)!.givens)
  })

  it('UI-only actions never write: select, Notes mode, Hint steps, Restart confirm, screens, the viewer', async () => {
    const fake = fakeStore(
      docFor({
        album: [card(LONDON, '2026-10-01')],
        sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) },
        meta: { lastPlayedKey: FREE_PLAY_KEY, seenStorageNotice: true, persistGranted: null },
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

  it('UI-only state is not restored: no Hint step, no "Solved again" line, the viewer closed', async () => {
    const LISBON = 'lisbon'
    const puzzle = cityPuzzle(LISBON)!
    const last = puzzle.givens.lastIndexOf('0')
    const digits = puzzle.solution.slice(0, last) + '0' + puzzle.solution.slice(last + 1)
    const fake = fakeStore(
      docFor({
        album: [card(LONDON, '2026-10-01'), card(LISBON, '2026-09-30')],
        sessions: { [cityKey(LISBON)]: { ...createSession(cityKey(LISBON), puzzle), digits } },
        meta: { lastPlayedKey: cityKey(LISBON), seenStorageNotice: true, persistGranted: null },
      }),
    )
    await boot(fake)
    expect(title()).toMatch(/^Lisbon ·/)
    // A Hint step open.
    act(() => button('Hint').click())
    expect(q('.hint-panel')).not.toBeNull()
    await reload(fake)
    expect(title()).toMatch(/^Lisbon ·/)
    expect(q('.hint-panel')).toBeNull()

    // A replay solved: "Solved again".
    act(() => cell(last).focus())
    press(puzzle.solution[last])
    expect(q('.puzzle-status')?.textContent).toBe('Solved again. Lisbon is already in your Album.')
    await reload(fake)
    // Nothing in progress: the launch lands on the Album.
    expect(heading().textContent).toBe('Where to next?')
    act(() => navLink('Puzzle').click())
    expect(title()).toMatch(/^Lisbon ·/)
    expect(shownDigits()).toBe(puzzle.solution)
    expect(q('.puzzle-status')?.textContent).toBe('Solved. Where to next? Album')

    // The Postcard viewer open, then a reload that lands on the Album again.
    act(() => navLink('Album').click())
    act(() => slot(LONDON).click())
    expect(q('.album-viewer section.postcard')).not.toBeNull()
    await reload(fake)
    expect(heading().textContent).toBe('Where to next?')
    expect(q('.album-viewer')).toBeNull()
  })

  it('several half-finished Cities and Free Play reopen as left; the Album reads "Carry on"; Settings kept', async () => {
    const paris = partPlayed(PARIS, 2)
    const tokyo = partPlayed(TOKYO, 1)
    const free = { ...createSession(FREE_PLAY_KEY, { ...samplePuzzle, difficulty: 'hard' as const }), notes: Array.from({ length: 81 }, (_, i) => (i === emptyCells(samplePuzzle.givens)[0] ? 0b110 : 0)) }
    const fake = fakeStore(
      docFor({
        sessions: { [paris.key]: paris, [tokyo.key]: tokyo, [FREE_PLAY_KEY]: free },
        settings: { ...DEFAULT_SETTINGS, mistakeHighlighting: true, sameDigitHighlighting: false, lamplight: true, freePlayDifficulty: 'hard' },
        meta: { lastPlayedKey: tokyo.key, seenStorageNotice: true, persistGranted: null },
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
        meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null },
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
        meta: { lastPlayedKey: cityKey(LONDON), seenStorageNotice: true, persistGranted: null },
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
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: { ...createSession(cityKey(PARIS), puzzle), digits } }, meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null } }))
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
        meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null },
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
  it('a newer schemaVersion that does not read as v2: defaults, read-only, never written, the stored value byte-for-byte untouched', async () => {
    const stored = { ...docFor({}), schemaVersion: 3, album: { renamed: true } }
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

  it('a newer schemaVersion that still reads as v2: its half-finished Puzzle shows, not editable; never written', async () => {
    const stored = {
      ...docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null } }),
      schemaVersion: 3,
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
    expect(fake.box.value).toEqual(toDocument(createInitialState()))
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
    // The defaults were saved: no unreadable notice, only the storage notice (never acknowledged in them).
    expect(banner()!.dataset.banner).toBe('storageNotice')
    expect(heading().textContent).toBe('Where to first?')
  })

  it('a migration that throws is unreadable: backup, defaults, banner', async () => {
    const stored = { ...docFor({}), schemaVersion: 1 }
    const fake = fakeStore(stored)
    await boot(fake, {
      migrations: [
        () => ({}),
        () => {
          throw new Error('boom')
        },
      ],
    })
    expect([...fake.backups.values()]).toEqual([stored])
    expect(bannerText()).toBe(UNREADABLE)
    expect(fake.box.value).toEqual(toDocument(createInitialState()))
  })

  it('the backup write fails: saving off, play allowed, nothing written, the main key untouched, no throw', async () => {
    const stored = { schemaVersion: 1, album: 'nope' }
    const fake = fakeStore(stored)
    fake.saveBackup.mockRejectedValueOnce(new Error('QuotaExceededError'))
    const browser = fakeBrowser()
    await boot(fake, browser)
    await expectPlaysWithoutSaving(fake, browser)
    expect(fake.saveBackup).toHaveBeenCalledTimes(1)
    expect(fake.box.value).toBe(stored)
  })

  it('a load that rejects: defaults, saving off, play allowed, never writes', async () => {
    const fake = fakeStore()
    fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    const browser = fakeBrowser()
    await boot(fake, browser)
    await expectPlaysWithoutSaving(fake, browser)
    expect(fake.saveBackup).not.toHaveBeenCalled()
  })
})

describe('migrations', () => {
  const unseen = (lastPlayedKey: string | null) => ({ lastPlayedKey, seenStorageNotice: false, persistGranted: null })

  it('a v1 document loads as v2 with every Postcard, Session and Setting, written back once', async () => {
    const v2 = docFor({
      album: [card(LONDON, '2026-10-01')],
      sessions: { [cityKey(PARIS)]: partPlayed(PARIS, 2), [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) },
      settings: { ...DEFAULT_SETTINGS, mistakeHighlighting: true },
      meta: unseen(cityKey(PARIS)),
    })
    const fake = fakeStore(toV1(v2))
    await boot(fake)
    await flush()
    expect(title()).toBe('Paris · Near · Easy')
    // The v1 player never saw the storage notice.
    expect(banner()!.dataset.banner).toBe('storageNotice')
    expect(fake.save).toHaveBeenCalledTimes(1)
    expect(fake.box.value).toEqual(v2)
    expect((fake.box.value as SaveDocument).schemaVersion).toBe(2)
    // Nothing more is written until a saved slice changes.
    act(() => navLink('Album').click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
    expect(slot(LONDON).textContent).toContain('London')
  })

  it('the write-back is rejected: the Puzzle still loads and the save-failed banner shows', async () => {
    const v2 = docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: unseen(cityKey(PARIS)) })
    const fake = fakeStore(toV1(v2))
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake)
    expect(title()).toBe('Paris · Near · Easy')
    expect(bannerText()).toBe("Your last change couldn't be saved. Your next move will try again - your Puzzle is still here.")
    expect(banner()!.classList.contains('notice-banner--alert')).toBe(true)
  })

  it('a second tab migrates in memory but never writes back', async () => {
    const v1 = toV1(docFor({ album: [card(LONDON, '2026-10-01')] }))
    const fake = fakeStore(v1)
    await boot(fake, { acquireLock: otherTab })
    await flush()
    expect(slot(LONDON).textContent).toContain('London')
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBe(v1)
  })
})

describe('a second tab', () => {
  const OTHER_TAB = 'Traveller Sudoku is open in another tab. Play there, or close it and reload this one.'

  it('shows the saved state read-only: banner, inert grid and side column, Hint unavailable, nothing written', async () => {
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null } }))
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
        meta: { lastPlayedKey: FREE_PLAY_KEY, seenStorageNotice: true, persistGranted: null },
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
    // The next pending banner: the storage notice (a first visit).
    expect(banner()!.dataset.banner).toBe('storageNotice')
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
    expect(banner()!.dataset.banner).toBe('storageNotice')
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

  it('a lock request that never settles gives up after the timeout: page ready, defaults, saving off', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) } }))
    const browser = fakeBrowser()
    host = document.createElement('div')
    document.body.appendChild(host)
    const html = document.createElement('html')
    await act(async () => {
      const started = bootApp(fake.store, host!, html, { today: TODAY, acquireLock: () => new Promise(() => {}), ...browser })
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS - 1)
      expect(html.hasAttribute('data-ready')).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      root = await started
    })
    vi.useRealTimers()
    expect(html.hasAttribute('data-ready')).toBe(true)
    await expectPlaysWithoutSaving(fake, browser)
    expect(fake.saveBackup).not.toHaveBeenCalled()
  })

  it('a lock request that throws counts as the holder', async () => {
    const fake = fakeStore()
    await boot(fake, { acquireLock: () => Promise.reject(new Error('SecurityError')) })
    expect(banner()!.dataset.banner).toBe('storageNotice')
    act(() => slot(PARIS).click())
    await flush()
    expect(fake.save).toHaveBeenCalledTimes(1)
  })

  it('a holder that ends read-only (newerVersion) releases the lock', async () => {
    const fake = fakeStore({ ...docFor({}), schemaVersion: 3 })
    const release = vi.fn()
    await boot(fake, { acquireLock: async () => ({ held: true, release }) })
    expect(banner()!.dataset.banner).toBe('readOnly')
    expect(release).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['the load rejects', undefined, false],
    ['the backup fails', 'garbled', true],
  ] as const)('a holder that ends with saving off (%s) releases the lock and plays on', async (_name, stored, failBackup) => {
    const fake = fakeStore(stored)
    if (stored === undefined) fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    if (failBackup) fake.saveBackup.mockRejectedValueOnce(new Error('QuotaExceededError'))
    const release = vi.fn()
    await boot(fake, { acquireLock: async () => ({ held: true, release }) })
    expect(release).toHaveBeenCalledTimes(1)
    await expectPlaysWithoutSaving(fake)
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
    await boot(fakeStore({ ...docFor({}), schemaVersion: 3 }), { acquireLock: () => acquireSaveLock(locks) })
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

  it('a load that never settles gives up after the timeout: page ready, defaults, saving off', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fake = fakeStore()
    fake.store.load = () => new Promise(() => {})
    const browser = fakeBrowser()
    const release = vi.fn()
    host = document.createElement('div')
    document.body.appendChild(host)
    const html = document.createElement('html')
    await act(async () => {
      const started = bootApp(fake.store, host!, html, { today: TODAY, acquireLock: async () => ({ held: true, release }), ...browser })
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS - 1)
      expect(html.hasAttribute('data-ready')).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      root = await started
    })
    vi.useRealTimers()
    expect(html.hasAttribute('data-ready')).toBe(true)
    // The load never settles, but the lock is given back at the give-up so another tab can write.
    expect(release).toHaveBeenCalledTimes(1)
    await expectPlaysWithoutSaving(fake, browser)
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('another tab holds the lock and the load hangs past the timeout: read-only (other tab), inert grid, nothing written', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) } }))
    fake.store.load = () => new Promise(() => {})
    const browser = fakeBrowser()
    host = document.createElement('div')
    document.body.appendChild(host)
    const html = document.createElement('html')
    await act(async () => {
      const started = bootApp(fake.store, host!, html, { today: TODAY, acquireLock: otherTab, ...browser })
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS)
      root = await started
    })
    vi.useRealTimers()
    expect(banner()!.dataset.banner).toBe('readOnly')
    expect(bannerText()).toBe('Traveller Sudoku is open in another tab. Play there, or close it and reload this one.')
    // Defaults hold no Puzzle, so there is no grid to show; read-only refuses to open one.
    act(() => slot(PARIS).click())
    await flush()
    expect(heading().textContent).toBe('Where to first?')
    expect(q('[role="grid"]')).toBeNull()
    // Its "Got it" leaves no saving-off banner behind.
    act(() => gotIt().click())
    await flush()
    expect(banner()).toBeNull()
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(browser.persist).not.toHaveBeenCalled()
    expect(browser.persisted).not.toHaveBeenCalled()
  })
})

describe('boot, late after the timeout', () => {
  /** Boot with fake timers, past the timeout, then let anything late settle. */
  async function bootPastTimeout(fake: ReturnType<typeof fakeStore>, options: Omit<BootOptions, 'today'>) {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    host = document.createElement('div')
    document.body.appendChild(host)
    const html = document.createElement('html')
    await act(async () => {
      const started = bootApp(fake.store, host!, html, { today: TODAY, ...options })
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS)
      root = await started
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS)
    })
    vi.useRealTimers()
    await flush()
  }

  it.each<[string, () => unknown]>([
    ['a loaded', () => docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) } })],
    ['a v1 (migrated)', () => toV1(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) } }))],
    ['an unreadable', () => 'garbled'],
  ])('%s load that resolves after the give-up: nothing written, the lock released once, defaults with saving off', async (_name, data) => {
    const stored = data()
    const fake = fakeStore(stored)
    let loaded = false
    fake.store.load = () =>
      new Promise((resolve) =>
        setTimeout(() => {
          loaded = true
          resolve(stored)
        }, LOAD_TIMEOUT_MS + 10),
      )
    const release = vi.fn()
    await bootPastTimeout(fake, { acquireLock: async () => ({ held: true, release }) })
    expect(loaded).toBe(true)
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(1)
    await expectPlaysWithoutSaving(fake)
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(fake.box.value).toBe(stored)
  })

  it('unreadable data whose backup finishes after the give-up: backed up, the main key never written, lock released', async () => {
    const fake = fakeStore('garbled')
    fake.saveBackup.mockImplementation(
      (key, raw) =>
        new Promise((resolve) =>
          setTimeout(() => {
            fake.backups.set(key, raw)
            resolve()
          }, LOAD_TIMEOUT_MS + 10),
        ),
    )
    const release = vi.fn()
    await bootPastTimeout(fake, { acquireLock: async () => ({ held: true, release }) })
    expect(fake.saveBackup).toHaveBeenCalledTimes(1)
    expect([...fake.backups.values()]).toEqual(['garbled'])
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBe('garbled')
    expect(release).toHaveBeenCalledTimes(1)
    await expectPlaysWithoutSaving(fake)
    expect(fake.box.value).toBe('garbled')

    // The next launch (normal timing) still finds the unreadable data: backed up again, and the notice shows.
    fake.saveBackup.mockClear()
    fake.saveBackup.mockImplementation(async (key, raw) => {
      fake.backups.set(key, raw)
    })
    unmount()
    await boot(fake, { now: () => new Date('2026-10-09T08:00:00.000Z') })
    expect(fake.saveBackup).toHaveBeenCalledTimes(1)
    expect(fake.save).toHaveBeenCalledTimes(1)
    expect(bannerText()).toBe(UNREADABLE)
    expect(banner()!.dataset.banner).toBe('unreadable')
  })

  it('a lock granted after the give-up is released once; nothing written', async () => {
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) } }))
    const release = vi.fn()
    await bootPastTimeout(fake, {
      acquireLock: () => new Promise((resolve) => setTimeout(() => resolve({ held: true, release }), LOAD_TIMEOUT_MS + 10)),
    })
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(1)
    await expectPlaysWithoutSaving(fake)
  })
})

describe('saving off (storage unavailable)', () => {
  it('a first visit with broken storage: the saving-off line, never the unreadable one; no storage notice; nothing asked', async () => {
    const fake = fakeStore()
    fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    const browser = fakeBrowser()
    const release = vi.fn()
    await boot(fake, { acquireLock: async () => ({ held: true, release }), ...browser })
    await flush()
    expect(bannerText()).not.toBe(UNREADABLE)
    await expectPlaysWithoutSaving(fake, browser)
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('"Got it" hides the banner for the page; the storage notice never shows; still nothing saved or asked', async () => {
    const fake = fakeStore()
    fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    const browser = fakeBrowser()
    await boot(fake, browser)
    await flush()
    expect(banner()!.dataset.banner).toBe('savingOff')
    act(() => gotIt().click())
    await flush()
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(heading())
    // Play everywhere: a City, Settings, back to the Album. No banner comes back.
    act(() => slot(PARIS).click())
    await flush()
    expect(title()).toBe('Paris · Near · Easy')
    const puzzle = cityPuzzle(PARIS)!
    const [a] = emptyCells(puzzle.givens)
    act(() => cell(a).focus())
    press(puzzle.solution[a])
    await flush()
    expect(cell(a).textContent).toBe(puzzle.solution[a])
    expect(banner()).toBeNull()
    act(() => navLink('Settings').click())
    await flush()
    act(() => toggle('Mistake').click())
    await flush()
    expect(toggle('Mistake').getAttribute('aria-checked')).toBe('true')
    act(() => navLink('Album').click())
    await flush()
    expect(banner()).toBeNull()
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.saveBackup).not.toHaveBeenCalled()
    expect(browser.persist).not.toHaveBeenCalled()
    expect(browser.persisted).not.toHaveBeenCalled()
  })

  it('another tab holding the lock is unchanged: read-only banner, inert grid', async () => {
    const fake = fakeStore(docFor({ sessions: { [cityKey(PARIS)]: partPlayed(PARIS) }, meta: { lastPlayedKey: cityKey(PARIS), seenStorageNotice: true, persistGranted: null } }))
    await boot(fake, { acquireLock: otherTab })
    expect(banner()!.dataset.banner).toBe('readOnly')
    expect(bannerText()).toBe('Traveller Sudoku is open in another tab. Play there, or close it and reload this one.')
    expect(q('.grid-card')!.hasAttribute('inert')).toBe(true)
  })

  it('another tab holds the lock and the load fails: read-only only; its "Got it" leaves no saving-off banner', async () => {
    const fake = fakeStore()
    fake.store.load = () => Promise.reject(new Error('IndexedDB unavailable'))
    await boot(fake, { acquireLock: otherTab })
    expect(banner()!.dataset.banner).toBe('readOnly')
    act(() => gotIt().click())
    await flush()
    expect(banner()).toBeNull()
    expect(q('[data-banner="savingOff"]')).toBeNull()
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
