---
title: 'Story 1.1: Publish the Traveller Sudoku shell'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: 'c7d4b366f2c589446730b7b6943eb4033e6ffb7f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has planning documents but no app. Every later story needs the agreed starter, the AD-1 layout, a guard that keeps `engine/` and `game/` pure, design tokens, and an automatic deploy from `main`.

**Approach:** Scaffold `create-vite` 9.2 `react-ts` at the repo root with pinned versions. Add the AD-1 folders, a Vitest architecture test, the Airmail Daylight token stylesheet, a calm header-only shell page under a strict CSP, and a GitHub Actions workflow that tests, builds and deploys to GitHub Pages.

## Boundaries & Constraints

**Always:** Exact pins: `vite` 8.3.3, `react`/`react-dom` 19.3.0, `typescript` 6.0.3, `@vitejs/plugin-react` 6.1.2, `oxlint` 1.85.0, `vitest` 5.0.3. `.nvmrc` = `24`. Vite `base` = `/Jess-BMAD-project/`. Kebab-case file names, PascalCase types. Components use tokens, never raw hex. System serif stack only. Built `index.html` has `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`.

**Never:** `vite-plugin-pwa`, `idb-keyval`, ESLint (oxlint replaces it), service workers, storage writes, analytics, network calls, web fonts, animation, sound, `data:` URIs (blocked by the CSP), or a routing library. No grid, nav, Lamplight or contrast test yet (Stories 1.2 and 1.6). No placeholder-City deploy gate (Story 3.1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Clean tree | current `src/` | architecture test passes | N/A |
| Bad import | `src/engine/x.ts` imports `../game/y` | `npm test` fails naming `src/engine/x.ts` and `../game/y` | N/A |
| Bad package | `src/game/x.ts` imports `react` | fails naming file and `react` | N/A |
| Impure global | `src/engine/x.ts` uses `Math.random`, `Date`, `window`, `document`, `localStorage` or `indexedDB` | fails naming file and global | N/A |
| Allowed edge | `src/scripts`-layer file imports `src/game/journey` | passes | N/A |
| Failing CI step | push to `main`, any step fails | no deploy; previous site stays live | workflow job fails |

**Decisions:**
- Hosting: Jessica makes the repo public. Then Pages is enabled with source "GitHub Actions" (`gh api`, only after Jessica confirms the repo is public). The site goes live when this story merges to `main`.
- Spec size: kept whole (about 1,850 tokens), by choice.

</frozen-after-approval>

## Code Map

- `.gitignore` -- already ignores `node_modules/` and `dist/`; keep the BMAD entries.
- `README.md` -- existing practice-project intro; add a short "Develop" section (Node 24, npm scripts, live URL).
- `_bmad/`, `.claude/`, `_bmad-output/` -- tooling and planning; don't touch, and keep them out of `src` and tests.
- No app code exists yet. `create-vite` scaffolds into a temp folder, then files are moved in (the root isn't empty).
- Live URL: `https://jessicamingyi.github.io/Jess-BMAD-project/`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json`, `.nvmrc`, `tsconfig*.json`, `vite.config.ts` -- scaffold `react-ts` and remove the ESLint packages, config and demo assets. Pin the versions above. Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `lint` (`oxlint`). Vitest config inside `vite.config.ts`. -- Starter template.
- [x] `src/{engine,game,content,persistence,workers}/.gitkeep`, `scripts/.gitkeep`, `public/favicon.svg` -- AD-1 layout; own favicon so the page has no 404s. -- AD-1.
- [x] `index.html` -- `lang="en"`, title "Traveller Sudoku", the CSP meta, favicon. -- AD-12.
- [x] `src/main.tsx`, `src/ui/app.tsx` -- render a header (wordmark "Traveller Sudoku", tagline "correspondence by puzzle", 3px double `ink` rule) and an empty `<main>`. -- UX-DR14.
- [x] `src/ui/theme.css` -- the 16 Daylight colour tokens (UX-DR1), typography tokens (UX-DR4), spacing, size and shape tokens (UX-DR5); `desk` background with a faint diagonal `ink` hatch (~3%) and a top-left glow made with CSS gradients (UX-DR6). -- Tokens.
- [x] `tests/architecture/check-architecture.ts` -- pure checker `(files: { path, source }[]) => Violation[]` that uses the TypeScript compiler API to find static, re-export and dynamic imports and impure globals, then applies the AD-1 rules. -- AD-1.
- [x] `tests/architecture/architecture.test.ts` -- unit tests for every row of the I/O matrix using in-memory fixtures, plus one test over the real `src/` and `scripts/` tree that expects zero violations. -- Proves the guard fails and passes.
- [x] `tests/shell.test.ts` -- reads `index.html` and `src/ui/theme.css`: checks the CSP meta, all 16 hexes, no raw hex in `src/ui/*.tsx`, and no `@font-face`/`url(http`. -- Static guards.
- [x] `.github/workflows/ci-deploy.yml` -- on push to `main` (and `workflow_dispatch`): Node from `.nvmrc`, `npm ci` → `npm run lint` → `npm test` → `npm run build` → upload `dist` → `actions/deploy-pages` in a dependent job. -- CI/CD.
- [x] `README.md` -- Develop section. -- Onboarding.

**Acceptance Criteria:**
- Given a fresh clone on Node 24, when running `npm ci`, `npm run lint`, `npm test` and `npm run build`, then all succeed with zero errors.
- Given `npm run build`, when `dist/index.html` is inspected, then asset URLs start with `/Jess-BMAD-project/` and the CSP meta is present.
- Given `npm run preview`, when the page loads in a browser, then it shows the desk background, wordmark, red small-caps tagline and double rule, with no console errors, no cross-origin requests, no font downloads and nothing in storage.

## Implementation Notes

- `create-vite` 9.2 `react-ts` already ships oxlint (`.oxlintrc.json`) and no ESLint, so nothing ESLint-related needed removing; demo assets (`App.*`, `index.css`, `src/assets/`, `icons.svg`) were not copied in.
- `@types/*` pinned to the versions the template resolved (`@types/node` 24.13.3, `@types/react` 19.2.18, `@types/react-dom` 19.2.7).
- `vite.config.ts` adds a serve-only plugin that strips the CSP meta from `index.html` during `npm run dev` (React refresh preamble and CSS HMR are inline and would be blocked). Build and preview keep the meta. `assetsInlineLimit: 0` prevents `data:` URIs.
- `tsconfig.node.json` also includes `tests/`, so `tsc -b` type-checks the tests.
- AD-1 checker: `content` has no outbound edges (AD-1 lists none); imports resolving outside `src/`/`scripts/` count as layer `outside` and are disallowed for every non-entry layer. Both `scripts/` and `src/scripts/` are treated as the scripts layer.
- Matrix audit: added a static test in `tests/shell.test.ts` for the "Failing CI step" row (run-step order, no `continue-on-error`/`always()`, deploy `needs: build`). 30/30 tests pass.
- Review pass 1 patches applied (see Review Triage Log): new `tests/build-output.test.ts` (programmatic Vite build; CSP, base, no `data:`); checker fixes (directory imports, extra banned globals, strict `journey` match, non-vacuous real-tree test); recursive no-hex test; CI on `pull_request`, Pages steps and deploy gated to `refs/heads/main`, concurrency per ref; `main.tsx` throws if `#root` is missing. Limit: `assetsInlineLimit` removal is not caught until a source asset exists. 47/47 tests pass.

## Spec Change Log

## Review Triage Log

Pass 1 (blind = B, edge-case = E, verification-gap = V).

| Finding | Verdict | Evidence | Route |
|---|---|---|---|
| V1 build output (`base`, CSP meta, no `data:`) not checked by tests/CI | medium | Pre-verified: tests read only source `index.html`; changing `apply: 'serve'` or `base` ships green. | patch |
| V2 `require`, `import =`, `import()` type, `Math['random']` branches untested | low | Pre-verified: deleting any branch leaves 30/30 green. | patch |
| E1 `game` → `'../engine'` (directory import) falsely flagged | medium | Probe: returns violation `../engine`; `layerOf('src/engine')` is `entry`. Blocks barrel imports in 1.2+. | patch |
| B4/V-o2 purity bypass via `globalThis.Date`, `performance`, `crypto`, `sessionStorage` | medium | Probe: all zero violations; AD-1 bans "storage" and non-determinism. | patch |
| E8 `scripts` may import `game/journey-*` | low | Probe: `../src/game/journey-secrets` passes; regex accepts `-`. Direct regex fix. | patch |
| E6/E7 real-tree test passes vacuously if classification breaks | low | Only asserts `files.length > 0`; one-line assertion. | patch |
| B6/E10 no-raw-hex test non-recursive, `.tsx` only | medium | `readdirSync('src/ui')` non-recursive; nested components in 1.2+ escape the guard. | patch |
| B1/V-o3 CI never runs on pull requests | medium | Triggers are `push: main` + dispatch; broken PRs reach `main` (deploy still gated). Two-line fix. | patch |
| B2/E12 `workflow_dispatch` on non-main branch can deploy | low | No `if:` on deploy job; only Pages environment rules stop it. One-line guard. | patch |
| B13/E11 `main.tsx` silent when `#root` missing | low | `if (root)` renders nothing, logs nothing; direct correction to throw. | patch |
| B14 duplicate `isPropertyAccessExpression` check in `isNameSlot` | low | Lines repeat; direct deletion. | patch |
| B3/E2 root-absolute `'/src/ui/app'` bypasses layer rules | low | Probe confirms bypass, but `tsc -b` cannot resolve `/src/...` (no `paths`), so the build fails first; fix adds a branch. | reject |
| E3 non-literal dynamic import / `import.meta.glob` / `new URL` workers undetected | low | Not used in pure layers; worker URLs live in `ui` (allowed to import `workers`); fix adds branches. | reject |
| B5/E5/V-o1 type-only `Date` and locals named `document` flagged | low | Probe: `{ d: Date }` flagged. Loud false positive, rare in engine/game (timestamps are not stored); fix adds a type-position guard. | reject |
| B7 CI-order test regex misses `run: \|` blocks | low | Exact-list assert still pins the four steps; full fix needs a YAML parser dependency. | reject |
| B8 no DOM/tsx test setup or App smoke test | low | Needs jsdom dependency; DOM tests arrive with the grid in Story 1.2. | reject |
| B9 no `<h1>`; wordmark is `<p>` | low | EXPERIENCE's "page heading" is each screen's own heading (e.g. "Where to first?"), arriving with those screens; shell has none yet. | reject |
| B10 `--color-focus` unused, no `:focus-visible` | false | The shell has no focusable controls; focus styles land with the first control (1.2/1.5). | reject |
| B11 missing `color-scheme: light` | false | Default `color-scheme: normal` already renders light controls; nothing opts into dark. | reject |
| B12 CSP lacks `base-uri`, `object-src`, `form-action` | low | The exact CSP string is fixed by the frozen intent and the story AC. | reject |
| B15 `src/scripts/` treated as scripts layer | low | Matches the frozen matrix wording ("`src/scripts`-layer file"); no harm named. | reject |
| B16 `package-lock.json` and spec missing from diff | false | Excluded from the review diff on purpose (lockfile size; spec goes to the edge-case layer only). | reject |
| E9 CRLF breaks `/^\s+needs: build$/m` on Windows | false | JS multiline `$` matches before `\r`; checked with a CRLF sample, matches. | reject |

## Design Notes

- Layers come from the path: `src/<layer>/…` and `scripts/…`. Files directly in `src/` (`main.tsx`) count as the entry point and may import any layer. `engine` and `game` may not import bare packages; other layers may. `scripts` may import `src/game/journey*` (architecture spine) but no other part of `game`.
- Use the TS AST, not regex, so comments and strings never cause false positives: e.g. flag `Math.random` as a property access, and `Date` only as an identifier reference.

## Verification

**Commands:**
- `npm ci && npm run lint && npm test && npm run build` -- expected: exit 0
- `grep -c "/Jess-BMAD-project/assets/" dist/index.html` -- expected: ≥ 1

**Manual checks (if no CLI):**
- `npm run preview`, then open the page with a browser tool: confirm the header renders and the Network tab shows only same-origin requests.
