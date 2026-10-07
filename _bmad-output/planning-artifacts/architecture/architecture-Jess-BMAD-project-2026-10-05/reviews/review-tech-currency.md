# Review: Technology Currency and Reality Check

- **Target:** `ARCHITECTURE-SPINE.md` (Stack table, AD-7, AD-8, deployment, starter, Node)
- **Lens:** was each committed technology decision checked against live sources rather than asserted from training data?
- **Date checked:** 2026-10-05
- **Verdict:** **PASS WITH FIXES.** Every Stack version matches the live npm registry and the live `create-vite` react-ts template, and the peer dependencies fit together. Two behaviour claims are under-specified or too optimistic against current browser and plugin reality: AD-8's "activate on next launch" (needs a named `registerType` and an accurate definition of "next launch"), and AD-7's reliance on `navigator.storage.persist()` to deal with Safari's 7-day eviction. Node 24 is correct today but moves from Active LTS to Maintenance on 2026-10-20.

## 1. Evidence gathered (live, 2026-10-05)

### 1.1 npm registry `latest`

| Package | Spine | npm `latest` | Published | Status |
| --- | --- | --- | --- | --- |
| `create-vite` | 9.2 | 9.2.1 | 2026-09-10 | Matches |
| `vite` | 8.3 | 8.3.2 | 2026-10-01 | Matches |
| `react` / `react-dom` | 19.3 | 19.3.0 | — | Matches |
| `typescript` | 6.0 (starter pin) | **7.0.2** (2026-07-08) | — | Intentional: the starter pins `~6.0.2`. Accurate as written |
| `@vitejs/plugin-react` | 6.1 | 6.1.2 | — | Matches |
| `vite-plugin-pwa` | 2.0 | 2.0.0 | **2026-10-03 (2 days old)** | Matches; see F-5 |
| `idb-keyval` | 6.3 | 6.3.0 | 2026-07-08 | Matches |
| `vitest` | 5.0 | 5.0.3 | 2026-09-30 | Matches |
| `workbox-build` (transitive) | — | 7.4.1 | — | Required by vite-plugin-pwa `^7.4.1` |

### 1.2 Live `create-vite` react-ts template (`vitejs/vite@main/packages/create-vite/template-react-ts/package.json`)

`react ^19.3.0`, `react-dom ^19.3.0`, `@vitejs/plugin-react ^6.1.1`, `vite ^8.3.1`, `typescript ~6.0.2`, `@types/node ^24.19.0`, `oxlint ^1.85.0`; build script is `tsc -b && vite build`, and lint is `oxlint`. This confirms the Stack table and the "starter pin" note on TypeScript. The starter now ships **oxlint** (not ESLint) as its linter. The spine doesn't mention linting. That's fine because it's a starter default, but agents shouldn't add ESLint "because Vite templates use it".

### 1.3 Peer-dependency and engine compatibility

| Package | Peer / engine requirement | Fits pinned stack? |
| --- | --- | --- |
| `vite-plugin-pwa@2.0.0` | `vite ^3…^8`; `workbox-build ^7.4.1`; `workbox-window ^7.4.1`; node `>=20.19.0` | Yes |
| `@vitejs/plugin-react@6.1.2` | `vite ^8.0.0`; node `^20.19.0 \|\| >=22.12.0` | Yes |
| `vitest@5.0.3` | `vite ^6.4 \|\| ^7 \|\| ^8`; `@types/node ^22 \|\| >=24`; node `^22.12 \|\| ^24 \|\| >=26` | Yes |
| `vite@8.3.2` | node `^20.19.0 \|\| >=22.12.0` | Yes |

No conflicts. Node 24 satisfies every engine range.

### 1.4 Node.js release schedule (`nodejs/Release/schedule.json`, `nodejs.org/dist/index.json`)

