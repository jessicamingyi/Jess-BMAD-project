import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createSession } from '../../src/game/session.ts'
import type { Session } from '../../src/game/types.ts'
import { SudokuGrid } from '../../src/ui/sudoku-grid.tsx'

/** Parse rendered cell buttons into { class, attrs, text } in cell order. */
function cells(html: string) {
  return [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].map(([, attrs, text]) => ({
    classes: (attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(' '),
    attrs,
    text,
  }))
}

describe('SudokuGrid', () => {
  const base = createSession('free', samplePuzzle)
  const given = 0 // '5'
  const player = 2 // empty in the fixture
  const empty = 3
  const session: Session = { ...base, digits: base.digits.slice(0, player) + '4' + base.digits.slice(player + 1) }
  const html = renderToStaticMarkup(createElement(SudokuGrid, { session, selectedCell: player, onClick: () => {} }))
  const rendered = cells(html)

  it('renders 81 gridcells in 9 rows of a labelled grid', () => {
    expect(rendered).toHaveLength(81)
    expect(html).toMatch(/<div class="sudoku-grid" role="grid" aria-label="Sudoku grid">/)
    expect(html.match(/role="row"/g)).toHaveLength(9)
    expect(html.match(/role="gridcell"/g)).toHaveLength(81)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html.match(/tabindex="-1"/g)).toHaveLength(80)
  })

  it('marks Givens, player digits and empty cells', () => {
    expect(rendered[given].classes).toContain('sudoku-cell--given')
    expect(rendered[given].text).toBe('5')
    expect(rendered[given].attrs).toContain('aria-label="Row 1, column 1, 5, given"')
    expect(rendered[player].classes).toContain('sudoku-cell--player')
    expect(rendered[player].text).toBe('4')
    expect(rendered[player].attrs).toContain('aria-label="Row 1, column 3, 4, your digit"')
    expect(rendered[empty].classes).toContain('sudoku-cell--empty')
    expect(rendered[empty].text).toBe('')
    expect(rendered[empty].attrs).toContain('aria-label="Row 1, column 4, empty"')
  })

  it('marks only the selected cell', () => {
    const selected = rendered.flatMap((c, i) => (c.classes.includes('sudoku-cell--selected') ? [i] : []))
    const current = rendered.flatMap((c, i) => (c.attrs.includes('aria-current="true"') ? [i] : []))
    expect(selected).toEqual([player])
    expect(current).toEqual([player])
    expect(html).not.toContain('aria-pressed')
  })

  it('draws box rules left of columns 3 and 6 and above rows 3 and 6', () => {
    rendered.forEach((c, i) => {
      const row = Math.floor(i / 9)
      const col = i % 9
      expect(c.classes.includes('sudoku-cell--box-left'), `cell ${i}`).toBe(col === 3 || col === 6)
      expect(c.classes.includes('sudoku-cell--box-top'), `cell ${i}`).toBe(row === 3 || row === 6)
      expect(c.classes.includes('sudoku-cell--thin-left'), `cell ${i}`).toBe(col % 3 !== 0)
      expect(c.classes.includes('sudoku-cell--thin-top'), `cell ${i}`).toBe(row % 3 !== 0)
    })
  })
})

