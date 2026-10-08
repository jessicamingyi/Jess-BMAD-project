---
title: 'Story 4.3: Play offline and update gently'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_revision: '487018cffda214714cec48f8a147322d78226049'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-safe-across-versions-and-tabs.md'
warnings: []
deferred:
  - summary: >-
      Install metadata is thin: one SVG icon, no PNG or apple-touch-icon, no manifest id, no theme-color meta.
    evidence: |-
      vite.config.ts manifest icons; index.html. Not a 4.3 AC; relevant to Story 4.4 (Safari Add to Dock) and the v1 release.
    location: >-
      vite.config.ts (VitePWA manifest), index.html
    severity: low
  - summary: >-
      A tab hard-reloaded past the service worker can save a newer schema while other tabs stay on the old precached build, where the newer-version banner's "Reload to carry on" does not help.
    evidence: |-
      Needs a schema v2 to exist; today MIGRATIONS is empty and SCHEMA_VERSION is 1. Revisit with the first real migration (close every tab, not reload).
    location: >-
      src/content/copy.ts bannerNewerVersion; src/ui/service-worker.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** The game needs the network every time it opens, and a new deploy would only reach a player through an unmanaged reload; Epic 4 promises play on a train and updates that never cost a Puzzle.

**Approach:** Add `vite-plugin-pwa` 2.0 (`generateSW`, `registerType: 'prompt'`) to precache the whole built app and register the service worker from bundled code; when a new worker is waiting, set `ui.updateReady` and show the lowest-priority notice banner "A new version is ready. It arrives next time you open the game." · "Got it", never activating it during the session.

## Boundaries & Constraints

**Always:**
- `vite-plugin-pwa` pinned at 2.0.x (exact) with its required peers (`workbox-window`, `workbox-build`) as dev dependencies; `strategies: 'generateSW'`, `registerType: 'prompt'`, `injectRegister: false` (registration is imported from `virtual:pwa-register` in bundled code; no inline script; CSP `default-src 'self'` keeps zero violations).
- Workbox: precache every built asset needed to play: `index.html`, all JS and CSS (the City catalogue and City Puzzles are bundled inside the main JS chunk), the generator worker chunk, the manifest and the icons; no `runtimeCaching`, no cross-origin URLs; `skipWaiting: false`, `clientsClaim: false`; navigation fallback to `index.html` within the base.
- Web manifest: `name` and `short_name` "Traveller Sudoku", `start_url` and `scope` equal the Vite `base` (`/Jess-BMAD-project/`), icons self-hosted from `public/` (SVG, `sizes: "any"`), colours from the Daylight tokens.
- `onNeedRefresh` dispatches `updateAvailable` → `ui.updateReady: true`; the app never calls the returned `updateSW()` and never reloads. Banner priority: read-only > save failed > unreadable > update ready (lowest; Story 4.4 inserts the storage and persistence banners above it). "Got it" dismisses it for the page.
- Registration lives in one module (`src/ui/service-worker.ts`) whose browser API is injectable so jsdom tests run without a worker; the architecture storage guard is untouched (the service worker never reads or writes IndexedDB).

**Never:**
- No `updateSW()`, `location.reload()`, `skipWaiting` or `clientsClaim`.
- No runtime caching, no CDN or cross-origin request, no inline registration script.
- No offline banner or "offline ready" message (not in the ACs).
- No change to saved data: loading after an update uses the existing migration path.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Update waiting | `onNeedRefresh` fires | `ui.updateReady` true; update banner shows if nothing higher is pending | none |
| Higher banner pending | read-only or save failed + update ready | only the higher banner; update shows after it is dismissed | none |
| Dismiss | "Got it" on the update banner | hidden for the page; focus to grid or heading | none |
| No service worker | `navigator.serviceWorker` missing (jsdom, old browser) | registration skipped; app works | no throw |
| Registration fails | `register` rejects | app works; no banner, no console error spam | caught |
| Build | `npm run build` | `sw.js` + `manifest.webmanifest` in `dist`; precache lists index.html, every JS/CSS asset (incl. the chunk holding the City data), the generator worker, icons; no `runtimeCaching` | build test |

</intent-contract>

## Code Map

- `vite.config.ts` -- add `VitePWA({...})` to `plugins`; `base` is `/Jess-BMAD-project/`; `worker.format: 'es'` (the generator worker chunk must be in `globPatterns`); keep `devOnlyRelaxCsp` and the `test` block.
- `src/content/cities.ts:1`, `src/content/city-puzzles.ts:1` -- JSON imported with `with { type: 'json' }`, so it is bundled into JS; the build test proves the precache covers it by finding a City id (e.g. `europe-near-1`) inside a precached JS asset.
- `public/favicon.svg` -- the only icon today; add `public/icon.svg` (simple self-made SVG) if a larger app icon is needed.
- `src/game/types.ts` `UiState` / `Action`, `src/game/session.ts` `createInitialState`, `src/game/reducer.ts` `noticeAction` -- add `updateReady: boolean` and `updateAvailable` (UI-only; allowed while read-only and during a reveal like the other notice actions).
- `src/game/banners.ts` -- priority list; add `updateReady` last.
- `src/content/copy.ts` -- banner string.
- `src/ui/notice-banner.tsx`, `src/ui/app.tsx` -- banner rendering already generic; map the new kind (info edge).
- `src/ui/boot.tsx` -- call `registerServiceWorker(dispatch-bridge)` after render; App must expose a way to dispatch `updateAvailable` (e.g. an `onUpdateReady` subscription prop or a small event emitter).
- `tests/build-output.test.ts:11-30` -- builds once into a temp dir; extend with `sw.js` precache-manifest and `manifest.webmanifest` assertions.
- `tests/shell.test.ts` -- CSP and CI assertions; keep green.

