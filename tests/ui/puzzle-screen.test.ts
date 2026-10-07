import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { remainingByDigit } from '../../src/game/digit-counts.ts'
import { PuzzleScreen } from '../../src/ui/puzzle-screen.tsx'

describe('PuzzleScreen', () => {
  const html = renderToStaticMarkup(createElement(PuzzleScreen))

  it('puts the mode indicator above the digit pad in the side column', () => {
    const side = html.indexOf('class="side-column"')
    const mode = html.indexOf('class="mode-indicator"')
    const pad = html.indexOf('class="digit-pad"')
    expect(side).toBeGreaterThan(-1)
    expect(mode).toBeGreaterThan(side)
    expect(pad).toBeGreaterThan(mode)
  })

  it('starts with pad captions from the Givens', () => {
    const counts = [...html.matchAll(/<span class="digit-pad-count">([^<]*)<\/span>/g)].map((m) => m[1])
    const expected = remainingByDigit(samplePuzzle.givens)
      .slice(1)
      .map((n) => (n === 0 ? 'Done' : `${n} left`))
    expect(counts).toEqual(expected)
  })

  it('starts with the status line "cell-first · Digit · choose a cell"', () => {
    expect(html).toContain('<p class="mode-status">cell-first · Digit · choose a cell</p>')
  })
})
