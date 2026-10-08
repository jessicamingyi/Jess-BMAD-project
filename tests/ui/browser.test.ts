import { describe, expect, it } from 'vitest'
import { isSafari } from '../../src/ui/browser.ts'

const UA = {
  macSafari17: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  macSafari18: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari16: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  macEdge: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:131.0) Gecko/20100101 Firefox/131.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  iosFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  macGoogleApp:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/300.0.0 Version/17.4 Safari/605.1.15',
  macDuckDuckGo:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 Ddg/17.4',
  operaTouch:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 OPT/4.0',
  chromium: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/129.0.0.0 Chrome/129.0.0.0 Safari/537.36',
  jsdom: 'Mozilla/5.0 (win32) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/26.0.0',
}

/** A desktop browser tab: no touch, not installed. */
const tab = (userAgent: string) => ({ userAgent, maxTouchPoints: 0, standalone: false })

describe('isSafari (desktop macOS Safari 17+, not standalone)', () => {
  it.each(['macSafari17', 'macSafari18'] as const)('%s is Safari', (name) => {
    expect(isSafari(tab(UA[name]))).toBe(true)
  })

  it.each([
    'macSafari16',
    'iosSafari',
    'ipadSafari',
    'chrome',
    'macChrome',
    'edge',
    'macEdge',
    'firefox',
    'androidChrome',
    'iosChrome',
    'iosFirefox',
    'macGoogleApp',
    'macDuckDuckGo',
    'operaTouch',
    'chromium',
    'jsdom',
  ] as const)('%s is not', (name) => {
    expect(isSafari(tab(UA[name]))).toBe(false)
  })

  it('iPadOS posing as a Mac (touch points) is not', () => {
    expect(isSafari({ userAgent: UA.macSafari17, maxTouchPoints: 5, standalone: false })).toBe(false)
  })

  it('Safari already running as an installed web app is not', () => {
    expect(isSafari({ userAgent: UA.macSafari17, maxTouchPoints: 0, standalone: true })).toBe(false)
  })

  it('an empty user agent is not', () => {
    expect(isSafari(tab(''))).toBe(false)
  })
})
