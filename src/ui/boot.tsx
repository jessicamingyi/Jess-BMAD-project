import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { loadSaved, type LoadResult, type SaveStore } from '../persistence/store.ts'
import { App } from './app.tsx'

/** A load still pending after this long counts as unreadable: defaults, saving off. */
export const LOAD_TIMEOUT_MS = 3000

/** `loadSaved`, raced against a timeout so a hung IndexedDB open can't keep the page blank. */
export function loadWithTimeout(store: SaveStore, ms = LOAD_TIMEOUT_MS): Promise<LoadResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<LoadResult>((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'unreadable' }), ms)
  })
  return Promise.race([loadSaved(store), timeout]).finally(() => clearTimeout(timer))
}

/**
 * Start the app: load the saved document, apply Lamplight to `html` before React's
 * first render, mark `html` ready (theme.css hides the page until then), then render.
 * Unreadable data (or a failed or hung load) is never overwritten: saving stays
 * off for this page load.
 */
export async function boot(store: SaveStore, rootEl: HTMLElement, html: HTMLElement, options: { today?: string } = {}): Promise<Root> {
  const result = await loadWithTimeout(store)
  const loaded = result.kind === 'loaded' ? result.slices : undefined
  if (loaded?.settings.lamplight) html.dataset.theme = 'lamplight'
  html.dataset.ready = ''
  const root = createRoot(rootEl)
  root.render(
    <StrictMode>
      <App loaded={loaded} store={store} saving={result.kind !== 'unreadable'} today={options.today} />
    </StrictMode>,
  )
  return root
}
