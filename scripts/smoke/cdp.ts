/**
 * Minimal Chrome DevTools Protocol client for the smoke suite (TS-45). Node built-ins
 * only (global `WebSocket` and `fetch`): launches a local Chrome or Edge headless,
 * talks to it over one browser WebSocket with flat sessions, and gives each journey a
 * fresh browser context (its own storage, caches and service workers).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

type CdpMessage = { id?: number; method?: string; params?: any; result?: any; error?: { message: string }; sessionId?: string }
type Listener = (method: string, params: any) => void

/** Standard install locations, Chrome first, then Edge. `CHROME_PATH` wins when set. */
function candidates(): string[] {
  const env = process.env
  if (process.platform === 'win32') {
    const roots = [env['PROGRAMFILES'], env['PROGRAMFILES(X86)'], env['LOCALAPPDATA']].filter((r): r is string => !!r)
    return [
      ...roots.map((r) => join(r, 'Google', 'Chrome', 'Application', 'chrome.exe')),
      ...roots.map((r) => join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
    ]
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ]
  }
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
  ]
}

export function findChrome(): string {
  const override = process.env['CHROME_PATH']
  if (override) {
    if (!existsSync(override)) throw new Error(`CHROME_PATH does not exist: ${override}`)
    return override
  }
  const found = candidates().find((p) => existsSync(p))
  if (!found) throw new Error('No Chrome or Edge found. Install one, or set CHROME_PATH to its executable.')
  return found
}

export class Browser {
  private nextId = 0
  private readonly pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private readonly listeners = new Map<string, Set<Listener>>()
  private readonly ws: WebSocket
  private readonly proc: ChildProcess
  private readonly profile: string

  private constructor(ws: WebSocket, proc: ChildProcess, profile: string) {
    this.ws = ws
    this.proc = proc
    this.profile = profile
    ws.onmessage = (ev) => this.onMessage(JSON.parse(String(ev.data)) as CdpMessage)
  }

  static async launch(): Promise<Browser> {
    const exe = findChrome()
    // A short path: Cache Storage fails past Windows' 260-character path limit.
    const profile = mkdtempSync(join(tmpdir(), 'ts-'))
    const proc = spawn(
      exe,
      [
        '--headless=new',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-sync',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--window-size=1280,900',
        'about:blank',
      ],
      { stdio: 'ignore' },
    )
    try {
      const portFile = join(profile, 'DevToolsActivePort')
      const end = Date.now() + 20_000
      while (!existsSync(portFile) || readFileSync(portFile, 'utf8').split('\n').length < 2) {
        if (Date.now() > end) throw new Error(`Chrome did not start (${exe})`)
        if (proc.exitCode !== null) throw new Error(`Chrome exited with code ${proc.exitCode} (${exe})`)
        await sleep(100)
      }
      const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n')
      const ws = new WebSocket(`ws://127.0.0.1:${port.trim()}${path.trim()}`)
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error('Could not connect to Chrome DevTools'))
      })
      const browser = new Browser(ws, proc, profile)
      const version = await browser.send('Browser.getVersion')
      console.log(`Browser: ${version.product} (${exe})`)
      return browser
    } catch (e) {
      killTree(proc)
      removeDir(profile)
      throw e
    }
  }

  private onMessage(m: CdpMessage): void {
    if (m.id !== undefined && this.pending.has(m.id)) {
      const p = this.pending.get(m.id)!
      this.pending.delete(m.id)
      if (m.error) p.reject(new Error(m.error.message))
      else p.resolve(m.result)
      return
    }
    if (m.method) {
      for (const l of this.listeners.get(m.sessionId ?? '') ?? []) l(m.method, m.params)
    }
  }

  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }

  on(sessionId: string, listener: Listener): () => void {
    let set = this.listeners.get(sessionId)
    if (!set) this.listeners.set(sessionId, (set = new Set()))
    set.add(listener)
    return () => set.delete(listener)
  }

  /** A fresh, isolated browser context: no storage, caches or service workers from other journeys. */
  async newContext(): Promise<Context> {
    const { browserContextId } = await this.send('Target.createBrowserContext', { disposeOnDetach: true })
    return new Context(this, browserContextId)
  }

  async close(): Promise<void> {
    try {
      await Promise.race([this.send('Browser.close'), sleep(3000)])
    } catch {
      // Already gone.
    }
    try {
      this.ws.close()
    } catch {
      // Already closed.
    }
    const exited = await Promise.race([
      new Promise<boolean>((r) => (this.proc.exitCode !== null ? r(true) : this.proc.once('exit', () => r(true)))),
      sleep(5000).then(() => false),
    ])
    if (!exited) killTree(this.proc)
    removeDir(this.profile)
  }
}

export function killTree(proc: ChildProcess): void {
  if (proc.exitCode !== null || proc.pid === undefined) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
  else proc.kill('SIGKILL')
}

/** Remove a directory, retrying while Chrome still holds files open. */
export function removeDir(dir: string): void {
  for (let i = 0; i < 20; i++) {
    try {
      rmSync(dir, { recursive: true, force: true })
      return
    } catch {
      spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},250)'])
    }
  }
  console.warn(`Could not remove ${dir}`)
}

export class Context {
  readonly pages: Page[] = []
  /** Console errors and uncaught exceptions from every page in this context. */
  readonly errors: string[] = []
  private readonly browser: Browser
  private readonly id: string

  constructor(browser: Browser, id: string) {
    this.browser = browser
    this.id = id
  }

