import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

/**
 * Vitest stand-in for `virtual:pwa-register` (aliased in vite.config.ts): the plugin's
 * virtual id does not load under Vitest's module runner, and jsdom has no service worker.
 * Tests that exercise registration inject their own fake (`ui/service-worker`).
 */
export function registerSW(_options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void> {
  return async () => {}
}
