import { useEffect, useReducer, useRef } from 'react'
import { withAnnouncement } from '../game/announce.ts'
import { createInitialState, FREE_PLAY_KEY } from '../game/session.ts'
import type { AppState, Screen } from '../game/types.ts'
import { AppNav } from './app-nav.tsx'
import { FreePlayScreen } from './free-play-screen.tsx'
import { LiveRegion } from './live-region.tsx'
import { PuzzleScreen } from './puzzle-screen.tsx'
import { PuzzleTitle } from './puzzle-title.tsx'
import { SettingsScreen } from './settings-screen.tsx'
import { useGenerator, type GeneratorWorkerFactory } from './use-generator.ts'

type Props = {
  /** Tests only: start from this state instead of the empty Free Play entry. */
  initialState?: AppState
  /** Tests only: a fake generator worker. */
  createWorker?: GeneratorWorkerFactory
}

const emptyState = () => createInitialState()

/**
 * Owns AppState (one reducer for every screen) so settings, the Session and Undo
 * history survive switching screens. The app starts on the Free Play entry with
 * no Session. Settings start from their defaults on every load; nothing is saved
 * yet (Epic 4).
 */
export function App({ initialState, createWorker }: Props) {
  const [state, dispatch] = useReducer(withAnnouncement, initialState, (s) => s ?? emptyState())
  const start = useGenerator(dispatch, createWorker)
  const { screen } = state.ui
  const { lamplight } = state.settings
  const session = state.sessions[FREE_PLAY_KEY]
  const mainRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  /** The screen focus was last moved for; focus moves once a changed screen has rendered. */
  const focusedScreen = useRef(screen)

  // Lamplight comes only from the toggle; the system colour scheme is ignored.
  useEffect(() => {
    const root = document.documentElement
    if (lamplight) root.dataset.theme = 'lamplight'
    else delete root.dataset.theme
    return () => {
      delete root.dataset.theme
    }
  }, [lamplight])

  // On a screen change (nav, "Carry on", the solved link, or a new Puzzle opening
  // from the entry): focus the grid's tab-stop cell, or the page heading.
  useEffect(() => {
    if (focusedScreen.current === screen) return
    focusedScreen.current = screen
    if (screen === 'puzzle') mainRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus()
    else headingRef.current?.focus()
  }, [screen])

  const choose = (next: Screen) => {
    // Choosing the current screen does nothing (no re-render, no focus jump).
    if (next === screen) return
    dispatch({ type: 'screenChosen', screen: next })
  }

  const showPuzzle = screen === 'puzzle' && session !== undefined

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-wordmark">Traveller Sudoku</p>
        <p className="app-tagline">correspondence by puzzle</p>
        <AppNav current={screen} puzzleAvailable={session !== undefined} onChoose={choose} />
        {/* Puzzle screen only: the title sits on its own line beneath the wordmark (other screens have their own h1). */}
        {showPuzzle && <PuzzleTitle difficulty={session.difficulty} />}
      </header>
      <main className="app-main" ref={mainRef}>
        {screen === 'settings' ? (
          <SettingsScreen
            settings={state.settings}
            headingRef={headingRef}
            onToggle={(setting) => dispatch({ type: 'settingToggled', setting })}
          />
        ) : showPuzzle ? (
          <PuzzleScreen state={state} dispatch={dispatch} />
        ) : (
          <FreePlayScreen
            freePlay={state.ui.freePlay}
            session={session}
            headingRef={headingRef}
            onPick={(difficulty) => dispatch({ type: 'freePlayDifficultyPicked', difficulty })}
            onStart={start}
            onCarryOn={() => choose('puzzle')}
            onReplace={() => dispatch({ type: 'freePlayReplaceRequested' })}
            onCancelReplace={() => dispatch({ type: 'freePlayReplaceCancelled' })}
          />
        )}
      </main>
      {/* Outside the screens so it stays mounted (and in sync) across screen changes. */}
      <LiveRegion announcement={state.ui.announcement} />
    </div>
  )
}
