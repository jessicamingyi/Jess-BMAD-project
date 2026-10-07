// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { createInitialState } from '../../src/game/session.ts'
import type { AppState, Puzzle } from '../../src/game/types.ts'
import { App } from '../../src/ui/app.tsx'
import type { GeneratorWorker } from '../../src/ui/use-generator.ts'
import type { GenerateReply, GenerateRequest } from '../../src/workers/generator-protocol.ts'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** Stands in for the module worker: records posts, lets the test reply or fail. */
class FakeWorker implements GeneratorWorker {
  posted: GenerateRequest[] = []
  terminated = false
  private listeners: Record<string, ((event: Event) => void)[]> = {}
  postMessage(message: GenerateRequest) {
    this.posted.push(message)
  }
  addEventListener(type: string, listener: (event: Event) => void) {
    ;(this.listeners[type] ??= []).push(listener)
  }
  terminate() {
    this.terminated = true
  }
  reply(data: GenerateReply) {
    act(() => {
      for (const l of this.listeners.message ?? []) l(new MessageEvent('message', { data }))
    })
  }
  crash(type: 'error' | 'messageerror' = 'error') {
    act(() => {
      for (const l of this.listeners[type] ?? []) l(new Event(type))
    })
  }
}

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
const MEDIUM: Puzzle = { givens, solution, difficulty: 'medium' }
const HARD: Puzzle = { givens, solution, difficulty: 'hard' }

let host: HTMLDivElement
let root: Root
let workers: FakeWorker[]

function mount(initialState?: AppState) {
  workers = []
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const createWorker = () => {
    const w = new FakeWorker()
    workers.push(w)
    return w
  }
  act(() => root.render(createElement(App, { initialState, createWorker })))
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const worker = () => workers[workers.length - 1]
const button = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('main button')].find((b) => b.textContent === name)
const navLink = (name: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('nav button')].find((b) => b.textContent === name)!
const segments = () => [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Difficulty"] button')]
const pressed = () => segments().find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent
const heading = () => host.querySelector<HTMLHeadingElement>('main h1')
const title = () => host.querySelector('header .puzzle-title')?.textContent
const gridTabStop = () => host.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')
const cell = (i: number) => host.querySelector<HTMLButtonElement>(`[data-cell="${i}"]`)!
const click = (el: HTMLElement | undefined) => act(() => el!.click())

function press(key: string, target: Element | null = document.activeElement, init: KeyboardEventInit = {}): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    target!.dispatchEvent(event)
  })
  return event.defaultPrevented
}

