import { findHint } from '../engine/hints.ts'
import { parseGrid } from '../engine/grid.ts'
import { activeHint, hintMove, hintTechnique } from './hint.ts'
import { toggleNote } from './notes.ts'
import { createSession, FREE_PLAY_KEY } from './session.ts'
import type { Action, AppState, Difficulty, Puzzle, Screen, UndoEntry } from './types.ts'

const isCell = (c: number) => Number.isInteger(c) && c >= 0 && c < 81
const isDigit = (d: number) => Number.isInteger(d) && d >= 1 && d <= 9
const isDifficulty = (d: unknown): d is Difficulty => d === 'easy' || d === 'medium' || d === 'hard'
const isScreen = (s: unknown): s is Screen => s === 'puzzle' || s === 'freePlay' || s === 'settings'
const isGridString = (s: unknown) => typeof s === 'string' && /^[0-9]{81}$/.test(s)
const isPuzzle = (p: Puzzle | undefined): p is Puzzle =>
  !!p && isGridString(p.givens) && isGridString(p.solution) && isDifficulty(p.difficulty)

/**
 * Apply `digit` to `cell` in the current entry mode.
 * Digit: place, replace, or clear when the same digit is already there.
 * Notes: toggle Note `digit`, only in empty cells. Placing a digit hides Notes but keeps the mask.
 * Refused (same state) when solved or on a Given.
 */
export function applyDigit(state: AppState, cell: number, digit: number): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || !isCell(cell) || !isDigit(digit)) return state
  if (session.status === 'solved' || session.givens[cell] !== '0') return state

  if (state.ui.entryMode === 'notes') {
    if (session.digits[cell] !== '0') return state
    const notes = session.notes.slice()
    notes[cell] = toggleNote(notes[cell], digit)
    return {
      ...state,
      sessions: { ...state.sessions, [FREE_PLAY_KEY]: { ...session, notes } },
      meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
    }
  }

  const ch = String(digit)
  const next = session.digits[cell] === ch ? '0' : ch
  const digits = session.digits.slice(0, cell) + next + session.digits.slice(cell + 1)
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [FREE_PLAY_KEY]: {
        ...session,
        digits,
        status: digits === session.solution ? 'solved' : 'inProgress',
      },
    },
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
  }
}

/**
 * Clear `cell`: a player digit becomes empty (its hidden Notes show again); an
 * empty cell loses its Notes. Refused (same state) on a Given, when solved, or
 * when there is nothing to clear.
 */
export function clearCell(state: AppState, cell: number): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || !isCell(cell)) return state
  if (session.status === 'solved' || session.givens[cell] !== '0') return state
  if (session.digits[cell] !== '0') {
    const digits = session.digits.slice(0, cell) + '0' + session.digits.slice(cell + 1)
    return {
      ...state,
      sessions: { ...state.sessions, [FREE_PLAY_KEY]: { ...session, digits } },
      meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
    }
  }
  if (session.notes[cell] === 0) return state
  const notes = session.notes.slice()
  notes[cell] = 0
  return {
    ...state,
    sessions: { ...state.sessions, [FREE_PLAY_KEY]: { ...session, notes } },
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
  }
}

function select(state: AppState, cell: number): AppState {
  if (state.ui.selectedCell === cell) return state
  return { ...state, ui: { ...state.ui, selectedCell: cell } }
}

const sameNotes = (a: readonly number[], b: readonly number[]) =>
  a === b || (a.length === b.length && a.every((m, i) => m === b[i]))

/**
 * Push the pre-change `{ digits, notes }` of `prev` onto `next.ui.undo` when the
 * grid changed, and close any open Restart confirm. ui-only changes and no-ops record nothing.
 */
function record(prev: AppState, next: AppState): AppState {
  if (next === prev) return next
  const before = prev.sessions[FREE_PLAY_KEY]
  const after = next.sessions[FREE_PLAY_KEY]
  if (!before || !after || before === after) return next
  if (before.digits === after.digits && sameNotes(before.notes, after.notes)) return next
  const entry: UndoEntry = { digits: before.digits, notes: before.notes }
  return { ...next, ui: { ...next.ui, undo: [...prev.ui.undo, entry], restartConfirming: false } }
}

