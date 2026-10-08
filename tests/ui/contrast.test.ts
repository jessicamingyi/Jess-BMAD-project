import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * WCAG AA contrast over the DESIGN measured pairs (DESIGN › Colors), in both
 * themes, with hexes parsed from theme.css. Text ≥ 4.5:1, non-text marks ≥ 3:1.
 */

const theme = readFileSync(fileURLToPath(new URL('../../src/ui/theme.css', import.meta.url)), 'utf8')

const ROLES = [
  'desk',
  'card',
  'ink',
  'ink-muted',
  'given',
  'player-ink',
  'note',
  'rule-thin',
  'rule-box',
  'fill-selected',
  'fill-highlight',
  'fill-same-digit',
  'mistake',
  'airmail-red',
  'postmark',
  'focus',
] as const

type Role = (typeof ROLES)[number]
type ThemeName = 'Daylight' | 'Lamplight'
type Pair = { fg: Role; bg: Role; min: number; what: string }

const TEXT = 4.5
const NON_TEXT = 3

/** DESIGN › Colors › Measured contrast. */
const PAIRS: readonly Pair[] = [
  { fg: 'ink', bg: 'desk', min: TEXT, what: 'text' },
  /** Also the locked slot's line on its transparent (desk) slot. */
  { fg: 'ink-muted', bg: 'desk', min: TEXT, what: 'text' },
  { fg: 'player-ink', bg: 'fill-selected', min: TEXT, what: 'text' },
  { fg: 'note', bg: 'fill-highlight', min: TEXT, what: 'text' },
  { fg: 'note', bg: 'fill-selected', min: TEXT, what: 'text' },
  { fg: 'mistake', bg: 'card', min: TEXT, what: 'text' },
  /** Also a slot's "Travel here" / "Carry on" on the card slot, and a Collected slot's "Carry on" over its card. */
  { fg: 'airmail-red', bg: 'card', min: TEXT, what: 'text' },
  { fg: 'rule-thin', bg: 'fill-selected', min: NON_TEXT, what: 'non-text' },
  { fg: 'rule-thin', bg: 'fill-same-digit', min: NON_TEXT, what: 'non-text' },
  { fg: 'airmail-red', bg: 'fill-highlight', min: NON_TEXT, what: 'non-text' },
  { fg: 'rule-box', bg: 'fill-same-digit', min: NON_TEXT, what: 'non-text' },
  { fg: 'airmail-red', bg: 'fill-selected', min: NON_TEXT, what: 'non-text' },
  { fg: 'focus', bg: 'fill-selected', min: NON_TEXT, what: 'non-text' },
  /** An aria-disabled primary button (Hint when solved): card text on an ink-muted fill. */
  { fg: 'card', bg: 'ink-muted', min: TEXT, what: 'text' },
  /** Album slots: City name and caption on a card slot; the Postcard viewer's card button row ("Close", the confirm text and buttons). */
  { fg: 'ink', bg: 'card', min: TEXT, what: 'text' },
  { fg: 'ink-muted', bg: 'card', min: TEXT, what: 'text' },
  /** Stamp: country, glyph and Tier in card ink on the airmail-red face. */
  { fg: 'card', bg: 'airmail-red', min: TEXT, what: 'text' },
  /** A locked slot's dashed border on the desk (no fill). */
  { fg: 'rule-thin', bg: 'desk', min: NON_TEXT, what: 'non-text' },
  /** The Postcard's divider and ruled address lines, and a Collected slot's border, on card. */
  { fg: 'rule-thin', bg: 'card', min: NON_TEXT, what: 'non-text' },
  /** The "just arrived" 2px outline, drawn just outside the slot on the desk. */
  { fg: 'airmail-red', bg: 'desk', min: NON_TEXT, what: 'non-text' },
  /** The Postcard viewer's card button row: "Play again" (card on an ink fill), the confirm's button rules and the focus ring. */
  { fg: 'card', bg: 'ink', min: TEXT, what: 'text' },
  { fg: 'rule-box', bg: 'card', min: NON_TEXT, what: 'non-text' },
  { fg: 'focus', bg: 'card', min: NON_TEXT, what: 'non-text' },
]

/** `--color-<name>: #RRGGBB;` from theme.css, or undefined. */
function hex(name: string): string | undefined {
  return theme.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`))?.[1]
}

function palette(t: ThemeName): Partial<Record<Role, string>> {
  return Object.fromEntries(ROLES.map((r) => [r, hex(t === 'Daylight' ? r : `${r}-lamplight`)]))
}

function luminance(h: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Failure messages naming the pair and theme; empty when every pair passes. */
function contrastFailures(colours: Partial<Record<Role, string>>, t: ThemeName, pairs: readonly Pair[]): string[] {
  return pairs.flatMap(({ fg, bg, min, what }) => {
    const a = colours[fg]
    const b = colours[bg]
    if (!a || !b) return [`${t}: ${fg} on ${bg} is missing a colour`]
    const ratio = contrastRatio(a, b)
    return ratio >= min ? [] : [`${t}: ${fg} on ${bg} (${what}) is ${ratio.toFixed(2)}:1, below ${min}:1`]
  })
}

describe('theme contrast (WCAG AA)', () => {
  it('checks the "just arrived" caption (airmail-red text on card) in both themes', () => {
    expect(PAIRS).toContainEqual({ fg: 'airmail-red', bg: 'card', min: TEXT, what: 'text' })
    for (const t of ['Daylight', 'Lamplight'] as const) {
      const p = palette(t)
      expect(p['airmail-red'], t).toBeDefined()
      expect(contrastRatio(p['airmail-red']!, p.card!), t).toBeGreaterThanOrEqual(TEXT)
    }
  })

  it.each(['Daylight', 'Lamplight'] as const)('%s: every DESIGN measured pair meets its threshold', (t) => {
    expect(contrastFailures(palette(t), t, PAIRS)).toEqual([])
  })

  it('every Daylight role has a Lamplight twin', () => {
    const missing = ROLES.filter((r) => !hex(r) || !hex(`${r}-lamplight`))
    expect(missing).toEqual([])
  })

  it("Lamplight maps every role to its twin under :root[data-theme='lamplight']", () => {
    const block = theme.match(/:root\[data-theme='lamplight'\]\s*\{([^}]*)\}/)?.[1] ?? ''
    for (const r of ROLES) {
      expect(block, r).toMatch(new RegExp(`--color-${r}:\\s*var\\(--color-${r}-lamplight\\)\\s*;`))
    }
    expect(block).toMatch(/--shadow-grid-frame:[^;]*black 18%/)
  })

  it('reports a synthetic below-threshold pair, naming the pair and theme', () => {
    const failures = contrastFailures({ ink: '#777777', desk: '#888888' }, 'Lamplight', [
      { fg: 'ink', bg: 'desk', min: TEXT, what: 'text' },
    ])
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatch(/^Lamplight: ink on desk \(text\) is 1\.\d\d:1, below 4\.5:1$/)
    expect(contrastFailures({ ink: '#000000' }, 'Daylight', [{ fg: 'ink', bg: 'desk', min: TEXT, what: 'text' }])).toEqual([
      'Daylight: ink on desk is missing a colour',
    ])
  })

  it('matches the WCAG reference points', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })
})