  async newPage(): Promise<Page> {
    const { targetId } = await this.browser.send('Target.createTarget', { url: 'about:blank', browserContextId: this.id })
    const { sessionId } = await this.browser.send('Target.attachToTarget', { targetId, flatten: true })
    const page = new Page(this.browser, sessionId, targetId, this.errors)
    await page.init()
    this.pages.push(page)
    return page
  }

  async dispose(): Promise<void> {
    await this.browser.send('Target.disposeBrowserContext', { browserContextId: this.id }).catch(() => {})
  }
}

/** A JS expression for the first element matching `sel` whose text starts with `text`. */
export const byText = (sel: string, text: string): string =>
  `[...document.querySelectorAll(${JSON.stringify(sel)})].find(e=>e.innerText.trim().startsWith(${JSON.stringify(text)}))`

export class Page {
  private readonly browser: Browser
  readonly sessionId: string
  readonly targetId: string
  private readonly errors: string[]
  closed = false

  constructor(browser: Browser, sessionId: string, targetId: string, errors: string[]) {
    this.browser = browser
    this.sessionId = sessionId
    this.targetId = targetId
    this.errors = errors
  }

  async init(): Promise<void> {
    this.on((method, p) => {
      if (method === 'Runtime.consoleAPICalled' && p.type === 'error') {
        this.errors.push(`[console.error] ${p.args.map((a: any) => a.value ?? a.description).join(' ')}`)
      } else if (method === 'Runtime.exceptionThrown') {
        const d = p.exceptionDetails
        this.errors.push(`[exception] ${d.exception?.description ?? d.text}`)
      } else if (method === 'Log.entryAdded' && p.entry.level === 'error' && !String(p.entry.url ?? '').endsWith('/favicon.ico')) {
        // (The browser's own /favicon.ico probe on non-HTML pages is not the app's; the app links favicon.svg.)
        this.errors.push(`[log.error] ${p.entry.text} ${p.entry.url ?? ''}`.trim())
      }
    })
    for (const domain of ['Runtime', 'Log', 'Page', 'Network']) await this.send(`${domain}.enable`)
    await this.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  }

  send(method: string, params: object = {}): Promise<any> {
    return this.browser.send(method, params, this.sessionId)
  }

  on(listener: Listener): () => void {
    return this.browser.on(this.sessionId, listener)
  }

  /** Evaluate in the page (promises awaited, value returned by value); throws on a page exception. */
  async eval<T = any>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value as T
  }

  private waitLoad(timeout = 15_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off()
        reject(new Error('page load timed out'))
      }, timeout)
      const off = this.on((method) => {
        if (method !== 'Page.loadEventFired') return
        clearTimeout(timer)
        off()
        resolve()
      })
    })
  }

  async goto(url: string): Promise<void> {
    const loaded = this.waitLoad()
    const r = await this.send('Page.navigate', { url })
    if (r.errorText) {
      loaded.catch(() => {})
      throw new Error(`navigation to ${url} failed: ${r.errorText}`)
    }
    await loaded
  }

  async reload(): Promise<void> {
    const loaded = this.waitLoad()
    await this.send('Page.reload', {})
    await loaded
  }

  /** Poll until `expression` is truthy; throws `message` on timeout. */
  async waitFor<T = any>(expression: string, message: string, timeout = 8000): Promise<T> {
    const end = Date.now() + timeout
    let last: unknown
    while (Date.now() < end) {
      try {
        // Elements can't be returned by value: a found element counts as `true`.
        const v = await this.eval<T>(`Promise.resolve(${expression}).then(v=>v instanceof Node?true:v)`)
        if (v) return v
      } catch (e) {
        last = e
      }
      await sleep(100)
    }
    throw new Error(`Timed out waiting: ${message}${last instanceof Error ? ` (${last.message.split('\n')[0]})` : ''}`)
  }

  text(): Promise<string> {
    return this.eval<string>('document.body.innerText')
  }

  async hasText(text: string): Promise<boolean> {
    return this.eval<boolean>(`document.body.innerText.includes(${JSON.stringify(text)})`)
  }

  async click(expression: string, settle = 120): Promise<void> {
    const p = await this.eval<{ x: number; y: number } | null>(
      `(()=>{const e=${expression}; if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`,
    )
    if (!p) throw new Error(`No element to click: ${expression}`)
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
    }
    if (settle) await sleep(settle)
  }

  /** Press a key. `text` makes it a character key (typed); `modifiers`: 2 Ctrl, 4 Meta. */
  async key(key: string, code: string, opts: { text?: string; modifiers?: number; vk?: number } = {}): Promise<void> {
    const { text, modifiers = 0, vk } = opts
    await this.send('Input.dispatchKeyEvent', {
      type: text ? 'keyDown' : 'rawKeyDown',
      key,
      code,
      text,
      modifiers,
      windowsVirtualKeyCode: vk ?? (text ? text.toUpperCase().charCodeAt(0) : undefined),
    })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk })
    await sleep(60)
  }

  /** Type one digit or letter. */
  type(ch: string): Promise<void> {
    return this.key(ch, /\d/.test(ch) ? `Digit${ch}` : `Key${ch.toUpperCase()}`, { text: ch })
  }

  /** Undo: Cmd+Z on macOS, Ctrl+Z elsewhere. */
  undo(): Promise<void> {
    return this.key('z', 'KeyZ', { modifiers: process.platform === 'darwin' ? 4 : 2, vk: 90 })
  }

  async screenshot(file: string): Promise<void> {
    const r = await this.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(file, Buffer.from(r.data, 'base64'))
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.browser.send('Target.closeTarget', { targetId: this.targetId }).catch(() => {})
  }
}