- v24 "Krypton": LTS since 2025-10-28, **Maintenance from 2026-10-20**, EOL 2028-04-30.
- v26: Current (latest 26.10.0, 2026-09-21), **becomes LTS 2026-10-28**, EOL 2029-04-30.

"24 LTS" is correct today, but in about three weeks it becomes Maintenance LTS and 26 becomes the Active LTS.

### 1.5 vite-plugin-pwa update behaviour (vite-pwa-org docs)

- `registerType: 'prompt'` is the **default**. The app gets `onNeedRefresh`, and calling `updateSW()` reloads the page.
- `registerType: 'autoUpdate'` **forces `workbox.skipWaiting` and `workbox.clientsClaim` to `true`**. The docs warn that users "can lose data in any browser windows/tabs" and that switching from `autoUpdate` to `prompt` after go-live "can be a pain".
- With `generateSW` in prompt mode, Workbox does not call `skipWaiting` on install, so the new worker stays in *waiting* until a `SKIP_WAITING` message arrives (sent by `updateSW()`) or until **every controlled client (tab/window) of the origin is closed**. A plain reload of a single open tab does not activate a waiting worker (standard service worker lifecycle).
- v2.0.0 release notes: the only breaking change is allowing `@vite-pwa/assets-generator ^2.0.0` as a peer. There is no change to `registerType` or `generateSW` behaviour.

### 1.6 Persistent storage and Safari eviction (MDN, WebKit blog)

- `StorageManager.persist()` is Baseline (widely available since Dec 2021) and needs a secure context (HTTPS). GitHub Pages provides that.
- **Firefox:** shows a **permission prompt** to the user.
- **Chrome / Edge / Safari:** no prompt. They grant or deny based on heuristics about how the user has interacted with the site.
- **Safari 17+ (WebKit "Updates to Storage Policy"):** "grants a request based on heuristics like whether the website is opened as a Home Screen Web App". On macOS that means Add to Dock. A normal Safari tab will usually get `false`.
- **Safari proactive eviction (MDN):** with tracking prevention on (the default), "if an origin has no user interaction … in the last seven days of browser use, its data created from script will be deleted." Installed web apps (Home Screen / Dock) are not part of Safari's counter. WebKit says persistent-mode origins may be excluded from eviction, but persistent mode is rarely granted to a plain tab.

### 1.7 GitHub Pages (Vite static-deploy guide)

GitHub Pages is still current and recommended in Vite's docs, deployed through GitHub Actions. For a project site at `https://<user>.github.io/<repo>/`, Vite needs `base: '/<repo>/'`. That base also sets the service worker scope and the manifest `start_url`/`scope` produced by vite-plugin-pwa.

## 2. Findings

