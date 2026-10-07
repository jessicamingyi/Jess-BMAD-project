import { useEffect, useReducer, useRef, useState } from 'react'
import { samplePuzzle } from '../content/sample-puzzle.ts'
import { withAnnouncement } from '../game/announce.ts'
import { createInitialState } from '../game/session.ts'
import type { Screen } from '../game/types.ts'
import { AppNav } from './app-nav.tsx'
import { LiveRegion } from './live-region.tsx'
import { PuzzleScreen } from './puzzle-screen.tsx'
import { SettingsScreen } from './settings-screen.tsx'

/**
 * Owns AppState (one reducer for every screen) so settings, the Session and Undo
 * history survive switching between Puzzle and Settings. Settings start from
 * their defaults on every load; nothing is saved yet (Epic 4).
 */
export function App() {
  const [state, dispatch] = useReducer(withAnnouncement, samplePuzzle, createInitialState)
  const { screen } = state.ui
  const { lamplight } = state.settings
  const mainRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  /** Bumped on every nav choice; focus moves once the chosen screen has rendered. */
  const [focusRequest, setFocusRequest] = useState(0)

  // Lamplight comes only from the toggle; the system colour scheme is ignored.
  useEffect(() => {
    const root = document.documentElement
    if (lamplight) root.dataset.theme = 'lamplight'
    else delete root.dataset.theme
    return () => {
      delete root.dataset.theme
    }
  }, [lamplight])

  // After a nav choice: focus the grid's tab-stop cell, or the Settings page heading.
  useEffect(() => {
    if (focusRequest === 0) return
    if (screen === 'settings') headingRef.current?.focus()
    else mainRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus()
  }, [focusRequest, screen])

  const choose = (next: Screen) => {
    // Choosing the current screen does nothing (no re-render, no focus jump).
    if (next === screen) return
    dispatch({ type: 'screenChosen', screen: next })
    setFocusRequest((n) => n + 1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-wordmark">Traveller Sudoku</p>
        <p className="app-tagline">correspondence by puzzle</p>
        <AppNav current={screen} onChoose={choose} />
      </header>
      <main className="app-main" ref={mainRef}>
        {screen === 'settings' ? (
          <SettingsScreen
            settings={state.settings}
            headingRef={headingRef}
            onToggle={(setting) => dispatch({ type: 'settingToggled', setting })}
          />
        ) : (
          <PuzzleScreen state={state} dispatch={dispatch} />
        )}
      </main>
      {/* Outside the screens so it stays mounted (and in sync) across a visit to Settings. */}
      <LiveRegion announcement={state.ui.announcement} />
    </div>
  )
}
