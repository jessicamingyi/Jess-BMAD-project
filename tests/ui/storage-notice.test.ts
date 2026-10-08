// @vitest-environment jsdom
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState, Meta } from '../../src/game/types.ts'
import { toDocument, type SaveDocument } from '../../src/persistence/document.ts'
import type { SaveStore } from '../../src/persistence/store.ts'
import { boot as bootApp, type BootOptions } from '../../src/ui/boot.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const TODAY = '2026-10-08'
const PARIS = 'europe-near-1'
const STORAGE = 'Your Album lives in this browser only. Clearing browser data erases it.'
const ADD_TO_DOCK = 'Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it.'
const OTHER_TAB = 'Traveller Sudoku is open in another tab. Play there, or close it and reload this one.'
const UNREADABLE = "We couldn't read your saved progress. It's been kept safe, not overwritten."

/** An in-memory stand-in for IndexedDB: the value survives remounts, like a reload. */
function fakeStore(initial?: unknown) {
  const box = { value: initial }
  const save = vi.fn(async (doc: SaveDocument) => {
    box.value = structuredClone(doc)
  })
  const store: SaveStore = { load: async () => box.value, save, saveBackup: async () => {} }
  return { store, save, box }
}

/** Fake `navigator.storage` answers and browser. */
function fakeBrowser({ grant = false, already = false, safari = false } = {}) {
  return {
    persist: vi.fn(async () => grant),
    persisted: vi.fn(async () => already),
    isSafari: vi.fn(() => safari),
  }
}

let host: HTMLDivElement | null = null
let root: Root | null = null

async function boot(fake: ReturnType<typeof fakeStore>, options: Omit<BootOptions, 'today'> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  await act(async () => {
    root = await bootApp(fake.store, host!, document.documentElement, { today: TODAY, ...options })
  })
  await flush()
}

function unmount() {
  act(() => root?.unmount())
  root = null
  host?.remove()
  host = null
}

const flush = () => act(async () => new Promise<void>((r) => setTimeout(r, 0)))

afterEach(() => {
  unmount()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.ready
})

