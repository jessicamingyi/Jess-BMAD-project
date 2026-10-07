import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { cellMarks } from '../../src/game/assists.ts'
import { createSession, DEFAULT_SETTINGS } from '../../src/game/session.ts'
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

describe('SudokuGrid Assist marks', () => {
  const { givens, solution } = samplePuzzle
  const base = createSession('free', samplePuzzle)
  const allOn = { ...DEFAULT_SETTINGS, mistakeHighlighting: true }
  const render = (session: Session, selected: number | null, settings = allOn) => {
    const html = renderToStaticMarkup(
      createElement(SudokuGrid, {
        session,
        selectedCell: selected,
        marks: cellMarks(session, selected, settings),
        onClick: () => {},
      }),
    )
    return { html, cells: cells(html) }
  }
  const has = (c: { classes: string[] }, name: string) => c.classes.includes(`sudoku-cell--${name}`)
  const put = (s: Session, cell: number, d: string): Session => ({
    ...s,
    digits: s.digits.slice(0, cell) + d + s.digits.slice(cell + 1),
  })

  it('cell 40: row, column and box fills, 2 aria-hidden frame ticks and 4 box L-ticks', () => {
    const { html, cells: rendered } = render(base, 40)
    const lit = rendered.flatMap((c, i) => (has(c, 'highlight') ? [i] : []))
    expect(lit).toHaveLength(21)
    expect(html.match(/<span class="frame-tick frame-tick--(row|col)" aria-hidden="true"/g)).toHaveLength(2)
    expect(html).toContain('--tick-index:4')
    const corners = rendered.flatMap((c, i) => c.classes.filter((k) => k.includes('box-corner')).map((k) => `${i}:${k}`))
    expect(corners).toEqual([
      '30:sudoku-cell--box-corner-tl',
      '32:sudoku-cell--box-corner-tr',
      '48:sudoku-cell--box-corner-bl',
      '50:sudoku-cell--box-corner-br',
    ])
  })

  it('cell 57 (row 6, column 3): ticks carry their own index and box-rule count', () => {
    const { html } = render(base, 57)
    expect(html).toContain(
      '<span class="frame-tick frame-tick--row" aria-hidden="true" style="--tick-index:6;--tick-box-rules:2"></span>',
    )
    expect(html).toContain(
      '<span class="frame-tick frame-tick--col" aria-hidden="true" style="--tick-index:3;--tick-box-rules:1"></span>',
    )
  })

  it('no selection: no fills, ticks or same-digit marks', () => {
    const { html, cells: rendered } = render(base, null)
    expect(html).not.toContain('frame-tick')
    expect(rendered.some((c) => has(c, 'highlight') || has(c, 'same-digit'))).toBe(false)
  })

  it('stacked: a selected Mistake 7 is selected, same digit and Mistake; Mistake label', () => {
    const cell = [...givens].findIndex((ch, i) => ch === '0' && solution[i] !== '7')
    const { cells: rendered } = render(put(base, cell, '7'), cell)
    const c = rendered[cell]
    for (const k of ['selected', 'same-digit', 'mistake', 'highlight']) expect(has(c, k), k).toBe(true)
    expect(c.attrs).toMatch(/aria-label="Row \d, column \d, 7, your digit, mistake"/)
    // A Given 7 is never a Mistake, but carries the same-digit mark.
    const given7 = givens.indexOf('7')
    expect(has(rendered[given7], 'same-digit')).toBe(true)
    expect(has(rendered[given7], 'mistake')).toBe(false)
  })

  it('Mistake Assist Off: no mark and a plain label', () => {
    const cell = [...givens].findIndex((ch, i) => ch === '0' && solution[i] === '3')
    const { cells: rendered } = render(put(base, cell, '5'), null, DEFAULT_SETTINGS)
    expect(has(rendered[cell], 'mistake')).toBe(false)
    expect(rendered[cell].attrs).toMatch(/aria-label="Row \d, column \d, 5, your digit"/)
  })
})

describe('Assist mark styles (puzzle.css)', () => {
  const css = readFileSync(fileURLToPath(new URL('../../src/ui/puzzle.css', import.meta.url)), 'utf8')
  const rule = (selector: string) => {
    // The last top-level rule wins (an earlier forced-colors block also names .sudoku-cell--selected).
    const at = css.lastIndexOf(`\n${selector} {`)
    expect(at, selector).toBeGreaterThan(-1)
    return { at, body: css.slice(at, css.indexOf('}', at)) }
  }

  it('fill precedence by source order: selected > same digit > highlight; Mistake underline replaces same digit', () => {
    const highlight = rule('.sudoku-cell--highlight')
    const same = rule('.sudoku-cell--same-digit')
    const mistake = rule('.sudoku-cell--mistake')
    const selected = rule('.sudoku-cell--selected')
    expect(highlight.at).toBeLessThan(same.at)
    expect(same.at).toBeLessThan(selected.at)
    expect(same.at).toBeLessThan(mistake.at)
    expect(same.body).toContain('var(--color-fill-same-digit)')
    expect(same.body).toContain('var(--color-airmail-red)')
    expect(mistake.body).toContain('text-decoration-style: dotted')
    expect(mistake.body).toContain('var(--color-mistake)')
    expect(mistake.body).not.toContain('airmail-red')
    expect(rule('.sudoku-cell--mistake::after').body).toContain('var(--rounded-full)')
  })

  it('marks never change the cell box: no margins, padding, borders or sizes on mark classes', () => {
    for (const sel of ['.sudoku-cell--highlight', '.sudoku-cell--same-digit', '.sudoku-cell--mistake']) {
      expect(rule(sel).body, sel).not.toMatch(/(?:^|\s)(?:margin|padding|border|width|height|font-size)\b/)
    }
  })
})