function undo(state: AppState): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  const history = state.ui.undo
  if (!session || session.status === 'solved' || history.length === 0) return state
  const { digits, notes } = history[history.length - 1]
  return {
    ...state,
    sessions: { ...state.sessions, [FREE_PLAY_KEY]: { ...session, digits, notes, status: 'inProgress' } },
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
    ui: { ...state.ui, undo: history.slice(0, -1), restartConfirming: false },
  }
}

/** Clear to the Givens. Snapshots first (so one Undo brings everything back); clean grids record nothing. */
function restart(state: AppState): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || session.status === 'solved') return state
  const closed = state.ui.restartConfirming ? { ...state, ui: { ...state.ui, restartConfirming: false } } : state
  const clean = session.digits === session.givens && session.notes.every((m) => m === 0)
  if (clean) return closed
  return record(closed, {
    ...closed,
    sessions: {
      ...closed.sessions,
      [FREE_PLAY_KEY]: {
        ...session,
        digits: session.givens,
        notes: Array.from({ length: 81 }, () => 0),
        status: 'inProgress',
      },
    },
    meta: { ...closed.meta, lastPlayedKey: FREE_PLAY_KEY },
  })
}

function setRestartConfirming(state: AppState, open: boolean): AppState {
  if (state.ui.restartConfirming === open) return state
  // Opening is refused once solved; closing an already-open confirm is always allowed.
  if (open && state.sessions[FREE_PLAY_KEY]?.status === 'solved') return state
  return { ...state, ui: { ...state.ui, restartConfirming: open } }
}

/**
 * The only way AppState changes. Pure: never mutates `state`, and returns
 * `state` itself when an action changes nothing. Every change to the session's
 * digits or Notes is recorded in `ui.undo`. Any change to the digits of the
 * Session an open Hint belongs to sets that Hint back to idle in the same step.
 */
export function reducer(state: AppState, action: Action): AppState {
  return resetHintOnDigits(state, reduce(state, action))
}

/** The post-step Hint rule: digits changed → the open Hint goes idle (Notes, selection and modes leave it alone). */
function resetHintOnDigits(prev: AppState, next: AppState): AppState {
  const hint = next.ui.hint
  if (next === prev || hint === null) return next
  if (prev.sessions[hint.sessionKey]?.digits === next.sessions[hint.sessionKey]?.digits) return next
  if (hint.step === 'idle' && hint.result === null) return next
  return { ...next, ui: { ...next.ui, hint: { sessionKey: hint.sessionKey, step: 'idle', result: null } } }
}

/**
 * H or a step button. Refused when there is no Session or it is solved.
 * Closed or idle → find a Hint from the digits: step 1 (nudge), or idle when the
 * Techniques find no placement. Nudge → explain. Explain → no change (the move
 * is placed by `hintApplied`). Never recorded in Undo.
 */
function requestHint(state: AppState): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || session.status === 'solved') return state
  const hint = activeHint(state, FREE_PLAY_KEY)
  const withHint = (next: NonNullable<AppState['ui']['hint']>): AppState => ({ ...state, ui: { ...state.ui, hint: next } })
  if (hint === null || hint.step === 'idle') {
    // Digits are unchanged since an idle "no Hint" result, so it would be the same again.
    if (hint?.result?.kind === 'none') return state
    const result = findHint(parseGrid(session.digits))
    return withHint({ sessionKey: FREE_PLAY_KEY, step: result.kind === 'none' ? 'idle' : 'nudge', result })
  }
  if (hint.step === 'nudge') return withHint({ ...hint, step: 'explain' })
  return state
}

/**
 * Place the open Hint's move (step 'explain', chain): set the digit whatever the
 * entry mode (Notes stay, hidden under the digit), add 1 to `hintsUsed`, and
 * detect a solve in the same step. Refused (same state) with no Session, when
 * solved, without the active Session's own Hint at step 2, or when the target
 * isn't an empty non-Given cell. `reduce` records it in Undo; `resetHintOnDigits`
 * then sets the Hint idle.
 */