### F-1 [High] AD-8 doesn't name `registerType`, and "activated on the next launch" isn't how the lifecycle works
The spine commits to "activated on the next launch, never forced" but doesn't pin the setting that controls it. An agent that copies the most common online snippet (`registerType: 'autoUpdate'`) will force `skipWaiting` and `clientsClaim`. That is exactly the mid-Puzzle reload AD-8 is meant to prevent, and the plugin docs say it is hard to undo after launch. Also, in prompt mode the waiting worker activates only when **all** tabs of the app are closed, not on the "next launch" if a tab stays open (common for desktop players who leave the tab pinned).
**Fix:** state in AD-8: `registerType: 'prompt'` (explicit, even though it's the default). Never set `workbox.skipWaiting`/`clientsClaim` to true. Never call `updateSW()` while a Puzzle session is active. Either ignore `onNeedRefresh` or show a calm "update ready, applies when you next open the game" note. Reword "next launch" to "after all game tabs are closed, or when the player chooses to update from a non-Puzzle screen".

### F-2 [High] AD-7 assumes `navigator.storage.persist()` covers FR-24, but desktop Safari will normally deny it in a tab
The PRD (addendum D2) names Safari's 7-day eviction as the risk this decision addresses. Live WebKit guidance says Safari grants persistence mainly to Home Screen/Dock web apps. So for the typical desktop Safari player the call returns `false`, and script-written storage (IndexedDB) can still be evicted after 7 days of browser use without visiting the site. The spine records the call but not what happens when it returns `false`.
**Fix:** add to AD-7: keep the `persist()` result in state (`storagePersisted: boolean`). When it's `false` on Safari, the storage notice (FR-19) suggests "Add to Dock" (Safari 17+ macOS) for a player who wants their Album kept. Record this as a known limitation alongside the export/import exclusion. That's a product decision for the PM. The architecture only needs to make the persisted/not-persisted state available.

### F-3 [Medium] Calling `persist()` "on first launch" triggers a Firefox permission prompt with no context
Firefox shows a permission popup. If it fires on first load, before the FR-19 storage notice, the player gets an unexplained browser prompt, which goes against the calm-UX intent. Chrome and Edge are silent, but they often deny on first visit because there's no engagement yet. Calling once at first launch and never again means a later, more likely grant is never asked for.
**Fix:** call `persist()` when the player dismisses the FR-19 storage notice (a user gesture, with the reason already explained). Re-check `navigator.storage.persisted()` on later launches and ask again (silently on Chromium/Safari) after the first Postcard if still not persisted.

### F-4 [Low] Node 24 moves to Maintenance LTS on 2026-10-20; Node 26 becomes Active LTS on 2026-10-28
"24 LTS" is accurate today and every tool supports it (the template also pins `@types/node ^24`). But the spine is dated 2 weeks before the change. This isn't a blocker, since Maintenance runs to 2028-04.
**Fix:** write "Node 24 LTS (Maintenance from 2026-10-20; 26 LTS acceptable from 2026-10-28)" and pin it via `.nvmrc`/`engines` and the GitHub Actions `setup-node` version, so local and CI use the same version.

### F-5 [Low] `vite-plugin-pwa` 2.0.0 is 2 days old; GitHub Pages `base` isn't recorded
2.0.0 (2026-10-03) is effectively 1.3.0 plus a wider peer range for the assets generator, so the risk is small. A fallback to `^1.3.0` (which supports Vite 8) is available if problems show up. Separately, if the GitHub Pages assumption holds and the site is a project page, `base: '/<repo>/'` must be set. Otherwise the service worker scope, the precache URLs and the manifest `scope` break offline play (FR-18). This is a deployment fact every shell module depends on.
**Fix:** add one line under Deployment: "`vite.config` `base` = `/<repo>/` for a project Pages site (or `/` with a custom domain); service worker scope and manifest scope follow it."

## 3. Confirmed and needing no change

- Every Stack row matches the live registry and the live starter template, including the honest "TypeScript 6.0 (starter pin)" while TS 7.0.2 is `latest`.
- Peer and engine ranges fit together with no conflicts (§1.3).
- `idb-keyval` 6.3.0 is current and still maintained (released 2026-07). It suits a single-document key-value store.
- `generateSW` fits: AD-8 needs only precaching and the default prompt lifecycle, with no custom service worker logic, so `injectManifest` isn't needed.
- The rule that the service worker never touches IndexedDB is consistent with `generateSW` (Workbox precache uses Cache Storage, not IndexedDB, for app data).
- GitHub Pages is still a supported, HTTPS-only static host (needed for service workers and `persist()`), documented in Vite's deploy guide.

## Sources

- https://registry.npmjs.org/{create-vite,vite,react,react-dom,typescript,@vitejs/plugin-react,vite-plugin-pwa,idb-keyval,vitest,workbox-build}
- https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/package.json
- https://github.com/vite-pwa/vite-plugin-pwa/releases (v2.0.0, v1.3.0)
- https://vite-pwa-org.netlify.app/guide/prompt-for-update.html
- https://vite-pwa-org.netlify.app/guide/auto-update.html
- https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://raw.githubusercontent.com/nodejs/Release/main/schedule.json
- https://vite.dev/guide/static-deploy
