# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-undo-and-restart.md`
  summary: Adopt a DOM test environment (e.g. jsdom + a mount helper) so focus moves and click/keyboard wiring in `src/ui` can be tested.
  evidence: Vitest runs in `node` with `renderToStaticMarkup` only, which never runs effects or handlers; the 1.4 focus hand-off (Keep going / Restart) and PuzzleScreen dispatch wiring can regress with all tests green. Story 1.5 (keyboard) is the natural place to adopt it.
  resolved: Story 1.5 adopted jsdom 30.1.2 with mounted DOM tests in `tests/ui/keyboard.test.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-keyboard-and-screen-reader.md`
  summary: Check in real browsers (Firefox especially) that Space on a grid cell in number-first places the current digit once, not place-then-clear via a native keyup click.
  evidence: `useKeyboard` prevents only the Space keydown; jsdom never fires native button activation, so tests can't show it. If a browser still clicks on keyup, `cellClicked` re-applies the digit and clears it (unverified, medium if true). Settle with a manual Firefox/Chrome check; fix by also preventing the matching keyup.
