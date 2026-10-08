import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const CSP_META = /\s*<meta http-equiv="Content-Security-Policy"[^>]*>/

/**
 * The CSP meta in index.html ships in every build (AD-12). The dev server alone
 * needs inline scripts and styles (React refresh preamble, CSS HMR), so it drops
 * the meta while serving. Build and preview keep it.
 */
function devOnlyRelaxCsp(): Plugin {
  return {
    name: 'traveller-sudoku:dev-relax-csp',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace(CSP_META, ''),
  }
}

/** GitHub Pages serves the repository under this path; the manifest's start_url and scope match it. */
const BASE = '/Jess-BMAD-project/'

/**
 * Offline play (Story 4.3): Workbox `generateSW` precaches the whole built app (shell,
 * every JS/CSS chunk including the one holding the City data, the generator worker,
 * the manifest and icons). `registerType: 'prompt'` with no `skipWaiting`/`clientsClaim`:
 * a new version waits until every tab is closed; the app only shows a banner
 * (`ui/service-worker`). Registration is bundled code (`injectRegister: false`), so the
 * CSP stays `default-src 'self'`. No runtime caching, no cross-origin URLs.
 */
const pwa = VitePWA({
  // Always the minified production service worker (Vitest's NODE_ENV=test would pick the dev build).
  mode: 'production',
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: false,
  // The glob already lists the icons (the manifest's own entry is added by the plugin).
  includeManifestIcons: false,
  manifest: {
    name: 'Traveller Sudoku',
    short_name: 'Traveller Sudoku',
    description: 'Correspondence by puzzle.',
    start_url: BASE,
    scope: BASE,
    display: 'standalone',
    // Daylight desk token (src/ui/theme.css).
    background_color: '#F5EFDF',
    theme_color: '#F5EFDF',
    icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  },
  workbox: {
    // Every asset type the app can emit; sw.js and the Workbox runtime are left out by the plugin.
    globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2,webmanifest}'],
    // The plugin adds the web manifest's own entry; globbing it too would list it twice.
    globIgnores: ['**/node_modules/**/*', 'manifest.webmanifest'],
    navigateFallback: 'index.html',
    skipWaiting: false,
    clientsClaim: false,
    cleanupOutdatedCaches: true,
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), devOnlyRelaxCsp(), pwa],
  build: {
    // Never inline assets as data: URIs; the CSP (default-src 'self') blocks them.
    assetsInlineLimit: 0,
  },
  // The generator runs in a module worker (`{ type: 'module' }`), emitted as its own same-origin chunk.
  worker: {
    format: 'es',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // The PWA plugin's virtual module doesn't load under Vitest; tests get a no-op stand-in.
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./tests/stubs/pwa-register.ts', import.meta.url)) },
    environment: 'node',
    // jsdom App mounts take ~1.5s alone; under a full parallel run the first in a file can pass 5s.
    testTimeout: 15_000,
  },
})