function applyHint(state: AppState): AppState {
  const session = state.sessions[FREE_PLAY_KEY]
  if (!session || session.status === 'solved') return state
  const move = hintMove(activeHint(state, FREE_PLAY_KEY))
  if (!move || !isCell(move.cell) || !isDigit(move.digit)) return state
  const { cell, digit } = move
  if (session.givens[cell] !== '0' || session.digits[cell] !== '0') return state
  const digits = session.digits.slice(0, cell) + String(digit) + session.digits.slice(cell + 1)
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [FREE_PLAY_KEY]: {
        ...session,
        digits,
        hintsUsed: session.hintsUsed + 1,
        status: digits === session.solution ? 'solved' : 'inProgress',
      },
    },
    meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
  }
}

/**
 * Open or close the "What's a…" definition. Only the active Session's own Hint
 * at step 1 or 2 with a chain, and only when the value changes; otherwise the
 * same state. Touches nothing but `ui.hint.definitionOpen`. Never recorded in Undo.
 */
function setDefinitionOpen(state: AppState, open: boolean): AppState {
  const hint = activeHint(state, FREE_PLAY_KEY)
  if (!hint || hintTechnique(hint) === null) return state
  if ((hint.definitionOpen ?? false) === open) return state
  return { ...state, ui: { ...state.ui, hint: { ...hint, definitionOpen: open } } }
}

function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hintRequested':
      return requestHint(state)
    case 'hintApplied':
      return record(state, applyHint(state))
    case 'hintClosed':
      return state.ui.hint === null ? state : { ...state, ui: { ...state.ui, hint: null } }
    case 'techniqueDefinitionOpened':
      return setDefinitionOpen(state, true)
    case 'techniqueDefinitionClosed':
      return setDefinitionOpen(state, false)
    case 'undoRequested':
      return undo(state)
    case 'restartRequested':
      return setRestartConfirming(state, true)
    case 'restartCancelled':
      return setRestartConfirming(state, false)
    case 'restartConfirmed':
      return restart(state)
    case 'screenChosen':
      return chooseScreen(state, action.screen)
    case 'freePlayDifficultyPicked':
    case 'freePlayRequested':
    case 'freePlayReplaceRequested':
    case 'freePlayReplaceCancelled':
    case 'freePlayGenerated':
    case 'freePlayFailed':
      return freePlay(state, action)
    default:
      return record(state, step(state, action))
  }
}

/**
 * Switch screens. Leaving or entering a screen closes any open Restart or
 * replace confirm. The Puzzle screen needs a Session. Opening the Free Play entry
 * seeds the picker from the last Free Play Difficulty (unless a request is pending).
 */
function chooseScreen(state: AppState, screen: Screen): AppState {
  if (!isScreen(screen) || state.ui.screen === screen) return state
  if (screen === 'puzzle' && !state.sessions[FREE_PLAY_KEY]) return state
  const fp = state.ui.freePlay
  const entering = screen === 'freePlay' && fp.status !== 'generating'
  const picked = entering ? (state.settings.freePlayDifficulty ?? 'easy') : fp.picked
  // Re-entering the entry clears an old failure line.
  const status = entering && fp.status === 'failed' ? 'idle' : fp.status
  const unchanged = fp.picked === picked && fp.status === status && !fp.confirmingReplace
  return {
    ...state,
    ui: {
      ...state.ui,
      screen,
      restartConfirming: false,
      freePlay: unchanged ? fp : { ...fp, picked, status, confirmingReplace: false },
    },
  }
}