const q = <E extends Element = HTMLElement>(sel: string) => host!.querySelector<E>(sel)
const banner = () => q<HTMLElement>('.notice-banner')
const bannerKind = () => banner()?.dataset.banner ?? null
const bannerText = () => banner()?.querySelector('p')?.textContent
const gotIt = async () => {
  act(() => banner()!.querySelector('button')!.click())
  await flush()
}
const heading = () => q<HTMLHeadingElement>('main h1')!
const slot = (id: string) => q(`.album-slot[data-city="${id}"]`)!
const navLink = (name: string) => [...host!.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const gridStop = () => q('[role="grid"] [tabindex="0"]')
const savedMeta = (fake: ReturnType<typeof fakeStore>) => (fake.box.value as SaveDocument | undefined)?.meta
const docFor = (patch: Partial<AppState>, meta: Partial<Meta> = {}) =>
  toDocument({ ...createInitialState(), ...patch, meta: { lastPlayedKey: null, seenStorageNotice: true, persistGranted: null, ...meta } })
/** A solved Paris whose Postcard waits to be revealed: the next "Add to Album" is the first Postcard. */
const firstPostcardDoc = (meta: Partial<Meta> = {}) => docFor({ album: [{ cityId: PARIS, collectedOn: '2026-10-07', revealed: false }] }, meta)
const addToAlbum = async () => {
  const add = [...host!.querySelectorAll<HTMLButtonElement>('section.postcard button')].find((b) => b.textContent === 'Add to Album')!
  act(() => add.click())
  await flush()
}

describe('first launch', () => {
  it('Album on Europe, "Where to first?", the storage notice above the slots; "Travel here" works while it shows', async () => {
    const browser = fakeBrowser()
    const fake = fakeStore()
    await boot(fake, browser)
    expect(heading().textContent).toBe('Where to first?')
    expect(q('.album-tabs [aria-pressed="true"]')!.textContent).toMatch(/^Europe/)
    expect(bannerText()).toBe(STORAGE)
    expect(banner()!.classList.contains('notice-banner--info')).toBe(true)
    expect(banner()!.querySelector('button')!.textContent).toBe('Got it')
    // Under the header, above the Album (and its slots).
    expect(q('.app-banner .notice-banner')).toBe(banner())
    expect(q('.app-banner')!.nextElementSibling).toBe(q('main'))
    expect(host!.querySelectorAll('.notice-banner')).toHaveLength(1)
    // Nothing is asked before "Got it", and nothing is written.
    expect(browser.persist).not.toHaveBeenCalled()
    expect(fake.save).not.toHaveBeenCalled()
    act(() => slot(PARIS).click())
    expect(q('.puzzle-screen')).not.toBeNull()
  })

  it('a Puzzle opened first: the notice moves to the top of the side column; the grid stays in place', async () => {
    await boot(fakeStore(), fakeBrowser())
    act(() => slot(PARIS).click())
    expect(bannerText()).toBe(STORAGE)
    expect(q('.side-column')!.firstElementChild).toBe(banner())
    expect(q('.app-banner')).toBeNull()
    expect(q('.puzzle-screen')!.firstElementChild).toBe(q('.grid-card'))
  })

  it('the full flow in Chrome: "Got it" saves the flag, asks, records the grant; no further banner; a Near City opens; a reload shows no notice', async () => {
    const browser = fakeBrowser({ grant: true })
    const fake = fakeStore()
    await boot(fake, browser)
    await gotIt()
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(heading())
    expect(browser.persist).toHaveBeenCalledTimes(1)
    expect(savedMeta(fake)).toEqual({ lastPlayedKey: null, seenStorageNotice: true, persistGranted: true })
    act(() => slot(PARIS).click())
    expect(q('.puzzle-screen')).not.toBeNull()
    expect(banner()).toBeNull()
    await flush()
    unmount()
    const again = fakeBrowser({ already: true })
    await boot(fake, again)
    expect(banner()).toBeNull()
    expect(again.persist).not.toHaveBeenCalled()
  })

  it('Tab order on the Puzzle screen: nav, grid, then the side column with the notice first', async () => {
    await boot(fakeStore(), fakeBrowser())
    act(() => slot(PARIS).click())
    const tabbable = [...host!.querySelectorAll<HTMLElement>('button, [tabindex]')].filter((el) => el.tabIndex >= 0)
    const names = tabbable.map((el) => (el.getAttribute('role') === 'gridcell' ? 'grid' : el.textContent))
    expect(names.slice(0, 7)).toEqual(['Puzzle', 'Album', 'Free Play', 'Settings', 'grid', 'Got it', 'Digit'])
  })

  it('"Got it" on the Puzzle screen moves focus to the grid', async () => {
    await boot(fakeStore(), fakeBrowser({ grant: true }))
    act(() => slot(PARIS).click())
    await gotIt()
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(gridStop())
  })
})

describe('the answer to "Got it"', () => {
  it('Safari refused: persistGranted false; the Add to Dock banner (info), whose "Got it" hides it for the page', async () => {
    const browser = fakeBrowser({ safari: true })
    const fake = fakeStore()
    await boot(fake, browser)
    await gotIt()
    expect(savedMeta(fake)).toEqual({ lastPlayedKey: null, seenStorageNotice: true, persistGranted: false })
    expect(bannerText()).toBe(ADD_TO_DOCK)
    expect(banner()!.classList.contains('notice-banner--info')).toBe(true)
    await gotIt()
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(heading())
    // UI only: nothing more is saved.
    expect(savedMeta(fake)!.persistGranted).toBe(false)
  })

  it('another browser refused: persistGranted false, nothing shown', async () => {
    const browser = fakeBrowser({ safari: false })
    const fake = fakeStore()
    await boot(fake, browser)
    await gotIt()
    expect(savedMeta(fake)!.persistGranted).toBe(false)
    expect(banner()).toBeNull()
  })

  it('no persist API: refused without error; in Safari the banner shows, elsewhere nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // jsdom has no navigator.storage: the real helpers run.
    await boot(fakeStore(), { isSafari: () => true })
    await gotIt()
    expect(bannerText()).toBe(ADD_TO_DOCK)
    unmount()
    const fake = fakeStore()
    await boot(fake, { isSafari: () => false })
    await gotIt()
    expect(banner()).toBeNull()
    expect(savedMeta(fake)!.persistGranted).toBe(false)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('a rejecting persist counts as refused (in Safari: the tip)', async () => {
    const fake = fakeStore()
    await boot(fake, { persist: () => Promise.reject(new Error('NotAllowedError')), persisted: async () => false, isSafari: () => true })
    await gotIt()
    expect(savedMeta(fake)!.persistGranted).toBe(false)
    expect(bannerText()).toBe(ADD_TO_DOCK)
  })

  it('a throwing Safari check counts as not Safari', async () => {
    const fake = fakeStore()
    const isSafari = () => {
      throw new Error('boom')
    }
    await boot(fake, { persist: async () => false, persisted: async () => false, isSafari })
    await gotIt()
    expect(savedMeta(fake)!.persistGranted).toBe(false)
    expect(banner()).toBeNull()
  })

  it('already granted (recorded at start): "Got it" does not ask again', async () => {
    const browser = fakeBrowser({ already: true, safari: true })
    const fake = fakeStore()
    await boot(fake, browser)
    expect(savedMeta(fake)!.persistGranted).toBe(true)
    await gotIt()
    expect(browser.persist).not.toHaveBeenCalled()
    expect(savedMeta(fake)).toEqual({ lastPlayedKey: null, seenStorageNotice: true, persistGranted: true })
    expect(banner()).toBeNull()
  })
})

describe('the first Postcard', () => {
  it('not yet granted: "Add to Album" asks again; a Safari refusal shows the Add to Dock banner on the Album', async () => {
    const browser = fakeBrowser({ safari: true })
    const fake = fakeStore(firstPostcardDoc({ persistGranted: false }))
    await boot(fake, browser)
    expect(q('section.postcard')).not.toBeNull()
    expect(browser.persist).not.toHaveBeenCalled()
    await addToAlbum()
    expect(browser.persist).toHaveBeenCalledTimes(1)
    expect(heading().textContent).toBe('Where to next?')
    expect(bannerText()).toBe(ADD_TO_DOCK)
    expect(q('.app-banner .notice-banner')).toBe(banner())
  })

  it('never asked yet (null): asked; a grant is saved and nothing shows', async () => {
    const browser = fakeBrowser({ grant: true })
    const fake = fakeStore(firstPostcardDoc())
    await boot(fake, browser)
    await addToAlbum()
    expect(browser.persist).toHaveBeenCalledTimes(1)
    expect(savedMeta(fake)!.persistGranted).toBe(true)
    expect(banner()).toBeNull()
  })

  it('already granted (and still persisted): not asked again', async () => {
    const browser = fakeBrowser({ already: true, safari: true })
    await boot(fakeStore(firstPostcardDoc({ persistGranted: true })), browser)
    await addToAlbum()
    expect(browser.persist).not.toHaveBeenCalled()
    expect(banner()).toBeNull()
  })

  it('a second Postcard does not ask', async () => {
    const browser = fakeBrowser({ safari: true })
    const doc = docFor(
      {
        album: [
          { cityId: 'europe-near-2', collectedOn: '2026-10-01', revealed: true },
          { cityId: PARIS, collectedOn: '2026-10-07', revealed: false },
        ],
      },
      { persistGranted: false },
    )
    await boot(fakeStore(doc), browser)
    await addToAlbum()
    expect(browser.persist).not.toHaveBeenCalled()
  })
})

describe('at start', () => {
  it('already persisted: persistGranted true (saved); no Safari banner later', async () => {
    const browser = fakeBrowser({ already: true, safari: true })
    const fake = fakeStore(firstPostcardDoc())
    await boot(fake, browser)
    expect(browser.persisted).toHaveBeenCalled()
    expect(savedMeta(fake)!.persistGranted).toBe(true)
    await addToAlbum()
    expect(browser.persist).not.toHaveBeenCalled()
    expect(banner()).toBeNull()
  })

  it('a rejecting persisted() counts as not persisted: nothing recorded or written', async () => {
    const fake = fakeStore(docFor({}))
    await boot(fake, { ...fakeBrowser(), persisted: () => Promise.reject(new Error('SecurityError')) })
    expect(fake.save).not.toHaveBeenCalled()
    expect(banner()).toBeNull()
  })

  it('a saved grant the browser has dropped is corrected (no tip), so the first Postcard asks again', async () => {
    const browser = fakeBrowser({ already: false, safari: true })
    const fake = fakeStore(firstPostcardDoc({ persistGranted: true }))
    await boot(fake, browser)
    expect(savedMeta(fake)!.persistGranted).toBe(false)
    expect(q('section.postcard')).not.toBeNull()
    await addToAlbum()
    expect(browser.persist).toHaveBeenCalledTimes(1)
    expect(bannerText()).toBe(ADD_TO_DOCK)
  })

  it('not persisted: nothing recorded or written', async () => {
    const browser = fakeBrowser({ already: false })
    const fake = fakeStore(docFor({}))
    await boot(fake, browser)
    expect(browser.persisted).toHaveBeenCalled()
    expect(fake.save).not.toHaveBeenCalled()
  })

  it('notice seen: no storage notice', async () => {
    await boot(fakeStore(docFor({})), fakeBrowser())
    expect(banner()).toBeNull()
  })

  it('a stored v1 document: loads as v2 with the notice unseen, written back, Postcards and Sessions intact', async () => {
    const v2 = docFor({ album: [{ cityId: 'europe-near-2', collectedOn: '2026-10-01', revealed: true }] }, { seenStorageNotice: false })
    const v1 = { ...v2, schemaVersion: 1, meta: { lastPlayedKey: null } }
    const fake = fakeStore(v1)
    await boot(fake, fakeBrowser())
    expect(bannerText()).toBe(STORAGE)
    expect(fake.box.value).toEqual(v2)
    expect(slot('europe-near-2').textContent).toContain('London')
  })
})

describe('banner order', () => {
  it('unreadable outranks the storage notice; it follows once dismissed', async () => {
    await boot(fakeStore({ schemaVersion: 2, album: 'nope' }), fakeBrowser())
    expect(bannerText()).toBe(UNREADABLE)
    await gotIt()
    expect(bannerText()).toBe(STORAGE)
  })

  it('the storage notice outranks a waiting update', async () => {
    let notify = () => {}
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    try {
      await boot(fakeStore(), {
        ...fakeBrowser(),
        registerSW: (o) => {
          notify = () => o.onNeedRefresh?.()
          return async () => {}
        },
      })
      act(() => notify())
      expect(bannerKind()).toBe('storageNotice')
      await gotIt()
      expect(bannerKind()).toBe('updateReady')
    } finally {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker
    }
  })
})

describe('a read-only tab', () => {
  const otherTab = async () => ({ held: false, release: () => {} })

  it('read-only banner first; then the storage notice, whose "Got it" only hides it: no persist, nothing written', async () => {
    const browser = fakeBrowser({ already: true, safari: true })
    const fake = fakeStore()
    await boot(fake, { ...browser, acquireLock: otherTab })
    expect(bannerText()).toBe(OTHER_TAB)
    await gotIt()
    expect(bannerText()).toBe(STORAGE)
    expect(document.activeElement).toBe(heading())
    await gotIt()
    expect(banner()).toBeNull()
    expect(document.activeElement).toBe(heading())
    act(() => navLink('Settings').click())
    expect(banner()).toBeNull()
    await flush()
    expect(browser.persist).not.toHaveBeenCalled()
    expect(browser.persisted).not.toHaveBeenCalled()
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.box.value).toBeUndefined()
  })
})
