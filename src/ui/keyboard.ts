import { useEffect, type RefObject } from 'react'
import type { Action, InputMode } from '../game/types.ts'

/**
 * The one keyboard handler (AD-1, UX-DR60). No other file adds key listeners or
 * key props; tests/architecture/keyboard.test.ts enforces that.
 */

export type KeyInput = {
  readonly key: string
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
  readonly shiftKey: boolean
}

export type KeyContext = {
  /** Focus is on a grid cell (Enter/Space place, arrows move). */
  readonly inGrid: boolean
  readonly inputMode: InputMode
  readonly selectedCell: number | null
  readonly restartConfirming: boolean
  /** The Hint panel is open for this Session (Esc sets it aside). */
  readonly hintOpen: boolean
  /** The Hint's "What's a…" definition is open (Esc closes it before the panel). */
  readonly definitionOpen: boolean
  /** The Hint is at step 2 with a move to place: H applies it. */
  readonly hintAtMove: boolean
  /** Undo is Cmd+Z on macOS, Ctrl+Z elsewhere. */
  readonly isMac: boolean
}

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/** Map a key press to an action, or null when the key is not ours (the browser keeps it). Pure. */
export function keyToAction(input: KeyInput, ctx: KeyContext): Action | null {
  const { key, ctrlKey, metaKey, altKey, shiftKey } = input

  if ((key === 'z' || key === 'Z') && !altKey && !shiftKey && (ctx.isMac ? metaKey && !ctrlKey : ctrlKey && !metaKey)) {
    return { type: 'undoRequested' }
  }
  // Leave every other modified key to the browser.
  if (ctrlKey || metaKey || altKey) return null

  // Esc closes the innermost thing first: the Restart confirm, then the definition, then the Hint panel.
  if (key === 'Escape') {
    if (ctx.restartConfirming) return { type: 'restartCancelled' }
    if (ctx.definitionOpen) return { type: 'techniqueDefinitionClosed' }
    return ctx.hintOpen ? { type: 'hintClosed' } : null
  }

  if (key in ARROWS) {
    if (!ctx.inGrid) return null
    const cell = ctx.selectedCell ?? 0
    const [dr, dc] = ARROWS[key]
    const row = Math.floor(cell / 9) + dr
    const col = (cell % 9) + dc
    // No wrapping: at an edge the selection stays put (still handled, so the page doesn't scroll).
    const inside = row >= 0 && row < 9 && col >= 0 && col < 9
    return { type: 'cellSelected', cell: inside ? row * 9 + col : cell }
  }

  if (/^[1-9]$/.test(key)) return { type: 'digitEntered', digit: Number(key) }

  if (key === 'Enter' || key === ' ') {
    // On buttons Enter/Space activate the button; in cell-first a cell's own click just selects it.
    return ctx.inGrid && ctx.inputMode === 'numberFirst' ? { type: 'currentDigitPlaced' } : null
  }

  if (key === 'Backspace' || key === 'Delete') return { type: 'cellCleared' }

  switch (key) {
    case 'n':
    case 'N':
      return { type: 'entryModeToggled' }
    case 'm':
    case 'M':
      return { type: 'inputModeToggled' }
    case 'h':
    case 'H':
      return ctx.hintAtMove ? { type: 'hintApplied' } : { type: 'hintRequested' }
    default:
      return null
  }
}

/** True when `target` is a Sudoku grid cell. */
function isGridCell(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="grid"]') !== null
}

/**
 * Register the only `keydown` listener, on the Puzzle screen container, so
 * shortcuts work only while focus is inside the screen. Handled keys are
 * `preventDefault`ed.
 */
export function useKeyboard(
  ref: RefObject<HTMLElement | null>,
  dispatch: (action: Action) => void,
  context: Omit<KeyContext, 'inGrid'>,
): void {
  const { inputMode, selectedCell, restartConfirming, hintOpen, definitionOpen, hintAtMove, isMac } = context
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      // Held keys auto-repeat: only the arrows keep moving; nothing else re-applies.
      if (e.repeat && !(e.key in ARROWS)) return
      const action = keyToAction(e, {
        inGrid: isGridCell(e.target),
        inputMode,
        selectedCell,
        restartConfirming,
        hintOpen,
        definitionOpen,
        hintAtMove,
        isMac,
      })
      if (!action) return
      e.preventDefault()
      dispatch(action)
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [ref, dispatch, inputMode, selectedCell, restartConfirming, hintOpen, definitionOpen, hintAtMove, isMac])
}

/**
 * Esc for a screen without play shortcuts (the Free Play entry's replace
 * confirm). Only a bare Escape is handled, and only while `onEscape` is set;
 * digits, N, M and every other key stay with the browser.
 */
export function useEscape(ref: RefObject<HTMLElement | null>, onEscape: (() => void) | null): void {
  useEffect(() => {
    const el = ref.current
    if (!el || !onEscape) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return
      if (e.key !== 'Escape' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      e.preventDefault()
      onEscape()
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [ref, onEscape])
}
