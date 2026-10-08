/**
 * Other browsers and WebKit wrappers that also say "Safari" in their user agent
 * (Chrome, Chromium, Edge, Firefox, Opera, Opera Touch, the Google app, DuckDuckGo, Android).
 */
const NOT_SAFARI = /Chrome|Chromium|CriOS|Edg|EdgiOS|FxiOS|Firefox|OPR|OPiOS|OPT\/|GSA\/|Ddg\/|Android/

/** What the Safari check reads; every field is injectable for tests. */
export type BrowserFacts = {
  readonly userAgent: string
  /** 0 on a Mac; iPadOS posing as a Mac reports touch points. */
  readonly maxTouchPoints: number
  /** Already running as an installed web app (Dock or Home Screen). */
  readonly standalone: boolean
}

function currentFacts(): BrowserFacts {
  if (typeof navigator === 'undefined') return { userAgent: '', maxTouchPoints: 0, standalone: false }
  const standaloneQuery = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0, standalone: standaloneQuery || iosStandalone }
}

/**
 * Desktop macOS Safari 17 or later, not already running as a web app: the browser
 * that usually refuses persistent storage and offers File › Add to Dock (the
 * Add to Dock tip names that menu). Pure over `facts`.
 */
export function isSafari(facts: BrowserFacts = currentFacts()): boolean {
  const { userAgent, maxTouchPoints, standalone } = facts
  if (standalone || maxTouchPoints > 0) return false
  if (!/Macintosh/.test(userAgent) || !/Safari\//.test(userAgent) || NOT_SAFARI.test(userAgent)) return false
  const version = /Version\/(\d+)/.exec(userAgent)
  return version !== null && Number(version[1]) >= 17
}
