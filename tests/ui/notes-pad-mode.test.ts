import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { remainingByDigit } from '../../src/game/digit-counts.ts'
import { createSession } from '../../src/game/session.ts'
import type { Session } from '../../src/game/types.ts'
import { DigitPad } from '../../src/ui/digit-pad.tsx'
import { ModeIndicator } from '../../src/ui/mode-indicator.tsx'
import { statusText } from '../../src/ui/status-text.ts'
import { SudokuGrid } from '../../src/ui/sudoku-grid.tsx'

/** Parse top-level buttons (inner markup allowed) into { classes, attrs, inner }. */
function buttons(html: string) {
  return [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(([, attrs, inner]) => ({
    classes: (attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(' '),
    attrs,
    inner,
  }))
}

const noop = () => {}
const base = createSession('free', samplePuzzle)
const firstEmpty = base.givens.indexOf('0')

describe('SudokuGrid Notes', () => {
  const mask = (1 << 2) | (1 << 6) // Notes 3 and 7
  const notes = base.notes.slice()
  notes[firstEmpty] = mask

  it('draws a 3×3 mini-grid with Note n in slot n and blank slots kept', () => {
    const session: Session = { ...base, notes }
    const cell = buttons(renderToStaticMarkup(createElement(SudokuGrid, { session, selectedCell: null, onClick: noop })))[
      firstEmpty
    ]
    expect(cell.classes).toContain('sudoku-cell--notes')
    expect(cell.inner).toContain('class="cell-note"')
    const slots = [...cell.inner.matchAll(/<span class="note">([^<]*)<\/span>/g)].map((m) => m[1])
    expect(slots).toEqual(['', '', '3', '', '', '', '7', '', ''])
    expect(slots[6]).toBe('7')
    const row = Math.floor(firstEmpty / 9) + 1
    const col = (firstEmpty % 9) + 1
    expect(cell.attrs).toContain(`aria-label="Row ${row}, column ${col}, notes 3, 7"`)
  })

  it('hides Notes under a placed digit', () => {
    const digits = base.digits.slice(0, firstEmpty) + '5' + base.digits.slice(firstEmpty + 1)
    const session: Session = { ...base, notes, digits }
    const cell = buttons(renderToStaticMarkup(createElement(SudokuGrid, { session, selectedCell: null, onClick: noop })))[
      firstEmpty
    ]
    expect(cell.classes).toContain('sudoku-cell--player')
    expect(cell.inner).toBe('5')
  })
})

describe('DigitPad', () => {
  const render = (props: Partial<Parameters<typeof DigitPad>[0]> = {}) =>
    buttons(
      renderToStaticMarkup(
        createElement(DigitPad, {
          remaining: remainingByDigit(base.digits),
          currentDigit: null,
          numberFirst: false,
          onDigit: noop,
          ...props,
        }),
      ),
    )

  it('renders 9 keys with digit and "N left" caption', () => {
    const remaining = remainingByDigit(base.digits)
    const keys = render()
    expect(keys).toHaveLength(9)
    keys.forEach((k, i) => {
      const d = i + 1
      expect(k.attrs).toContain('type="button"')
      expect(k.inner).toContain(`<span class="digit-pad-digit">${d}</span>`)
      expect(k.inner).toContain(`<span class="digit-pad-count">${remaining[d]} left</span>`)
      expect(k.attrs).toContain(`aria-label="${d}, ${remaining[d]} left"`)
      expect(k.attrs).not.toContain('aria-pressed')
    })
  })

  it('marks a finished digit Done, struck through, still clickable', () => {
    const remaining = [0, 3, 3, 3, 3, 3, 3, 0, 3, 3]
    const seven = render({ remaining })[6]
    expect(seven.classes).toContain('digit-pad-key--done')
    expect(seven.inner).toContain('<span class="digit-pad-count">Done</span>')
    expect(seven.attrs).toContain('aria-label="7, all placed"')
    expect(seven.attrs).not.toContain('disabled')
  })

  it('marks the current digit in number-first with aria-pressed', () => {
    const keys = render({ currentDigit: 7, numberFirst: true })
    const pressed = keys.flatMap((k, i) => (k.attrs.includes('aria-pressed="true"') ? [i + 1] : []))
    const current = keys.flatMap((k, i) => (k.classes.includes('digit-pad-key--current') ? [i + 1] : []))
    expect(pressed).toEqual([7])
    expect(current).toEqual([7])
    expect(keys.filter((k) => k.attrs.includes('aria-pressed="false"'))).toHaveLength(8)
  })

  it('shows no current mark in cell-first', () => {
    const keys = render({ currentDigit: 7, numberFirst: false })
    expect(keys.some((k) => k.classes.includes('digit-pad-key--current'))).toBe(false)
  })
})

describe('ModeIndicator', () => {
  it('renders both segmented controls with aria-pressed on the active segment', () => {
    const html = renderToStaticMarkup(
      createElement(ModeIndicator, {
        entryMode: 'notes',
        inputMode: 'cellFirst',
        currentDigit: null,
        selectedCell: 3 * 9 + 5,
        onEntryMode: noop,
        onInputMode: noop,
      }),
    )
    const segs = buttons(html)
    expect(segs.map((s) => s.inner)).toEqual(['Digit', 'Notes', 'Cell first', 'Number first'])
    expect(segs.map((s) => s.attrs.includes('aria-pressed="true"'))).toEqual([false, true, true, false])
    expect(segs[1].classes).toContain('segment--active')
    expect(html).toContain('(N)')
    expect(html).toContain('<p class="mode-status">cell-first · Notes · row 4, column 6</p>')
  })

  it('status line text in both input modes', () => {
    expect(statusText('digit', 'cellFirst', null, null)).toBe('cell-first · Digit · choose a cell')
    expect(statusText('notes', 'cellFirst', 7, 3 * 9 + 5)).toBe('cell-first · Notes · row 4, column 6')
    expect(statusText('digit', 'numberFirst', 7, 0)).toBe('number-first · Digit · 7')
    expect(statusText('notes', 'numberFirst', null, 0)).toBe('number-first · Notes · choose a digit')
  })
})
