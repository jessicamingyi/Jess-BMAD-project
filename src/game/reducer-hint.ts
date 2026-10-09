import { hintFor } from '../engine/hints.ts'
import { activeHint, hintMove, hintTechnique } from './hint.ts'
import { settle } from './reducer-journey.ts'
import { isCell, isDigit } from './reducer-shared.ts'
import { activeSession } from './session.ts'
import type { AppState } from './types.ts'

/** The post-step Hint rule: digits changed → the open Hint goes idle (Notes, selection and modes leave it alone). */
export function resetHintOnDigits(prev: AppState, next: AppState): AppState {
  const hint = next.ui.hint
  if (next === prev || hint === null) return next
  if (prev.sessions[hint.sessionKey]?.digits === next.sessions[hint.sessionKey]?.digits) return next
  if (hint.step === 'idle' && hint.result === null) return next
  return { ...next, ui: { ...next.ui, hint: { sessionKey: hint.sessionKey, step: 'idle', result: null } } }
}

/**
 * H or a step button. Refused when there is no current Puzzle or it is solved.
 * Closed or idle → find a Hint from the digits: the first Mistake if any, else
 * a Technique chain; step 1 (nudge), or idle when the Techniques find no
 * placement. Nudge → explain. Explain → no change (the move
 * is placed by `hintApplied`). Never recorded in Undo.
 */
export function requestHint(state: AppState): AppState {
  const active = activeSession(state)
  if (!active || active.session.status === 'solved') return state
  const { key, session } = active
  const hint = activeHint(state, key)
  const withHint = (next: NonNullable<AppState['ui']['hint']>): AppState => ({ ...state, ui: { ...state.ui, hint: next } })
  if (hint === null || hint.step === 'idle') {
    // Digits are unchanged since an idle "no Hint" result, so it would be the same again.
    if (hint?.result?.kind === 'none') return state
    const result = hintFor(session.givens, session.digits, session.solution)
    return withHint({ sessionKey: key, step: result.kind === 'none' ? 'idle' : 'nudge', result })
  }
  if (hint.step === 'nudge') return withHint({ ...hint, step: 'explain' })
  return state
}

/**
 * Make the open Hint's move (step 'explain'). A chain: place the digit
 * whatever the entry mode (Notes stay, hidden under the digit). A Mistake
 * (digit 0): clear its cell (the Notes mask is kept, so its Notes show again).
 * Either way add 1 to `hintsUsed` and detect a solve in the same step. Refused
 * (same state) with no current Puzzle, when solved, without the current
 * Puzzle's own Hint at step 2, when a placement's target isn't an empty non-Given cell, or
 * when a Mistake's cell is a Given or no longer holds the reported digit.
 * `reduce` records it in Undo; `resetHintOnDigits` then sets the Hint idle.
 */
export function applyHint(state: AppState, date: string): AppState {
  const active = activeSession(state)
  if (!active || active.session.status === 'solved') return state
  const { key, session } = active
  const hint = activeHint(state, key)
  const move = hintMove(hint)
  if (!move || !isCell(move.cell)) return state
  const { cell, digit } = move
  if (session.givens[cell] !== '0') return state
  if (digit === 0) {
    // A Mistake clear: the cell must still hold the digit the Hint reported.
    if (hint?.result?.kind !== 'mistake' || session.digits[cell] !== String(hint.result.digit)) return state
  } else if (!isDigit(digit) || session.digits[cell] !== '0') return state
  const digits = session.digits.slice(0, cell) + String(digit) + session.digits.slice(cell + 1)
  return settle(state, key, { ...session, digits, hintsUsed: session.hintsUsed + 1 }, date)
}

/**
 * Open or close the "What's a…" definition. Only the current Puzzle's own Hint
 * at step 1 or 2 with a chain, and only when the value changes; otherwise the
 * same state. Touches nothing but `ui.hint.definitionOpen`. Never recorded in Undo.
 */
export function setDefinitionOpen(state: AppState, open: boolean): AppState {
  const key = activeSession(state)?.key
  const hint = key === undefined ? null : activeHint(state, key)
  if (!hint || hintTechnique(hint) === null) return state
  if ((hint.definitionOpen ?? false) === open) return state
  return { ...state, ui: { ...state.ui, hint: { ...hint, definitionOpen: open } } }
}