/** Free Play entry and generator replies. Never recorded in Undo. */
function freePlay(state: AppState, action: Action): AppState {
  const fp = state.ui.freePlay
  const session = state.sessions[FREE_PLAY_KEY]
  const withFreePlay = (next: Partial<typeof fp>): AppState => ({ ...state, ui: { ...state.ui, freePlay: { ...fp, ...next } } })
  switch (action.type) {
    case 'freePlayDifficultyPicked':
      if (!isDifficulty(action.difficulty) || fp.status === 'generating' || fp.picked === action.difficulty) return state
      return withFreePlay({ picked: action.difficulty, status: 'idle' })
    case 'freePlayRequested':
      if (!isDifficulty(action.difficulty) || !Number.isInteger(action.requestId)) return state
      return withFreePlay({
        picked: action.difficulty,
        requestId: action.requestId,
        status: 'generating',
        confirmingReplace: false,
      })
    case 'freePlayReplaceRequested':
      if (fp.confirmingReplace || fp.status === 'generating' || session?.status !== 'inProgress') return state
      return withFreePlay({ confirmingReplace: true })
    case 'freePlayReplaceCancelled':
      if (!fp.confirmingReplace) return state
      return withFreePlay({ confirmingReplace: false })
    case 'freePlayFailed':
      if (fp.status !== 'generating' || action.requestId !== fp.requestId) return state
      return withFreePlay({ status: 'failed' })
    case 'freePlayGenerated': {
      if (fp.status !== 'generating' || action.requestId !== fp.requestId) return state
      if (!isPuzzle(action.puzzle)) return withFreePlay({ status: 'failed' })
      const { puzzle } = action
      return {
        ...state,
        sessions: { ...state.sessions, [FREE_PLAY_KEY]: createSession(FREE_PLAY_KEY, puzzle) },
        settings: { ...state.settings, freePlayDifficulty: puzzle.difficulty },
        meta: { ...state.meta, lastPlayedKey: FREE_PLAY_KEY },
        ui: {
          ...state.ui,
          // Open the Puzzle only if the player is still on the entry; elsewhere they stay put.
          screen: state.ui.screen === 'freePlay' ? 'puzzle' : state.ui.screen,
          selectedCell: null,
          currentDigit: null,
          undo: [],
          restartConfirming: false,
          freePlay: { ...fp, picked: puzzle.difficulty, status: 'idle', confirmingReplace: false },
          hint: null,
        },
      }
    }
    default:
      return state
  }
}

/** Grid and mode actions; `reducer` records any grid change they make. */
function step(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'cellSelected': {
      if (!isCell(action.cell)) return state
      return select(state, action.cell)
    }
    case 'cellClicked': {
      if (!isCell(action.cell)) return state
      const selected = select(state, action.cell)
      const { inputMode, currentDigit } = selected.ui
      if (inputMode !== 'numberFirst' || currentDigit === null) return selected
      return applyDigit(selected, action.cell, currentDigit)
    }
    case 'digitEntered': {
      if (!isDigit(action.digit)) return state
      if (state.ui.inputMode === 'numberFirst') {
        if (state.ui.currentDigit === action.digit) return state
        return { ...state, ui: { ...state.ui, currentDigit: action.digit } }
      }
      const cell = state.ui.selectedCell
      if (cell === null) return state
      return applyDigit(state, cell, action.digit)
    }
    case 'entryModeChosen': {
      if (action.mode !== 'digit' && action.mode !== 'notes') return state
      if (state.ui.entryMode === action.mode) return state
      return { ...state, ui: { ...state.ui, entryMode: action.mode } }
    }
    case 'inputModeChosen': {
      if (action.mode !== 'cellFirst' && action.mode !== 'numberFirst') return state
      if (state.ui.inputMode === action.mode) return state
      return { ...state, ui: { ...state.ui, inputMode: action.mode } }
    }
    case 'inputModeToggled': {
      const inputMode = state.ui.inputMode === 'cellFirst' ? 'numberFirst' : 'cellFirst'
      return { ...state, ui: { ...state.ui, inputMode } }
    }
    case 'entryModeToggled': {
      const entryMode = state.ui.entryMode === 'digit' ? 'notes' : 'digit'
      return { ...state, ui: { ...state.ui, entryMode } }
    }
    case 'cellCleared': {
      const cell = state.ui.selectedCell
      if (cell === null) return state
      return clearCell(state, cell)
    }
    case 'settingToggled': {
      const { setting } = action
      if (!Object.hasOwn(state.settings, setting) || typeof state.settings[setting] !== 'boolean') return state
      return { ...state, settings: { ...state.settings, [setting]: !state.settings[setting] } }
    }
    case 'currentDigitPlaced': {
      const { inputMode, currentDigit, selectedCell } = state.ui
      if (inputMode !== 'numberFirst' || currentDigit === null || selectedCell === null) return state
      return applyDigit(state, selectedCell, currentDigit)
    }
    default:
      return state
  }
}
