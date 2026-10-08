import { useEffect, useReducer, useRef } from 'react'
import { withAnnouncement } from '../game/announce.ts'
import { cityKey, cityOfKey, pendingPostcard } from '../game/journey.ts'
import { launch } from '../game/launch.ts'
import { showPendingPostcard } from '../game/reducer.ts'
import { activeSession, createInitialState, FREE_PLAY_KEY } from '../game/session.ts'
import type { AppState, Screen } from '../game/types.ts'
import { AlbumScreen } from './album-screen.tsx'
import { AppNav } from './app-nav.tsx'
import { FreePlayScreen } from './free-play-screen.tsx'
import { LiveRegion } from './live-region.tsx'
import { PuzzleScreen } from './puzzle-screen.tsx'
import { PuzzleTitle } from './puzzle-title.tsx'
import { SettingsScreen } from './settings-screen.tsx'
import { localDate } from './today.ts'
import { useGenerator, type GeneratorWorkerFactory } from './use-generator.ts'

type Props = {
  /** Tests only: start from this state instead of the empty Album. */
  initialState?: AppState
  /** Tests only: a fake generator worker. */
  createWorker?: GeneratorWorkerFactory
  /** Tests only: today's date, 'YYYY-MM-DD'. By default the shell reads the local date. */
  today?: string
}

const emptyState = () => createInitialState()

/**
 * Owns AppState (one reducer for every screen) so settings, Sessions and Undo
 * history survive switching screens. At start the launch rule (`game/launch`)
 * opens the last-played Puzzle if in progress, else the first City in progress
 * in catalogue order, else Free Play in progress, else the Album. Settings start
 * from their defaults on every load; nothing is saved yet (Epic 4).
 */
export function App({ initialState, createWorker, today }: Props) {
  // The launch rule picks the opening screen; an unrevealed Postcard still shows first (it runs afterwards).
  const [state, dispatch] = useReducer(withAnnouncement, initialState, (s) => showPendingPostcard(launch(s ?? emptyState())))
  const start = useGenerator(dispatch, createWorker)
  const { screen } = state.ui
  const { lamplight } = state.settings
  const active = activeSession(state)
  const freeSession = state.sessions[FREE_PLAY_KEY]
  const mainRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  /** The screen focus was last moved for (null before mount); focus moves once a changed screen has rendered. */
  const focusedScreen = useRef<Screen | null>(null)
  const date = today ?? localDate()
  const showPuzzle = screen === 'puzzle' && active !== null
  // The Postcard reveal: "Add to Album" (or Esc) is the only way forward, so the nav is inert.
  // Only while the Postcard actually shows: its City is the current Puzzle (the PuzzleScreen rule).
  const pending = pendingPostcard(state.album)
  const revealing = showPuzzle && pending !== undefined && cityKey(pending.cityId) === active.key

  // Lamplight comes only from the toggle; the system colour scheme is ignored.
  useEffect(() => {
    const root = document.documentElement
    if (lamplight) root.dataset.theme = 'lamplight'
    else delete root.dataset.theme
    return () => {
      delete root.dataset.theme
    }
  }, [lamplight])

  // On mount (the launch screen) and on a screen change (nav, "Carry on", a slot, the
  // solved link, or a new Puzzle opening from the entry): focus the grid's tab-stop
  // cell, or the page heading.
  useEffect(() => {
    if (focusedScreen.current === screen) return
    focusedScreen.current = screen
    // During a reveal the Postcard focuses its own button.
    if (revealing) return
    if (screen === 'puzzle') mainRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus()
    else headingRef.current?.focus()
  }, [screen, revealing])

  const choose = (next: Screen) => {
    // Choosing the current screen does nothing (no re-render, no focus jump).
    if (next === screen) return
    dispatch({ type: 'screenChosen', screen: next })
  }

  let main
  if (screen === 'settings') {
    main = (
      <SettingsScreen
        settings={state.settings}
        headingRef={headingRef}
        onToggle={(setting) => dispatch({ type: 'settingToggled', setting })}
      />
    )
  } else if (showPuzzle) {
    main = <PuzzleScreen state={state} dispatch={dispatch} today={date} />
  } else if (screen === 'album') {
    main = (
      <AlbumScreen
        state={state}
        headingRef={headingRef}
        onRegion={(region) => dispatch({ type: 'albumRegionChosen', region })}
        onCity={(cityId) => dispatch({ type: 'cityChosen', cityId })}
        onView={(cityId) => dispatch({ type: 'postcardViewed', cityId })}
        onCloseViewer={() => dispatch({ type: 'postcardViewerClosed' })}
        onPlayAgain={() => dispatch({ type: 'replayRequested' })}
        onStartFresh={() => dispatch({ type: 'replayConfirmed' })}
        onKeepGoing={() => dispatch({ type: 'replayKept' })}
      />
    )
  } else {
    main = (
      <FreePlayScreen
        freePlay={state.ui.freePlay}
        session={freeSession}
        headingRef={headingRef}
        onPick={(difficulty) => dispatch({ type: 'freePlayDifficultyPicked', difficulty })}
        onStart={start}
        onCarryOn={() => dispatch({ type: 'freePlayResumed' })}
        onReplace={() => dispatch({ type: 'freePlayReplaceRequested' })}
        onCancelReplace={() => dispatch({ type: 'freePlayReplaceCancelled' })}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-wordmark">Traveller Sudoku</p>
        <p className="app-tagline">correspondence by puzzle</p>
        <AppNav current={screen} puzzleAvailable={active !== null} onChoose={choose} inert={revealing} />
        {/* Puzzle screen only: the title sits on its own line beneath the wordmark (other screens have their own h1). */}
        {showPuzzle && <PuzzleTitle difficulty={active.session.difficulty} city={cityOfKey(active.key)} />}
      </header>
      <main className="app-main" ref={mainRef}>
        {main}
      </main>
      {/* Outside the screens so it stays mounted (and in sync) across screen changes. */}
      <LiveRegion announcement={state.ui.announcement} />
    </div>
  )
}
