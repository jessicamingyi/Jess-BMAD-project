# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-undo-and-restart.md`
  summary: Adopt a DOM test environment (e.g. jsdom + a mount helper) so focus moves and click/keyboard wiring in `src/ui` can be tested.
  evidence: Vitest runs in `node` with `renderToStaticMarkup` only, which never runs effects or handlers; the 1.4 focus hand-off (Keep going / Restart) and PuzzleScreen dispatch wiring can regress with all tests green. Story 1.5 (keyboard) is the natural place to adopt it.
