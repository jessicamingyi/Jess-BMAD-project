import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
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

// https://vite.dev/config/
export default defineConfig({
  base: '/Jess-BMAD-project/',
  plugins: [react(), devOnlyRelaxCsp()],
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
    environment: 'node',
    // jsdom App mounts take ~1.5s alone; under a full parallel run the first in a file can pass 5s.
    testTimeout: 15_000,
  },
})
