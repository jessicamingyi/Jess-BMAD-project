// @vitest-environment jsdom
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState, createSession, FREE_PLAY_KEY } from '../../src/game/session.ts'
import type { AppState } from '../../src/game/types.ts'
import { toDocument, type SaveDocument } from '../../src/persistence/document.ts'
import type { SaveStore } from '../../src/persistence/store.ts'
import { boot as bootApp, type BootOptions } from '../../src/ui/boot.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const TODAY = '2026-10-08'
const UPDATE = 'A new version is ready. It arrives next time you open the game.'
const OTHER_TAB = 'Traveller Sudoku is open in another tab. Play there, or close it and reload this one.'
const SAVE_FAILED = "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here."
const UNREADABLE = "We couldn't read your saved progress. It's been kept safe, not overwritten."

function fakeStore(initial?: unknown) {
  const box = { value: initial }
  const save = vi.fn(async (doc: SaveDocument) => {
    box.value = structuredClone(doc)
  })
  const store: SaveStore = { load: async () => box.value, save, saveBackup: async () => {} }
  return { store, save }
}

/** A fake `registerSW`: `waiting()` fires the plugin's onNeedRefresh; `updateSW` must never run. */
function fakeRegister() {
  const updateSW = vi.fn(async () => {})
  let options: RegisterSWOptions = {}
  const register = vi.fn((o: RegisterSWOptions) => {
    options = o
    return updateSW
  })
  const waiting = () => act(() => options.onNeedRefresh?.())
  return { register, updateSW, waiting, options: () => options }
}

let host: HTMLDivElement | null = null
let root: Root | null = null

async function boot(store: SaveStore, options: Omit<BootOptions, 'today'> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  await act(async () => {
    root = await bootApp(store, host!, document.documentElement, { today: TODAY, ...options })
  })
}

function unmount() {
  act(() => root?.unmount())
  root = null
  host?.remove()
  host = null
}

const flush = () => act(async () => new Promise<void>((r) => setTimeout(r, 0)))

/** jsdom has no service workers; these tests give it one (registration itself is the fake). */
beforeEach(() => {
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
})

afterEach(() => {
  unmount()
  delete (navigator as { serviceWorker?: unknown }).serviceWorker
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.ready
})