## Tasks & Acceptance

**Execution:**
- `package.json` / lockfile -- `npm install -D vite-plugin-pwa@2.0.0 workbox-window@^7.4.1 --save-exact` (add `workbox-build` if npm does not install it).
- `vite.config.ts` -- the `VitePWA` config above.
- `public/icon.svg` -- app icon (optional; favicon may serve).
- `src/ui/service-worker.ts` -- `registerServiceWorker(onUpdateReady, register = registerSW-from-virtual)`; guards missing support; swallows registration errors.
- `src/game/*`, `src/content/copy.ts`, `src/ui/app.tsx`, `src/ui/boot.tsx`, `src/ui/notice-banner.tsx` -- `updateReady` state, action, priority, banner, wiring.
- `src/vite-env.d.ts` (or equivalent) -- `vite-plugin-pwa/client` types for the virtual module.
- `tests/build-output.test.ts` -- precache and manifest assertions per the matrix; no `runtimeCaching`/cross-origin URLs and no `indexedDB` in `sw.js`.
- `tests/game/banners.test.ts`, `tests/game/update.test.ts` (or extend `read-only.test.ts`), `tests/ui/update-banner.test.ts` -- matrix rows: update banner, priority against every existing banner, dismissal and focus, fake register (support missing, rejection), `updateSW` never called.

**Acceptance Criteria:**
- Given the built app served by `vite preview` and visited once online in headless Chrome, when the network is switched off (DevTools `Network.emulateNetworkConditions` offline) and the page reloaded, then the game loads, saved data restores, a half-finished City reopens as left, another City Puzzle opens, and Free Play generates a Puzzle; no console errors.
- Given a second build with a change served to the same browser profile while a tab is open, when the new worker is waiting, then the update banner shows and the page does not reload.

## Design Notes

- **Content files:** the ACs name `cities.json` and `city-puzzles.json`; they are bundled into the main chunk by the existing JSON imports, so precaching that chunk precaches them. The build test proves it rather than restructuring content loading.
- **Icons:** SVG with `sizes: "any"` keeps icons self-hosted without a PNG toolchain; installability is not an AC.
- **"First visit fails partway"** is browser behaviour (no worker installed → normal offline page) and needs no code; it is covered by the precache being atomic in Workbox.

## Verification

**Commands:**
- `npm run lint && npm test && npm run build` -- expected: exit 0.

**Manual checks:**
- Offline AC above (headless Chrome over CDP). Update AC: build, preview, open a tab; change a string, rebuild into the same `dist`, trigger `registration.update()` from the page, and observe the banner without a reload.

## Auto Run Result

Status: done

**Summary:** the game now works offline. `vite-plugin-pwa` 2.0.0 (`generateSW`, `registerType: 'prompt'`, registered from bundled code, no inline script) precaches the whole build: shell, every JS and CSS chunk (including the City catalogue, City Puzzles and Technique texts), the generator worker, the manifest and the icon. When a new version is waiting, `ui.updateReady` shows the lowest-priority banner "A new version is ready. It arrives next time you open the game."; the app never activates it or reloads. A tab returning to view checks for a new deploy.

**Files changed:**
- `vite.config.ts` -- `VitePWA` config and manifest; Vitest alias for the virtual module
- `src/ui/service-worker.ts` (new) -- registration, visibility update check, update signal
- `src/ui/boot.tsx`, `src/ui/app.tsx` -- wiring
- `src/game/types.ts`, `session.ts`, `reducer.ts`, `banners.ts`, `src/content/copy.ts` -- `updateReady`, `updateAvailable`, priority, copy
- `tests/build-output.test.ts`, `tests/game/update.test.ts`, `tests/ui/service-worker.test.ts`, `tests/ui/update-banner.test.ts`, `tests/stubs/pwa-register.ts`, plus updated banner and reducer tests
- `package.json`, `package-lock.json` -- `vite-plugin-pwa`, `workbox-window`, `workbox-build`

**Review:** 19 findings. 5 patch entries applied (1 medium, 4 low); 2 deferred (install metadata, newer schema behind an old worker); the rest rejected with reasons in the triage log.

**Follow-up review recommended:** false. One medium entry was patched (a build test only), and nothing high.

**Verification:** `npm run lint` clean; `npm test` 60 files, 1173 tests pass; `npm run build` ok, precache 7 entries. Before the patches, headless Chrome on `vite preview` (short temp profile; the scratchpad path hit Windows path limits): after one online visit the worker activated; with the preview server stopped and the network emulated offline, a reload served the game, half-finished Paris reopened as left, London opened and Free Play generated a Puzzle, no console errors. Update: a second build served to the open tab plus `registration.update()` showed the update banner, the page did not reload, the new worker stayed waiting; "Got it" hid it and focused the grid.

**Residual risks:** the visibility update check and the widened glob were not re-run in a real browser after the patches; a new worker activates only when every tab is closed (browser behaviour, as the AC intends).
