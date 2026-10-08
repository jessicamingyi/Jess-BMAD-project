/// <reference types="vite-plugin-pwa/vanillajs" />
// The virtual module's types, here rather than in a global .d.ts so both tsconfig projects (app, tests) see them.
import { registerSW, type RegisterSWOptions } from 'virtual:pwa-register'

/** `registerSW` from `vite-plugin-pwa`; tests inject a fake. Its returned `updateSW` is never called. */
export type RegisterSW = (options: RegisterSWOptions) => unknown

/** Swallow: a failed registration leaves the app working online, with no banner and no console noise. */
const ignore = () => {}

/**
 * Register the precaching service worker (Workbox `generateSW`, `registerType: 'prompt'`)
 * from bundled code. When a new version is installed and waiting, `onUpdateReady` runs;
 * the app never activates it (no `updateSW()`, no reload), so it takes over once every
 * tab is closed. Browsers check for a new version only on navigation, so a tab left open
 * also checks whenever it becomes visible again. Skipped where service workers are
 * unsupported; never throws. Returns whether registration was attempted.
 */
export function registerServiceWorker(
  onUpdateReady: () => void,
  register: RegisterSW = registerSW,
  nav: Navigator | undefined = globalThis.navigator,
  doc: Document | undefined = globalThis.document,
): boolean {
  if (!nav || !('serviceWorker' in nav) || !nav.serviceWorker) return false
  try {
    register({
      onNeedRefresh: onUpdateReady,
      // The plugin reloads the page when a new worker takes control; this session never reloads.
      onNeedReload: ignore,
      onRegisterError: ignore,
      onRegisteredSW: (_url, registration) => {
        if (!registration || !doc) return
        doc.addEventListener('visibilitychange', () => {
          if (doc.visibilityState !== 'visible') return
          try {
            registration.update().catch(ignore)
          } catch {
            // An update check that can't start is retried on the next visit.
          }
        })
      },
    })
    return true
  } catch {
    return false
  }
}

/**
 * A one-shot "update waiting" signal bridging registration (started at boot) and the
 * App's reducer: a listener subscribed after the signal fired is called at once.
 */
export function createUpdateSignal(): { notify: () => void; subscribe: (listener: () => void) => () => void } {
  let fired = false
  const listeners = new Set<() => void>()
  return {
    notify: () => {
      fired = true
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      if (fired) listener()
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