const q = <E extends Element = HTMLElement>(sel: string) => host!.querySelector<E>(sel)
const banner = () => q<HTMLElement>('.notice-banner')
const bannerText = () => banner()?.querySelector('p')?.textContent
const gotIt = () => banner()!.querySelector('button')!
const heading = () => q<HTMLHeadingElement>('main h1')!
const navLink = (name: string) => [...host!.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const cell = (i: number) => q(`[data-cell="${i}"]`)!
const otherTab = async () => ({ held: false, release: () => {} })
/** A saved document whose storage notice was acknowledged long ago (so only the banners under test show). */
const docFor = (patch: Partial<AppState>) =>
  toDocument({ ...createInitialState(), meta: { lastPlayedKey: null, seenStorageNotice: true, persistGranted: null }, ...patch })
const freePlayDoc = () => docFor({ sessions: { [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, samplePuzzle) } })
const emptyCells = [...samplePuzzle.givens].flatMap((d, i) => (d === '0' ? [i] : []))

function press(key: string, target: Element | null = document.activeElement) {
  act(() => {
    target!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

describe('update ready', () => {
  it('registers once at boot; a waiting worker shows the info banner under the header; nothing reloads or saves', async () => {
    const sw = fakeRegister()
    const fake = fakeStore(docFor({}))
    await boot(fake.store, { registerSW: sw.register })
    expect(sw.register).toHaveBeenCalledTimes(1)
    expect(banner()).toBeNull()
    sw.waiting()
    expect(bannerText()).toBe(UPDATE)
    expect(banner()!.classList.contains('notice-banner--info')).toBe(true)
    expect(q('.app-banner .notice-banner')).toBe(banner())
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    // A new worker taking control would normally reload; this session never does.
    sw.options().onNeedReload?.()
    expect(sw.updateSW).not.toHaveBeenCalled()
    // The flag is UI only: nothing is written.
    await flush()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('a worker already waiting before the App subscribed still shows the banner', async () => {
    const updateSW = vi.fn(async () => {})
    const eager = vi.fn((o: RegisterSWOptions) => {
      o.onNeedRefresh?.()
      return updateSW
    })
    await boot(fakeStore(docFor({})).store, { registerSW: eager })
    expect(bannerText()).toBe(UPDATE)
    expect(updateSW).not.toHaveBeenCalled()
  })

  it('on the Puzzle screen it heads the side column; "Got it" hides it for the page and focuses the grid', async () => {
    const sw = fakeRegister()
    await boot(fakeStore(freePlayDoc()).store, { registerSW: sw.register })
    sw.waiting()
    expect(q('.side-column')!.firstElementChild).toBe(banner())
    expect(q('.app-banner')).toBeNull()
    act(() => gotIt().click())
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(q('[role="grid"] [tabindex="0"]'))
    sw.waiting()
    expect(banner()).toBeNull()
    expect(sw.updateSW).not.toHaveBeenCalled()
  })

  it('"Got it" on the Album focuses the page heading', async () => {
    const sw = fakeRegister()
    await boot(fakeStore(docFor({})).store, { registerSW: sw.register })
    sw.waiting()
    act(() => gotIt().click())
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(heading())
  })

  it('read-only outranks it; it shows once the read-only banner is dismissed', async () => {
    const sw = fakeRegister()
    await boot(fakeStore(docFor({})).store, { registerSW: sw.register, acquireLock: otherTab })
    sw.waiting()
    expect(bannerText()).toBe(OTHER_TAB)
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    act(() => gotIt().click())
    expect(bannerText()).toBe(UPDATE)
  })

  it('save failed outranks it; it shows once the save-failed banner is dismissed', async () => {
    const sw = fakeRegister()
    const fake = fakeStore(freePlayDoc())
    fake.save.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await boot(fake.store, { registerSW: sw.register })
    sw.waiting()
    expect(bannerText()).toBe(UPDATE)
    act(() => cell(emptyCells[0]).focus())
    press(samplePuzzle.solution[emptyCells[0]])
    await flush()
    expect(bannerText()).toBe(SAVE_FAILED)
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    act(() => gotIt().click())
    expect(bannerText()).toBe(UPDATE)
  })

  it('unreadable outranks it; it shows once the unreadable banner is dismissed, on every screen', async () => {
    const sw = fakeRegister()
    await boot(fakeStore({ schemaVersion: 1, album: 'nope' }).store, { registerSW: sw.register })
    sw.waiting()
    expect(bannerText()).toBe(UNREADABLE)
    act(() => gotIt().click())
    // The defaults never saw the storage notice: it ranks above the update.
    expect(banner()!.dataset.banner).toBe('storageNotice')
    act(() => gotIt().click())
    expect(bannerText()).toBe(UPDATE)
    act(() => navLink('Settings').click())
    expect(bannerText()).toBe(UPDATE)
  })

  it('no service worker support: registration skipped, the app works', async () => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker
    const sw = fakeRegister()
    await boot(fakeStore(docFor({})).store, { registerSW: sw.register })
    expect(sw.register).not.toHaveBeenCalled()
    expect(heading().textContent).toBe('Where to first?')
    expect(banner()).toBeNull()
  })

  it('registration fails (rejected or throwing): the app works, no banner, no console error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rejected = vi.fn((o: RegisterSWOptions) => {
      o.onRegisterError?.(new Error('SecurityError'))
      return async () => {}
    })
    await boot(fakeStore(docFor({})).store, { registerSW: rejected })
    expect(heading().textContent).toBe('Where to first?')
    expect(banner()).toBeNull()
    unmount()
    const throwing = vi.fn(() => {
      throw new Error('boom')
    })
    await boot(fakeStore(docFor({})).store, { registerSW: throwing })
    expect(throwing).toHaveBeenCalledTimes(1)
    expect(heading().textContent).toBe('Where to first?')
    expect(banner()).toBeNull()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
