// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copy } from '../../src/content/copy.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState } from '../../src/game/session.ts'
import { App } from '../../src/ui/app.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// jsdom gives import.meta.url a non-file scheme, so resolve from the project root (vitest's cwd).
const css = readFileSync(resolve(process.cwd(), 'src/ui/puzzle.css'), 'utf8')

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(createElement(App, { initialState: createInitialState(samplePuzzle) })))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const navLink = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!

describe('copy.freePlayTitle', () => {
  it.each([
    ['easy', 'Free Play · Easy'],
    ['medium', 'Free Play · Medium'],
    ['hard', 'Free Play · Hard'],
  ] as const)('%s → %s', (d, text) => {
    expect(copy.freePlayTitle(d)).toBe(text)
  })
})

describe('Puzzle header title', () => {
  it('shows "Free Play · Easy" as an h1 in the app header', () => {
    const title = host.querySelector('header.app-header h1.puzzle-title')
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Free Play · Easy')
  })

  it('has no Stamp', () => {
    expect(host.querySelector('header [class*="stamp" i]')).toBeNull()
    expect(host.querySelector('header img, header svg')).toBeNull()
  })

  it('uses city-title type tokens only', () => {
    const rule = /\.puzzle-title\s*\{([^}]*)\}/.exec(css)![1]
    expect(rule).toContain('font-size: var(--type-city-title-size)')
    expect(rule).toContain('line-height: var(--type-city-title-line-height)')
    expect(rule).toContain('color: var(--color-ink)')
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('belongs to the Puzzle screen: hidden on Settings, back on Puzzle', () => {
    act(() => navLink('Settings').click())
    expect(host.querySelector('.puzzle-title')).toBeNull()
    act(() => navLink('Puzzle').click())
    expect(host.querySelector('.puzzle-title')!.textContent).toBe('Free Play · Easy')
  })
})
