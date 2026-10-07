import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ActionRow } from '../../src/ui/action-row.tsx'
import { isMacPlatform, keyCaption } from '../../src/ui/key-caption.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState } from '../../src/game/session.ts'
import { PuzzleScreen } from '../../src/ui/puzzle-screen.tsx'

const noop = () => {}

/** Parse buttons (inner markup allowed) into { classes, attrs, inner }. */
function buttons(html: string) {
  return [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(([, attrs, inner]) => ({
    classes: (attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(' '),
    attrs,
    inner,
  }))
}

const render = (confirming: boolean, undoCaption = 'Ctrl+Z') =>
  renderToStaticMarkup(
    createElement(ActionRow, {
      confirming,
      undoCaption,
      onUndo: noop,
      onRestart: noop,
      onCancel: noop,
      onConfirm: noop,
    }),
  )

describe('ActionRow', () => {
  it('default: Undo with its key caption and Restart without one, both default buttons', () => {
    const html = render(false)
    const [undo, restart, ...rest] = buttons(html)
    expect(rest).toHaveLength(0)
    expect(undo.inner).toContain('<span class="button-label">Undo</span>')
    expect(undo.inner).toContain('<span class="button-caption" aria-hidden="true">Ctrl+Z</span>')
    expect(restart.inner).toBe('<span class="button-label">Restart</span>')
    for (const b of [undo, restart]) {
      expect(b.attrs).toContain('type="button"')
      expect(b.classes).toEqual(['button'])
    }
    expect(html).not.toContain('Keep going')
  })

  it('shows the Mac caption when given one', () => {
    expect(render(false, '⌘Z')).toContain('<span class="button-caption" aria-hidden="true">⌘Z</span>')
  })

  it('confirm: inline text, a default Restart and a primary Keep going', () => {
    const html = render(true)
    expect(html).toContain('class="action-row action-row--confirm"')
    expect(html).toContain('role="group" aria-label="Restart the Puzzle?"')
    const question = html.match(/<p class="action-row-text" id="([^"]+)">([^<]*)<\/p>/)
    expect(question?.[2]).toBe('Clear your digits and Notes? The Givens stay.')
    const [restart, keepGoing, ...rest] = buttons(html)
    expect(rest).toHaveLength(0)
    for (const b of [restart, keepGoing]) expect(b.attrs).toContain(`aria-describedby="${question?.[1]}"`)
    expect(restart.inner).toContain('Restart')
    expect(restart.classes).toEqual(['button'])
    expect(keepGoing.inner).toContain('Keep going')
    expect(keepGoing.classes).toEqual(['button', 'button--primary'])
    expect(html).not.toContain('Undo')
  })
})

describe('keyCaption', () => {
  it('returns the command-key caption on macOS platform strings', () => {
    expect(keyCaption('MacIntel')).toBe('⌘Z')
    expect(keyCaption('Macintosh')).toBe('⌘Z')
  })

  it('returns Ctrl+Z elsewhere', () => {
    for (const p of ['Win32', 'Linux x86_64', 'iPhone', '']) expect(keyCaption(p), p).toBe('Ctrl+Z')
  })
})

describe('isMacPlatform', () => {
  it('is true exactly where the caption is ⌘Z, so Cmd+Z and the caption agree', () => {
    for (const p of ['MacIntel', 'Macintosh']) expect(isMacPlatform(p), p).toBe(true)
    for (const p of ['Win32', 'Linux x86_64', 'iPhone', '']) expect(isMacPlatform(p), p).toBe(false)
    for (const p of ['MacIntel', 'Macintosh', 'Win32', 'Linux x86_64', 'iPhone', '']) {
      expect(keyCaption(p) === '⌘Z', p).toBe(isMacPlatform(p))
    }
  })
})

describe('PuzzleScreen action row', () => {
  it('renders the action row after the digit pad in the side column', () => {
    const html = renderToStaticMarkup(createElement(PuzzleScreen, { state: createInitialState(samplePuzzle), dispatch: () => {} }))
    const side = html.indexOf('class="side-column"')
    const pad = html.indexOf('class="digit-pad"')
    const row = html.indexOf('class="action-row"')
    expect(pad).toBeGreaterThan(side)
    expect(row).toBeGreaterThan(pad)
    expect(html).toContain('<span class="button-label">Undo</span>')
  })
})
