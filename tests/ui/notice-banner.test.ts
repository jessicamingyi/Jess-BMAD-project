// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BannerKind, ReadOnlyReason } from '../../src/game/types.ts'
import { NoticeBanner } from '../../src/ui/notice-banner.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(resolve(process.cwd(), 'src/ui/banner.css'), 'utf8')
const controls = readFileSync(resolve(process.cwd(), 'src/ui/controls.css'), 'utf8')

let host: HTMLDivElement
let root: Root | null = null

function render(kind: BannerKind, readOnly: ReadOnlyReason | null = null, onDismiss = vi.fn()) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(createElement(NoticeBanner, { kind, readOnly, onDismiss })))
  return onDismiss
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host.remove()
})

const banner = () => host.querySelector<HTMLElement>('.notice-banner')!

describe('NoticeBanner', () => {
  it.each([
    ['readOnly', 'otherTab', 'Traveller Sudoku is open in another tab. Play there, or close it and reload this one.', 'info'],
    ['readOnly', 'newerVersion', 'A newer version saved your progress. Reload to carry on.', 'info'],
    ['savingOff', null, "We can't save your progress in this browser right now. Anything saved before is left untouched. You can keep playing, but this session won't be kept - reload to try again.", 'info'],
    ['unreadable', null, "We couldn't read your saved progress, so we've kept a copy safe and started fresh.", 'info'],
    ['saveFailed', null, "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here.", 'alert'],
  ] as const)('%s (%s): its line, its edge, and exactly one text button "Got it"', (kind, readOnly, text, tone) => {
    render(kind, readOnly)
    expect(banner().querySelector('p')!.textContent).toBe(text)
    expect(banner().classList.contains(`notice-banner--${tone}`)).toBe(true)
    const buttons = banner().querySelectorAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent).toBe('Got it')
    expect(buttons[0].classList.contains('link-button')).toBe(true)
    // Inline and non-modal: no dialog role, no alert, no live region of its own.
    expect(banner().getAttribute('role')).toBeNull()
    expect(banner().hasAttribute('aria-live')).toBe(false)
  })

  it('"Got it" calls onDismiss', () => {
    const onDismiss = render('unreadable')
    act(() => banner().querySelector('button')!.click())
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('styles: card, 1px rule-thin border, 4px left edge in postmark or airmail-red, body ink; button at least 24x24', () => {
    expect(css).toMatch(/\.notice-banner \{[^}]*border: var\(--rule-thin\) solid var\(--color-rule-thin\);/)
    expect(css).toMatch(/\.notice-banner \{[^}]*border-left-width: var\(--size-banner-edge\);/)
    expect(css).toMatch(/\.notice-banner \{[^}]*background-color: var\(--color-card\);/)
    expect(css).toMatch(/\.notice-banner \{[^}]*color: var\(--color-ink\);/)
    expect(css).toMatch(/\.notice-banner \{[^}]*font-size: var\(--type-body-size\);/)
    expect(css).toMatch(/\.notice-banner--info \{[^}]*border-left-color: var\(--color-postmark\);/)
    expect(css).toMatch(/\.notice-banner--alert \{[^}]*border-left-color: var\(--color-airmail-red\);/)
    expect(css).not.toMatch(/position:\s*(fixed|absolute|sticky)/)
    expect(controls).toMatch(/\.link-button \{[^}]*min-width: var\(--size-min-target\);[^}]*min-height: var\(--size-min-target\);/)
  })
})
