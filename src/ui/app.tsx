import { useEffect, useReducer, useRef, useState } from 'react'
import { visibleBanner } from '../game/banners.ts'
import { withAnnouncement } from '../game/announce.ts'
import { cityKey, cityOfKey, pendingPostcard } from '../game/journey.ts'
import { launch } from '../game/launch.ts'
import { showPendingPostcard } from '../game/reducer.ts'
import { activeSession, createInitialState, FREE_PLAY_KEY } from '../game/session.ts'
import type { AppState, BannerKind, Screen, UiState } from '../game/types.ts'
import { toDocument, type Slices } from '../persistence/document.ts'
import { createSaver, type SaveStore } from '../persistence/store.ts'
import { AlbumScreen } from './album-screen.tsx'
import { AppNav } from './app-nav.tsx'
import { FreePlayScreen } from './free-play-screen.tsx'
import { LiveRegion } from './live-region.tsx'
import { NoticeBanner } from './notice-banner.tsx'
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
  /** The saved slices loaded before the first render (`persistence/store.loadSaved`); none on a first visit. */
  loaded?: Slices
  /** Where changes are saved. Without one nothing is saved (most tests). Read once, at mount. */
  store?: SaveStore
  /**
   * The protective `ui` flags the load settled on (`persistence/store.settleLoad`):
   * a read-only tab never writes; the unreadable notice; a failed migration write-back.
   */
  notices?: Partial<Pick<UiState, 'readOnly' | 'unreadableNotice' | 'saveFailed'>>
  /**
   * Subscribe to "a new version is waiting" (`ui/service-worker`); returns an unsubscribe.
   * Read once, at mount. The update banner only informs: nothing reloads.
   */
  onUpdateReady?: (listener: () => void) => () => void
}

/**
 * Owns AppState (one reducer for every screen) so settings, Sessions and Undo
 * history survive switching screens. The Album, Sessions, Settings and `meta`
 * are restored from the saved document (`loaded`) onto a fresh `ui` (Undo empty),
 * and saved whole after every action that changes one of them (`ui`-only actions
 * never write). At start the launch rule (`game/launch`) opens the last-played
 * Puzzle if in progress, else the first City in progress in catalogue order,
 * else Free Play in progress, else the Album.
 * A read-only tab (`notices.readOnly`) never writes. One notice banner at a time
 * shows the read-only, save-failed, unreadable or update-ready notice (`game/banners`).
 */
export function App({ initialState, createWorker, today, loaded, store, notices, onUpdateReady }: Props) {
  // The launch rule picks the opening screen; an unrevealed Postcard still shows first (it runs afterwards).
  const [state, dispatch] = useReducer(withAnnouncement, initialState, (s) => {
    const base = s ?? { ...createInitialState(), ...loaded }
    return showPendingPostcard(launch({ ...base, ui: { ...base.ui, ...notices } }))
  })
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

  // Autosave: write the whole document when a saved slice changes by reference (the
  // reducer shares unchanged slices). The first state is the baseline, so starting
  // (first visit or restore) never writes. Writes are queued in order.
  // One write queue for the component's life (useMemo may be rebuilt, which would start a second queue).
  // A read-only tab never gets one. Each write reports back: a failure shows the banner, a success clears it.
  const [saver] = useState(() =>
    store && !notices?.readOnly ? createSaver(store, (ok) => dispatch({ type: ok ? 'saveSucceeded' : 'saveFailed' })) : null,
  )
  /** The slices last loaded or saved; a change to any of their references means a write. */
  const saved = useRef<Slices | null>(null)
  const { album, sessions, settings, meta } = state
  useEffect(() => {
    const prev = saved.current
    saved.current = { album, sessions, settings, meta }
    if (prev === null) return
    if (prev.album === album && prev.sessions === sessions && prev.settings === settings && prev.meta === meta) return
    saver?.(toDocument({ album, sessions, settings, meta }))
  }, [saver, album, sessions, settings, meta])

  // A new version waiting: the lowest-priority banner. Subscribed once, at mount.
  const [subscribeUpdate] = useState(() => onUpdateReady)
  useEffect(() => subscribeUpdate?.(() => dispatch({ type: 'updateAvailable' })), [subscribeUpdate])

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

  // The one notice banner, by priority; on the Puzzle screen it heads the side column.
  const banner = visibleBanner(state.ui)
  /** "Got it" was pressed: once the banner has gone, focus the grid's tab-stop (Puzzle) or the page heading. */
  const refocus = useRef(false)
  const dismiss = (kind: BannerKind) => {
    refocus.current = true
    dispatch({ type: 'bannerDismissed', banner: kind })
  }
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    if (screen !== 'puzzle') {
      headingRef.current?.focus()
      return
    }
    const target = mainRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')
    // A read-only grid is inert and can't take focus: the current nav item takes it instead.
    if (target && !target.closest('[inert]')) target.focus()
    else document.querySelector<HTMLElement>('.app-nav [aria-current="page"]')?.focus()
  }, [banner, screen])
  const bannerEl = banner && (
    <NoticeBanner key={banner} kind={banner} readOnly={state.ui.readOnly} onDismiss={() => dismiss(banner)} />
  )

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
        readOnly={state.ui.readOnly !== null}
        onToggle={(setting) => dispatch({ type: 'settingToggled', setting })}
      />
    )
  } else if (showPuzzle) {
    main = <PuzzleScreen state={state} dispatch={dispatch} today={date} banner={bannerEl} />
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
      {/* Every screen but the Puzzle: the banner spans the content width under the header, pushing content down. */}
      {bannerEl && !showPuzzle && <div className="app-banner">{bannerEl}</div>}
      <main className="app-main" ref={mainRef}>
        {main}
      </main>
      {/* Outside the screens so it stays mounted (and in sync) across screen changes. */}
      <LiveRegion announcement={state.ui.announcement} />
    </div>
  )
}
