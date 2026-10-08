import { Fragment } from 'react'
import { copy } from '../content/copy.ts'
import type { Screen } from '../game/types.ts'

type Props = {
  current: Screen
  /** False without a current Puzzle: "Puzzle" stays in place but is disabled. */
  puzzleAvailable: boolean
  onChoose: (screen: Screen) => void
}

const ITEMS = [
  { screen: 'puzzle', label: copy.navPuzzle },
  { screen: 'album', label: copy.navAlbum },
  { screen: 'freePlay', label: copy.navFreePlay },
  { screen: 'settings', label: copy.navSettings },
] as const satisfies readonly { screen: Screen; label: string }[]

/**
 * Header nav "Puzzle · Album · Free Play · Settings" (UX-DR14). Screens switch by state,
 * no router, so the links are buttons; the current one carries aria-current="page".
 * Without a current Puzzle, "Puzzle" is aria-disabled (still focusable, ink-muted)
 * so the nav keeps its shape. No key shortcuts here.
 */
export function AppNav({ current, puzzleAvailable, onChoose }: Props) {
  return (
    <nav className="app-nav" aria-label={copy.navLabel}>
      <ul className="app-nav-list">
        {ITEMS.map((item, i) => {
          const disabled = item.screen === 'puzzle' && !puzzleAvailable
          return (
            <Fragment key={item.screen}>
              {i > 0 && (
                <li className="app-nav-separator" aria-hidden="true">
                  ·
                </li>
              )}
              <li>
                <button
                  type="button"
                  className="nav-link"
                  aria-current={item.screen === current ? 'page' : undefined}
                  aria-disabled={disabled ? 'true' : undefined}
                  onClick={() => {
                    if (!disabled) onChoose(item.screen)
                  }}
                >
                  {item.label}
                </button>
              </li>
            </Fragment>
          )
        })}
      </ul>
    </nav>
  )
}