/** Start a Puzzle at `difficulty` from the entry and deliver `puzzle`. */
function startAndReceive(puzzle: Puzzle) {
  click(segments().find((b) => b.textContent === { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[puzzle.difficulty]))
  click(button('Start a Puzzle') ?? button('Start a new one'))
  const { requestId } = worker().posted.at(-1)!
  worker().reply({ requestId, ok: true, puzzle })
}

describe('Free Play entry: first load', () => {
  it('shows the entry: heading, picker on Easy, one start button; no Puzzle title', () => {
    mount()
    expect(heading()!.textContent).toBe('Free Play')
    expect(heading()!.tabIndex).toBe(-1)
    expect(segments().map((b) => b.textContent)).toEqual(['Easy', 'Medium', 'Hard'])
    expect(pressed()).toBe('Easy')
    const mainButtons = [...host.querySelectorAll('main button')].filter((b) => !segments().includes(b as HTMLButtonElement))
    expect(mainButtons.map((b) => b.textContent)).toEqual(['Start a Puzzle'])
    expect(host.querySelector('[role="grid"]')).toBeNull()
    expect(title()).toBeUndefined()
    expect(navLink('Free Play').getAttribute('aria-current')).toBe('page')
  })

  it('no worker is created until a Puzzle is started', () => {
    mount()
    expect(workers).toHaveLength(0)
  })

  it('digits, N and M on the entry are left to the browser', () => {
    mount()
    const start = button('Start a Puzzle')!
    act(() => start.focus())
    for (const key of ['1', '9', 'n', 'N', 'm', 'M', 'Escape']) expect(press(key, start), key).toBe(false)
    expect(pressed()).toBe('Easy')
  })
})

describe('Free Play entry: starting', () => {
  it('start posts { requestId, seed, difficulty } and shows the generating view', () => {
    mount()
    click(segments()[1])
    expect(pressed()).toBe('Medium')
    click(button('Start a Puzzle'))
    expect(workers).toHaveLength(1)
    const [req] = worker().posted
    expect(Object.keys(req).sort()).toEqual(['difficulty', 'requestId', 'seed'])
    expect(req.requestId).toBe(1)
    expect(req.difficulty).toBe('medium')
    expect(Number.isInteger(req.seed) && req.seed >= 0 && req.seed <= 0xffffffff).toBe(true)

    expect(host.querySelector('.free-play-status')!.textContent).toBe('Finding a fair Puzzle…')
    expect(segments().every((b) => b.disabled)).toBe(true)
    expect(button('Start a Puzzle')).toBeUndefined()
    expect(document.activeElement).toBe(heading())
  })

  it('the nav stays usable while generating, and a reply then waits under "Puzzle"', () => {
    mount()
    click(button('Start a Puzzle'))
    click(navLink('Settings'))
    expect(heading()!.textContent).toBe('Settings')
    worker().reply({ requestId: 1, ok: true, puzzle: MEDIUM })
    expect(heading()!.textContent).toBe('Settings')
    expect(document.activeElement).toBe(heading())
    click(navLink('Puzzle'))
    expect(title()).toBe('Free Play · Medium')
    expect(document.activeElement).toBe(gridTabStop())
  })

  it('the latest reply opens the Puzzle with focus on the grid', () => {
    mount()
    startAndReceive(MEDIUM)
    expect(host.querySelector('[role="grid"]')).not.toBeNull()
    expect(document.activeElement).toBe(gridTabStop())
    expect(navLink('Puzzle').getAttribute('aria-current')).toBe('page')
  })

  it.each([
    [MEDIUM, 'Free Play · Medium'],
    [HARD, 'Free Play · Hard'],
  ])('the header title follows the Session Difficulty (%#)', (puzzle, text) => {
    mount()
    startAndReceive(puzzle)
    expect(title()).toBe(text)
  })

  it('a stale reply is ignored', () => {
    mount()
    click(button('Start a Puzzle'))
    worker().reply({ requestId: 99, ok: true, puzzle: MEDIUM })
    expect(host.querySelector('[role="grid"]')).toBeNull()
    expect(host.querySelector('.free-play-status')).not.toBeNull()
  })

  it('failure shows the calm line, frees the picker, and keeps the Session', () => {
    mount()
    click(button('Start a Puzzle'))
    worker().reply({ requestId: 1, ok: false })
    expect(host.querySelector('.free-play-error')!.textContent).toBe(
      "Couldn't find a fair Puzzle this time. Try again when you like.",
    )
    expect(host.querySelector('.free-play-status')).toBeNull()
    expect(segments().every((b) => !b.disabled)).toBe(true)
    expect(button('Start a Puzzle')).toBeDefined()
    expect(host.querySelector('[role="alert"], dialog')).toBeNull()
  })

  it('a worker error becomes the same line for the latest request', () => {
    mount()
    click(button('Start a Puzzle'))
    worker().crash()
    expect(host.querySelector('.free-play-error')).not.toBeNull()
  })

  it.each(['error', 'messageerror'] as const)('after a worker %s, the dead worker is dropped and the next start uses a new one', (type) => {
    mount()
    click(button('Start a Puzzle'))
    const dead = worker()
    dead.crash(type)
    expect(dead.terminated).toBe(true)
    expect(host.querySelector('.free-play-error')).not.toBeNull()

    click(button('Start a Puzzle'))
    expect(workers).toHaveLength(2)
    expect(dead.posted).toHaveLength(1)
    expect(worker().posted).toEqual([expect.objectContaining({ requestId: 2 })])
    worker().reply({ requestId: 2, ok: true, puzzle: MEDIUM })
    expect(title()).toBe('Free Play · Medium')
  })

  it('a worker that cannot start becomes the same line', () => {
    workers = []
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const createWorker = () => {
      throw new Error('no workers here')
    }
    act(() => root.render(createElement(App, { createWorker })))
    click(button('Start a Puzzle'))
    expect(host.querySelector('.free-play-error')).not.toBeNull()
  })

  it('reuses one worker and terminates it on unmount', () => {
    mount()
    click(button('Start a Puzzle'))
    worker().reply({ requestId: 1, ok: false })
    click(button('Start a Puzzle'))
    expect(workers).toHaveLength(1)
    expect(worker().posted.map((r) => r.requestId)).toEqual([1, 2])
    const w = worker()
    act(() => root.unmount())
    expect(w.terminated).toBe(true)
    root = createRoot(host)
  })
})

describe('Free Play entry: in progress', () => {
  function playSome() {
    mount(createInitialState(samplePuzzle))
    const [a, b] = emptyCells
    act(() => cell(a).focus())
    press(solution[a])
    act(() => cell(b).focus())
    press('N')
    press('3')
    press('N')
  }

  it('offers "Carry on" (primary) and "Start a new one"; Carry on returns exactly as left', () => {
    playSome()
    const [a, b] = emptyCells
    click(navLink('Free Play'))
    expect(document.activeElement).toBe(heading())
    expect(button('Carry on')!.className).toContain('button--primary')
    expect(button('Start a new one')).toBeDefined()
    expect(button('Start a Puzzle')).toBeUndefined()

    click(button('Carry on'))
    expect(cell(a).textContent).toBe(solution[a])
    expect(cell(b).getAttribute('aria-label')).toMatch(/notes 3$/)
    expect(document.activeElement).toBe(cell(b))
    press('z', document.activeElement, { ctrlKey: true })
    expect(cell(b).getAttribute('aria-label')).toMatch(/empty$/)
    press('z', document.activeElement, { ctrlKey: true })
    expect(cell(a).textContent).toBe('')
  })

  it('"Start a new one" asks inline; Keep going and Esc close it with focus back on "Start a new one"', () => {
    playSome()
    click(navLink('Free Play'))
    click(button('Start a new one'))
    expect(host.textContent).toContain('This replaces your current Free Play Puzzle.')
    expect(document.activeElement).toBe(button('Keep going'))
    expect(button('Keep going')!.className).toContain('button--primary')

    expect(press('Escape')).toBe(true)
    expect(host.textContent).not.toContain('This replaces')
    expect(document.activeElement).toBe(button('Start a new one'))

    click(button('Start a new one'))
    click(button('Keep going'))
    expect(host.textContent).not.toContain('This replaces')
    expect(document.activeElement).toBe(button('Start a new one'))
    expect(workers).toHaveLength(0)

    click(button('Carry on'))
    expect(cell(emptyCells[0]).textContent).toBe(solution[emptyCells[0]])
  })

  it('confirming "Start a new one" requests a Puzzle and the reply replaces the Session', () => {
    playSome()
    click(navLink('Free Play'))
    click(segments()[2])
    click(button('Start a new one'))
    click(button('Start a new one'))
    expect(worker().posted[0]).toMatchObject({ requestId: 1, difficulty: 'hard' })
    worker().reply({ requestId: 1, ok: true, puzzle: HARD })
    expect(title()).toBe('Free Play · Hard')
    expect(cell(emptyCells[0]).textContent).toBe('')
    expect(document.activeElement).toBe(gridTabStop())
  })

  it('opens with the last Free Play Difficulty pressed', () => {
    const base = createInitialState(samplePuzzle)
    mount({ ...base, settings: { ...base.settings, freePlayDifficulty: 'hard' } })
    click(navLink('Free Play'))
    expect(pressed()).toBe('Hard')
  })
})

describe('Free Play: solved', () => {
  it('shows "Solved. Another one?" with a link to the entry', () => {
    mount(createInitialState(samplePuzzle))
    for (const c of emptyCells) {
      act(() => cell(c).focus())
      press(solution[c])
    }
    const line = host.querySelector('.side-column .puzzle-status')!
    expect(line.textContent).toContain('Solved. Another one?')
    const link = line.querySelector<HTMLButtonElement>('button.link-button')!
    expect(link.type).toBe('button')
    click(link)
    expect(heading()!.textContent).toBe('Free Play')
    expect(document.activeElement).toBe(heading())
    // Nothing to replace once solved: a plain start.
    expect(button('Start a Puzzle')).toBeDefined()
    expect(button('Carry on')).toBeUndefined()
  }, 20_000)
})

describe('sample Puzzle stays a test fixture', () => {
  it('no src/ui file imports content/sample-puzzle', () => {
    const dir = resolve(process.cwd(), 'src/ui')
    const offenders = readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => /sample-puzzle/.test(readFileSync(join(dir, f), 'utf8')))
    expect(offenders).toEqual([])
  })
})
