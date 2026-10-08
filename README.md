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

Deploy is blocked while any City is a placeholder (`npm run check:placeholders`); lint, test and build still pass.

Every push to `main` runs lint, tests and build, then deploys to GitHub Pages only if all pass:
https://jessicamingyi.github.io/Jess-BMAD-project/
