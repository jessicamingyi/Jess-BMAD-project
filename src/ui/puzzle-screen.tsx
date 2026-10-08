import { useCallback, useRef } from 'react'
import { copy } from '../content/copy.ts'
import { cellMarks } from '../game/assists.ts'
import { remainingByDigit } from '../game/digit-counts.ts'
import { activeHint, hintAction, hintFocusCells, hintMistakeCell, hintTechnique, hintView } from '../game/hint.ts'
import { cityOfKey, pendingPostcard } from '../game/journey.ts'
import { SOLVING_ACTIONS } from '../game/reducer.ts'
import { activeSession, isFullNotSolved } from '../game/session.ts'
import type { Action, AppState, UndatedAction } from '../game/types.ts'
import { ActionRow } from './action-row.tsx'
import { DigitPad } from './digit-pad.tsx'
import { FullGridLine } from './full-grid-line.tsx'
import { HintPanel } from './hint-panel.tsx'
import { isMacPlatform, keyCaption } from './key-caption.ts'
import { useKeyboard } from './keyboard.ts'
import { ModeIndicator } from './mode-indicator.tsx'
import { Postcard } from './postcard.tsx'
import { Postmark } from './stamp.tsx'
import { SudokuGrid } from './sudoku-grid.tsx'
import { localDate } from './today.ts'
import './controls.css'
import './puzzle.css'

const platform = typeof navigator === 'undefined' ? '' : (navigator.platform ?? '')
const isMac = isMacPlatform(platform)

type Props = {
  /** AppState and dispatch are owned by `App`, so the Session outlives a visit to Settings. */
  state: AppState
  dispatch: (action: Action) => void
  /**
   * Today's local date, 'YYYY-MM-DD' (the Postmark date of a City in progress,
   * and the date stamped onto the four solving actions, so a solve dates its
   * Postcard); defaults to the local clock, read when the action is dispatched.
   * A solved City's Postmark shows its Postcard's `collectedOn` instead.
   */
  today?: string
}

export function PuzzleScreen({ state, dispatch: dispatchDated, today }: Props) {
  // The core never reads the clock: a solving action leaves here carrying the date it was made.
  const dispatch = useCallback(
    (action: UndatedAction) =>
      dispatchDated((SOLVING_ACTIONS.has(action.type) ? { ...action, date: today ?? localDate() } : action) as Action),
    [dispatchDated, today],
  )
  const active = activeSession(state)
  const session = active?.session
  const city = cityOfKey(active?.key ?? null)
  const { ui } = state
  const screenRef = useRef<HTMLDivElement>(null)
  const hint = active ? activeHint(state, active.key) : null
  // At step 2 every Hint control (H, the panel button, the action-row Hint) places the move.
  const hintNext = hintAction(hint)
  // This City's Postcard is waiting to be revealed: it lies over the finished grid.
  const pending = pendingPostcard(state.album)
  const revealing = city !== undefined && pending?.cityId === city.id ? pending : undefined
  const addPostcard = () => {
    if (city) dispatch({ type: 'postcardAdded', cityId: city.id })
  }
  useKeyboard(screenRef, dispatch, {
    inputMode: ui.inputMode,
    selectedCell: ui.selectedCell,
    restartConfirming: ui.restartConfirming,
    hintOpen: hint !== null,
    definitionOpen: hint?.definitionOpen === true && hintTechnique(hint) !== null,
    hintAtMove: hintNext.type === 'hintApplied',
    isMac,
  })
  const focusGrid = useCallback(() => {
    screenRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus()
  }, [])

  // App renders this screen only with a Session; stay safe if it ever doesn't.
  if (!session) return null
  const solved = session.status === 'solved'
  // A replay of a collected City: no Postcard, just the "Solved again" line.
  const solvedAgain = active !== null && ui.solvedAgain.includes(active.key)
  // The Postmark: a solved City is stamped with the day its Postcard was collected.
  const postcard = city && solved ? state.album.find((p) => p.cityId === city.id) : undefined
  const postmarkDate = revealing?.collectedOn ?? postcard?.collectedOn ?? today ?? localDate()

  return (
    <div className={city ? 'puzzle-screen puzzle-screen--city' : 'puzzle-screen'} ref={screenRef}>
      <SudokuGrid
        session={session}
        selectedCell={ui.selectedCell}
        marks={cellMarks(session, ui.selectedCell, state.settings, hintMistakeCell(hint))}
        hintCells={hintFocusCells(hint)}
        onClick={(cell) => dispatch({ type: 'cellClicked', cell })}
        onFocusCell={(cell) => dispatch({ type: 'cellSelected', cell })}
        decoration={city && <Postmark name={city.name} date={postmarkDate} />}
        inert={revealing !== undefined}
      />
      <div className="side-column" inert={revealing !== undefined}>
        <HintPanel
          step={hint?.step ?? null}
          view={hintView(hint, session.digits)}
          disabled={solved || hint?.result?.kind === 'none'}
          onAdvance={() => dispatch(hintNext)}
          definitionOpen={hint?.definitionOpen === true}
          onDefinition={(open) => dispatch({ type: open ? 'techniqueDefinitionOpened' : 'techniqueDefinitionClosed' })}
          focusGrid={focusGrid}
        />
        <ModeIndicator
          entryMode={ui.entryMode}
          inputMode={ui.inputMode}
          currentDigit={ui.currentDigit}
          selectedCell={ui.selectedCell}
          onEntryMode={(mode) => dispatch({ type: 'entryModeChosen', mode })}
          onInputMode={(mode) => dispatch({ type: 'inputModeChosen', mode })}
        />
        <DigitPad
          remaining={remainingByDigit(session.digits)}
          currentDigit={ui.currentDigit}
          numberFirst={ui.inputMode === 'numberFirst'}
          onDigit={(digit) => dispatch({ type: 'digitEntered', digit })}
        />
        <ActionRow
          confirming={ui.restartConfirming}
          undoCaption={keyCaption(platform)}
          hintDisabled={solved}
          onUndo={() => dispatch({ type: 'undoRequested' })}
          onHint={() => dispatch(hintNext)}
          onRestart={() => dispatch({ type: 'restartRequested' })}
          onCancel={() => dispatch({ type: 'restartCancelled' })}
          onConfirm={() => dispatch({ type: 'restartConfirmed' })}
        />
        {solved &&
          !revealing &&
          (city ? (
            <p className="puzzle-status">
              {solvedAgain ? copy.solvedAgainBefore(city.name) : `${copy.solvedCity} `}
              <button type="button" className="link-button" onClick={() => dispatch({ type: 'screenChosen', screen: 'album' })}>
                {copy.navAlbum}
              </button>
              {solvedAgain && copy.solvedAgainAfter}
            </p>
          ) : (
            <p className="puzzle-status">
              {copy.solvedFreePlay}{' '}
              <button type="button" className="link-button" onClick={() => dispatch({ type: 'screenChosen', screen: 'freePlay' })}>
                {copy.navFreePlay}
              </button>
            </p>
          ))}
        {!solved && isFullNotSolved(session) && <FullGridLine onHint={() => dispatch(hintNext)} focusGrid={focusGrid} />}
      </div>
      {city && revealing && (
        <div className="postcard-reveal" key={city.id}>
          <Postcard
            key={city.id}
            city={city}
            collectedOn={revealing.collectedOn}
            actionLabel={copy.addToAlbum}
            onAction={addPostcard}
            onEscape={addPostcard}
            modal
          />
        </div>
      )}
    </div>
  )
}
