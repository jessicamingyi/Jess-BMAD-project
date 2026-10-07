import { Fragment } from 'react'
import { copy } from '../content/copy.ts'
import type { Screen } from '../game/types.ts'

type Props = {
  current: Screen
  onChoose: (screen: Screen) => void
}

const ITEMS = [
  { screen: 'puzzle', label: copy.navPuzzle },
  { screen: 'settings', label: copy.navSettings },
] as const satisfies readonly { screen: Screen; label: string }[]

/**
 * Header nav "Puzzle · Settings" (UX-DR14). Screens switch by state, no router,
 * so the links are buttons; the current one carries aria-current="page".
 * No key shortcuts here: the one key handler lives on the Puzzle screen.
 */
export function AppNav({ current, onChoose }: Props) {
  return (
    <nav className="app-nav" aria-label={copy.navLabel}>
      <ul className="app-nav-list">
        {ITEMS.map((item, i) => (
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
                onClick={() => onChoose(item.screen)}
              >
                {item.label}
              </button>
            </li>
          </Fragment>
        ))}
      </ul>
    </nav>
  )
}
