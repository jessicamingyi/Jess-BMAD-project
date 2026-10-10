# Jess-BMAD-project
A practice project for learning the BMAD Method and AI-driven software development.

## Develop

Traveller Sudoku is a static React + TypeScript app built with Vite. Use Node.js 24 (`nvm use` reads `.nvmrc`).

```sh
npm ci            # install exact pinned versions
npm run dev       # local dev server
npm run lint      # oxlint
npm test          # Vitest, including the AD-1 architecture guard
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally
```

Every push to `main` runs lint, tests and build. Deploying to GitHub Pages is opt-in: the deploy job
runs only when the repository variable `PAGES_ENABLED` is `true` (and Pages is set to deploy from
GitHub Actions), and only if every check passes, including `npm run check:placeholders` (no
placeholder City). Once enabled, the game is served at
https://jessicamingyi.github.io/Jess-BMAD-project/

## Smoke tests

```sh
npm run smoke                      # build, then run every end-to-end journey
node scripts/smoke/run.ts offline  # re-run only journeys whose name contains "offline" (uses the existing dist/)
```

The smoke suite serves the build with `vite preview` and drives a real browser headless through
the main journeys: first launch, play, Postcard, Free Play, reload, two tabs, offline, corrupt data,
storage unavailable and the update banner. It needs Google Chrome or Microsoft Edge installed
locally (found in the usual install locations; set `CHROME_PATH` to use another). No extra packages.
Each journey prints PASS or FAIL; a failure saves a screenshot to `smoke-results/` and the run exits
non-zero. A run takes about a minute. It is not part of CI.
