import { describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { createUpdateSignal, registerServiceWorker } from '../../src/ui/service-worker.ts'

/** A browser with service workers (only the presence of `serviceWorker` matters). */
const withSW = { serviceWorker: {} } as unknown as Navigator

/** A fake `registerSW`: records its options and returns an `updateSW` spy that must never run. */
function fakeRegister() {
  const updateSW = vi.fn(async () => {})
  let options: RegisterSWOptions = {}
  const register = vi.fn((o: RegisterSWOptions) => {
    options = o
    return updateSW
  })
  return { register, updateSW, options: () => options }
}

describe('registerServiceWorker', () => {
  it('registers, and a waiting new version calls onUpdateReady; updateSW is never called', () => {
    const fake = fakeRegister()
    const onUpdateReady = vi.fn()
    expect(registerServiceWorker(onUpdateReady, fake.register, withSW)).toBe(true)
    expect(fake.register).toHaveBeenCalledTimes(1)
    expect(fake.options().immediate).toBeFalsy()
    fake.options().onNeedRefresh!()
    expect(onUpdateReady).toHaveBeenCalledTimes(1)
    expect(fake.updateSW).not.toHaveBeenCalled()
  })

  it('a new worker taking control never reloads the page (onNeedReload is a no-op)', () => {
    const fake = fakeRegister()
    registerServiceWorker(vi.fn(), fake.register, withSW)
    expect(fake.options().onNeedReload).toBeTypeOf('function')
    expect(() => fake.options().onNeedReload!()).not.toThrow()
    expect(fake.updateSW).not.toHaveBeenCalled()
  })

  it('no service worker support (old browser, jsdom): skipped, no throw', () => {
    const fake = fakeRegister()
    expect(registerServiceWorker(vi.fn(), fake.register, {} as Navigator)).toBe(false)
    expect(registerServiceWorker(vi.fn(), fake.register, undefined)).toBe(false)
    expect(fake.register).not.toHaveBeenCalled()
  })

  it('registration fails: caught quietly, no banner, no console error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onUpdateReady = vi.fn()
    // Rejected registration: the plugin reports it through onRegisterError.
    const fake = fakeRegister()
    registerServiceWorker(onUpdateReady, fake.register, withSW)
    expect(() => fake.options().onRegisterError!(new Error('SecurityError'))).not.toThrow()
    // A register that throws outright.
    const throwing = vi.fn(() => {
      throw new Error('boom')
    })
    expect(registerServiceWorker(onUpdateReady, throwing, withSW)).toBe(false)
    expect(onUpdateReady).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    error.mockRestore()
    warn.mockRestore()
  })
})

describe('update checks when the tab comes back', () => {
  /** A minimal document whose visibility the test flips. */
  function fakeDoc() {
    const target = new EventTarget() as EventTarget & { visibilityState: DocumentVisibilityState }
    target.visibilityState = 'visible'
    const show = (state: DocumentVisibilityState) => {
      target.visibilityState = state
      target.dispatchEvent(new Event('visibilitychange'))
    }
    return { doc: target as unknown as Document, show }
  }

  it('checks for a new version each time the document becomes visible, never when hidden', () => {
    const fake = fakeRegister()
    const { doc, show } = fakeDoc()
    registerServiceWorker(vi.fn(), fake.register, withSW, doc)
    const update = vi.fn(async () => {})
    fake.options().onRegisteredSW!('/Jess-BMAD-project/sw.js', { update } as unknown as ServiceWorkerRegistration)
    expect(update).not.toHaveBeenCalled()
    show('hidden')
    expect(update).not.toHaveBeenCalled()
    show('visible')
    show('hidden')
    show('visible')
    expect(update).toHaveBeenCalledTimes(2)
    expect(fake.updateSW).not.toHaveBeenCalled()
  })

  it('an update check that rejects or throws is swallowed; no registration, no listener', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = fakeRegister()
    const { doc, show } = fakeDoc()
    registerServiceWorker(vi.fn(), fake.register, withSW, doc)
    const rejecting = vi.fn(() => Promise.reject(new Error('offline')))
    fake.options().onRegisteredSW!('sw.js', { update: rejecting } as unknown as ServiceWorkerRegistration)
    const throwing = vi.fn(() => {
      throw new Error('InvalidStateError')
    })
    fake.options().onRegisteredSW!('sw.js', { update: throwing } as unknown as ServiceWorkerRegistration)
    expect(() => fake.options().onRegisteredSW!('sw.js', undefined)).not.toThrow()
    expect(() => show('visible')).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))
    expect(rejecting).toHaveBeenCalledTimes(1)
    expect(throwing).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

describe('createUpdateSignal', () => {
  it('calls subscribers when notified, and a late subscriber at once', () => {
    const signal = createUpdateSignal()
    const early = vi.fn()
    signal.subscribe(early)
    expect(early).not.toHaveBeenCalled()
    signal.notify()
    expect(early).toHaveBeenCalledTimes(1)
    const late = vi.fn()
    signal.subscribe(late)
    expect(late).toHaveBeenCalledTimes(1)
  })

  it('notify twice calls a subscriber twice (the reducer ignores the repeat)', () => {
    const signal = createUpdateSignal()
    const listener = vi.fn()
    signal.subscribe(listener)
    signal.notify()
    signal.notify()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('subscribe, unsubscribe, subscribe again after it fired (StrictMode remount): called at once, never after unsubscribing', () => {
    const signal = createUpdateSignal()
    signal.notify()
    const first = vi.fn()
    const unsubscribe = signal.subscribe(first)
    expect(first).toHaveBeenCalledTimes(1)
    unsubscribe()
    const second = vi.fn()
    signal.subscribe(second)
    expect(second).toHaveBeenCalledTimes(1)
    signal.notify()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('an unsubscribed listener is not called', () => {
    const signal = createUpdateSignal()
    const listener = vi.fn()
    const unsubscribe = signal.subscribe(listener)
    unsubscribe()
    signal.notify()
    expect(listener).not.toHaveBeenCalled()
  })
})
