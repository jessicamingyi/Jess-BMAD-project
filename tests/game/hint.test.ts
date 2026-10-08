import { describe, expect, it } from 'vitest'
import { copy } from '../../src/content/copy.ts'
import { samplePuzzle } from '../../src/content/sample-puzzle.ts'
import { withAnnouncement } from '../../src/game/announce.ts'
import { cellMarks } from '../../src/game/assists.ts'
import { activeHint, hintAction, hintFocusCells, hintMistakeCell, hintMove, hintTechnique, hintView } from '../../src/game/hint.ts'
import { reducer } from '../../src/game/reducer.ts'
import { createInitialState, createSession, FREE_PLAY_KEY, isFullNotSolved } from '../../src/game/session.ts'
import type { Action, AppState } from '../../src/game/types.ts'
import { HINT_POSITIONS, PUZZLES } from '../engine/fixtures.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const say = (state: AppState, ...actions: Action[]) => actions.reduce(withAnnouncement, state)
const H: Action = { type: 'hintRequested' }
const ESC: Action = { type: 'hintClosed' }
const APPLY: Action = { type: 'hintApplied', date: '2026-10-07' }
const select = (cell: number): Action => ({ type: 'cellSelected', cell })
const enter = (digit: number): Action => ({ type: 'digitEntered', digit, date: '2026-10-07' })

const { givens, solution } = samplePuzzle
const emptyCells = [...givens].flatMap((ch, i) => (ch === '0' ? [i] : []))
const fresh = () => deepFreeze(createInitialState(samplePuzzle))
const row5 = [36, 37, 38, 39, 40, 41, 42, 43, 44]

/** A fresh state with one empty cell in another position than the hint cell (cell 40). */
const OTHER = emptyCells.find((c) => c !== 40)!

describe('hintRequested', () => {
  it('open: closed → step "nudge" with the chain, keyed by the session; nudge unit cells marked', () => {
    const s = run(fresh(), H)
    expect(s.ui.hint).toEqual({
      sessionKey: FREE_PLAY_KEY,
      step: 'nudge',
      result: {
        kind: 'chain',
        chain: [{ technique: 'nakedSingle', placements: [{ cell: 40, digit: 5 }], eliminations: [], focusCells: [40], unit: { kind: 'cell', index: 40 } }],
      },
    })
    // A naked single's nudge names its cell's row: those nine cells.
    expect([...hintFocusCells(s.ui.hint)].sort((a, b) => a - b)).toEqual(row5)
  })

  it('advance: nudge → explain; every chain focusCell marked', () => {
    const s = run(fresh(), H, H)
    expect(s.ui.hint?.step).toBe('explain')
    expect([...hintFocusCells(s.ui.hint)]).toEqual([40])
    const pointing = run(createInitialState({ givens: HINT_POSITIONS.pointing, solution, difficulty: 'hard' }), H, H)
    expect([...hintFocusCells(pointing.ui.hint)].sort((a, b) => a - b)).toEqual([39, 41, 66, 67, 70])
  })

  it('nudge marks a column unit and a box unit', () => {
    const nudgeCells = (digits: string) =>
      [...hintFocusCells(run(createInitialState({ givens: digits, solution, difficulty: 'hard' }), H).ui.hint)].sort((a, b) => a - b)
    // Naked pair in column 1.
    expect(nudgeCells(HINT_POSITIONS.nakedPair)).toEqual([0, 9, 18, 27, 36, 45, 54, 63, 72])
    // Pointing in box 5.
    expect(nudgeCells(HINT_POSITIONS.pointing)).toEqual([30, 31, 32, 39, 40, 41, 48, 49, 50])
  })

  it('step 2 + hintRequested: no change, same state (the move is hintApplied)', () => {
    const s = run(fresh(), H, H)
    expect(reducer(s, H)).toBe(s)
  })

  it('opening from idle searches again; neither action touches Undo', () => {
    const s = run(fresh(), select(OTHER), enter(1), H)
    const undo = s.ui.undo
    expect(run(s, H, H, ESC, H).ui.undo).toBe(undo)
    const idle = run(s, select(OTHER), enter(2))
    expect(idle.ui.hint).toEqual({ sessionKey: FREE_PLAY_KEY, step: 'idle', result: null })
    expect(reducer(idle, H).ui.hint?.step).toBe('nudge')
  })

  it('solved: refused, same state', () => {
    let s: AppState = fresh()
    for (const c of emptyCells) s = run(s, select(c), enter(Number(solution[c])))
    expect(s.sessions.free.status).toBe('solved')
    expect(reducer(s, H)).toBe(s)
  })

  it('no Session: refused', () => {
    const s = createInitialState()
    expect(reducer(s, H)).toBe(s)
  })

  it('no placement: { kind: "none" }; the panel opens idle, stays idle, no announcement', () => {
    const s0 = deepFreeze(createInitialState({ givens: PUZZLES.beyondMvp.givens, solution, difficulty: 'hard' }))
    const s1 = say(s0, H)
    expect(s1.ui.hint).toEqual({ sessionKey: FREE_PLAY_KEY, step: 'idle', result: { kind: 'none' } })
    expect(s1.ui.announcement).toBeNull()
    expect(hintFocusCells(s1.ui.hint).size).toBe(0)
    expect(say(s1, H)).toBe(s1)
  })

  it('an idle "none" Hint resets to result null when digits change, and H then searches again', () => {
    // Givens all empty so every cell is editable; digits are the deadly-rectangle grid (no placement).
    const base = createInitialState(samplePuzzle)
    const s0: AppState = deepFreeze({
      ...base,
      sessions: { free: { ...base.sessions.free, givens: '0'.repeat(81), digits: PUZZLES.multiSolution.givens } },
    })
    const s1 = run(s0, H)
    expect(s1.ui.hint).toEqual({ sessionKey: FREE_PLAY_KEY, step: 'idle', result: { kind: 'none' } })
    const s2 = run(s1, select(32), enter(Number(solution[32])))
    expect(s2.ui.hint).toEqual({ sessionKey: FREE_PLAY_KEY, step: 'idle', result: null })
    const s3 = reducer(s2, H)
    expect(s3).not.toBe(s2)
    expect(s3.ui.hint).toMatchObject({ sessionKey: FREE_PLAY_KEY, step: 'nudge', result: { kind: 'chain' } })
  })
})

describe('hintClosed', () => {
  it('Esc: ui.hint = null, no marks', () => {
    const s = run(fresh(), H, ESC)
    expect(s.ui.hint).toBeNull()
    expect(hintFocusCells(s.ui.hint).size).toBe(0)
  })

  it('closed already: same state', () => {
    const s = fresh()
    expect(reducer(s, ESC)).toBe(s)
  })
})

describe('reset rule', () => {
  const open = () => run(fresh(), select(OTHER), H, H)
  const idle = { sessionKey: FREE_PLAY_KEY, step: 'idle', result: null }

  it('a digit entry sets an open Hint to idle in the same step, with no marks', () => {
    const s = run(open(), enter(1))
    expect(s.sessions.free.digits[OTHER]).toBe('1')
    expect(s.ui.hint).toEqual(idle)
    expect(hintFocusCells(s.ui.hint).size).toBe(0)
  })

  it('clear, Undo and Restart reset it too', () => {
    const placed = run(fresh(), select(OTHER), enter(1))
    const opened = run(placed, H)
    expect(run(opened, { type: 'cellCleared' }).ui.hint).toEqual(idle)
    expect(run(opened, { type: 'undoRequested' }).ui.hint).toEqual(idle)
    expect(run(opened, { type: 'restartRequested' }, { type: 'restartConfirmed' }).ui.hint).toEqual(idle)
  })

  it('number-first placement (click and Enter) resets it', () => {
    const s = run(fresh(), { type: 'inputModeToggled' }, enter(1), H)
    expect(run(s, { type: 'cellClicked', cell: OTHER, date: '2026-10-07' }).ui.hint).toEqual(idle)
    expect(run(s, select(OTHER), { type: 'currentDigitPlaced', date: '2026-10-07' }).ui.hint).toEqual(idle)
  })

  it('Notes, selection and mode changes keep the same ui.hint reference', () => {
    const s = open()
    const hint = s.ui.hint
    const after = run(
      s,
      { type: 'entryModeChosen', mode: 'notes' },
      enter(3),
      select(emptyCells[3]),
      enter(4),
      { type: 'cellCleared' },
      { type: 'entryModeToggled' },
      { type: 'inputModeToggled' },
      { type: 'inputModeChosen', mode: 'cellFirst' },
      { type: 'settingToggled', setting: 'unitHighlighting' },
    )
    expect(after.sessions.free.notes).not.toEqual(s.sessions.free.notes)
    expect(after.ui.hint).toBe(hint)
  })

  it('an Undo that restores only Notes keeps the Hint', () => {
    const s = run(fresh(), { type: 'entryModeChosen', mode: 'notes' }, select(OTHER), enter(3), H)
    const hint = s.ui.hint
    expect(run(s, { type: 'undoRequested' }).ui.hint).toBe(hint)
  })

  it('an idle Hint with no result keeps its reference when digits change again', () => {
    const s = run(open(), enter(1))
    expect(run(s, enter(2)).ui.hint).toBe(s.ui.hint)
  })

  it('ui.hint is never recorded in Undo entries', () => {
    const s = run(open(), enter(1))
    for (const entry of s.ui.undo) expect(Object.keys(entry).sort()).toEqual(['digits', 'notes'])
  })

  it('New Puzzle (freePlayGenerated): ui.hint = null', () => {
    const s = run(open(), { type: 'freePlayRequested', requestId: 1, difficulty: 'easy' })
    expect(s.ui.hint).not.toBeNull()
    const next = run(s, { type: 'freePlayGenerated', requestId: 1, puzzle: { givens: PUZZLES.easy.givens, solution: PUZZLES.easy.solution, difficulty: 'easy' } })
    expect(next.ui.hint).toBeNull()
  })
})

describe('Notes never feed or change a Hint', () => {
  it('same digits with different (wrong) Notes give the same result, and the Notes array is unchanged', () => {
    const plain = run(fresh(), H)
    let noted: AppState = run(fresh(), { type: 'entryModeChosen', mode: 'notes' })
    // Wrong Notes everywhere around the hint cell, including a Note that excludes the answer.
    for (const c of [40, ...emptyCells.slice(0, 10)]) noted = run(noted, select(c), enter(1), enter(9))
    const notesBefore = noted.sessions.free.notes
    const withHint = run(noted, H)
    expect(withHint.ui.hint?.result).toEqual(plain.ui.hint?.result)
    expect(withHint.sessions.free.notes).toBe(notesBefore)
    expect(withHint.sessions.free).toBe(noted.sessions.free)
  })
})

describe('activeHint (two sessions)', () => {
  it('a Hint for session A is closed for session B', () => {
    const base = run(fresh(), H)
    const a = { ...base.ui.hint!, sessionKey: 'city:a' }
    const state: AppState = {
      ...base,
      sessions: { ...base.sessions, 'city:a': createSession('city:a', samplePuzzle) },
      ui: { ...base.ui, hint: a },
    }
    expect(activeHint(state, 'city:a')).toBe(a)
    expect(activeHint(state, FREE_PLAY_KEY)).toBeNull()
    expect(activeHint(base, FREE_PLAY_KEY)).toBe(base.ui.hint)
    expect(activeHint(fresh(), FREE_PLAY_KEY)).toBeNull()
  })

  it('H on B while A has a Hint opens a fresh Hint for B', () => {
    const base = run(fresh(), H, H)
    const state: AppState = { ...base, ui: { ...base.ui, hint: { ...base.ui.hint!, sessionKey: 'city:a' } } }
    expect(reducer(state, H).ui.hint).toMatchObject({ sessionKey: FREE_PLAY_KEY, step: 'nudge' })
  })

  it("another session's digits changing leaves this Hint alone", () => {
    const base = run(fresh(), H)
    const other = createSession('city:a', samplePuzzle)
    const before: AppState = { ...base, sessions: { ...base.sessions, 'city:a': other } }
    // Simulate a change to another session (no action routes there yet): the rule compares the Hint's own session.
    const after = reducer(before, select(3))
    expect(after.ui.hint).toBe(before.ui.hint)
  })
})

describe('hintView', () => {
  const naked = {
    link: "What's a naked single?",
    title: 'Naked single',
    definition: 'A cell where only one digit is left, because the other eight are already in its row, column or box.',
  }

  it('idle / nudge / explain labels and the one button; the Technique link at steps 1 and 2 only', () => {
    expect(hintView(null, givens)).toEqual({ label: 'Hint', text: '', button: 'Show a nudge', technique: null })
    const n = run(fresh(), H)
    expect(hintView(n.ui.hint, givens)).toEqual({
      label: 'Nudge',
      text: 'Look for a naked single in row 5.',
      button: 'Explain it',
      technique: naked,
    })
    const e = run(n, H)
    expect(hintView(e.ui.hint, givens)).toMatchObject({ label: 'Explanation', button: 'Show me the move', technique: naked })
    const idle = run(e, select(OTHER), enter(1))
    expect(hintView(idle.ui.hint, idle.sessions.free.digits)).toEqual({
      label: 'Hint',
      text: '',
      button: 'Show a nudge',
      technique: null,
    })
  })
})

describe('hintTechnique', () => {
  const at = (digits: string, ...actions: Action[]) =>
    run(createInitialState({ givens: digits, solution, difficulty: 'hard' }), ...actions).ui.hint

  it("names the chain's first Step's Technique (the one the nudge names)", () => {
    // Pointing, pointing, then a naked single.
    expect(hintTechnique(at(HINT_POSITIONS.pointing, H))).toBe('pointing')
    expect(hintView(at(HINT_POSITIONS.pointing, H), HINT_POSITIONS.pointing).technique?.link).toBe("What's pointing?")
    expect(hintTechnique(at(HINT_POSITIONS.pointing, H, H))).toBe('pointing')
    // Naked pair, naked pair, then a hidden single.
    expect(hintTechnique(at(HINT_POSITIONS.nakedPair, H))).toBe('nakedPair')
    expect(hintTechnique(at(HINT_POSITIONS.claiming, H))).toBe('claiming')
    expect(hintTechnique(run(fresh(), H).ui.hint)).toBe('nakedSingle')
  })

  it('a mixed chain names its first Step, not the hardest; a single-step chain names its single', () => {
    const step = (technique: 'nakedPair' | 'pointing' | 'hiddenSingle', placements: { cell: number; digit: number }[] = []) => ({
      technique,
      placements,
      eliminations: [],
      focusCells: [33],
      unit: { kind: 'box' as const, index: 5 },
    })
    const mixed = {
      sessionKey: FREE_PLAY_KEY,
      step: 'nudge' as const,
      result: { kind: 'chain' as const, chain: [step('nakedPair'), step('pointing'), step('hiddenSingle', [{ cell: 33, digit: 1 }])] },
    }
    expect(hintTechnique(mixed)).toBe('nakedPair')
    expect(hintView(mixed, givens).text).toBe('Look for a naked pair in box 6.')
    expect(hintView(mixed, givens).technique?.link).toBe("What's a naked pair?")
    const single = { ...mixed, result: { kind: 'chain' as const, chain: [step('hiddenSingle', [{ cell: 33, digit: 1 }])] } }
    expect(hintTechnique(single)).toBe('hiddenSingle')
    expect(hintView(single, givens).technique?.link).toBe("What's a hidden single?")
  })

  it('null when closed, idle or without a chain', () => {
    expect(hintTechnique(null)).toBeNull()
    expect(hintTechnique({ sessionKey: FREE_PLAY_KEY, step: 'idle', result: null })).toBeNull()
    expect(hintTechnique({ sessionKey: FREE_PLAY_KEY, step: 'nudge', result: { kind: 'none' } })).toBeNull()
  })
})

describe('technique definition', () => {
  const OPEN: Action = { type: 'techniqueDefinitionOpened' }
  const CLOSE: Action = { type: 'techniqueDefinitionClosed' }

  it('open: definitionOpen true; step, chain, marks, digits, Notes and Undo unchanged', () => {
    const s = run(fresh(), select(OTHER), H)
    const o = reducer(s, OPEN)
    expect(o.ui.hint).toEqual({ ...s.ui.hint, definitionOpen: true })
    expect(o.ui.hint?.result).toBe(s.ui.hint?.result)
    expect(hintFocusCells(o.ui.hint)).toEqual(hintFocusCells(s.ui.hint))
    expect(hintView(o.ui.hint, givens)).toEqual(hintView(s.ui.hint, givens))
    expect(o.sessions).toBe(s.sessions)
    expect(o.ui.undo).toBe(s.ui.undo)
    expect(o.ui.selectedCell).toBe(s.ui.selectedCell)
  })

  it('close: definitionOpen false, same step', () => {
    const o = run(fresh(), H, H, OPEN)
    const c = reducer(o, CLOSE)
    expect(c.ui.hint?.definitionOpen).toBe(false)
    expect(c.ui.hint?.step).toBe('explain')
    expect(c.sessions).toBe(o.sessions)
    expect(c.ui.undo).toBe(o.ui.undo)
  })

  it('no change returns the same state: open twice, close when closed', () => {
    const o = run(fresh(), H, OPEN)
    expect(reducer(o, OPEN)).toBe(o)
    const n = run(fresh(), H)
    expect(reducer(n, CLOSE)).toBe(n)
  })

  it('step advance keeps it open (same chain, same Technique)', () => {
    const s = run(fresh(), H, OPEN, H)
    expect(s.ui.hint?.step).toBe('explain')
    expect(s.ui.hint?.definitionOpen).toBe(true)
  })

  it('any digit change resets the Hint to idle and drops the definition', () => {
    const placed = run(fresh(), select(OTHER), enter(1))
    const opened = run(placed, H, OPEN)
    const idle = { sessionKey: FREE_PLAY_KEY, step: 'idle', result: null }
    expect(run(opened, enter(2)).ui.hint).toEqual(idle)
    expect(run(opened, { type: 'cellCleared' }).ui.hint).toEqual(idle)
    expect(run(opened, { type: 'undoRequested' }).ui.hint).toEqual(idle)
    expect(run(opened, { type: 'restartRequested' }, { type: 'restartConfirmed' }).ui.hint).toEqual(idle)
    expect(run(opened, H, APPLY).ui.hint).toEqual(idle)
    expect(run(opened, ESC).ui.hint).toBeNull()
  })

  it('stale: no Hint, another Session, idle, or no chain → same state reference', () => {
    const none = fresh()
    expect(reducer(none, OPEN)).toBe(none)
    expect(reducer(none, CLOSE)).toBe(none)
    const opened = run(fresh(), H, OPEN)
    const other = deepFreeze({ ...opened, ui: { ...opened.ui, hint: { ...opened.ui.hint!, sessionKey: 'city:x' } } })
    expect(reducer(other, OPEN)).toBe(other)
    expect(reducer(other, CLOSE)).toBe(other)
    const idle = run(fresh(), select(OTHER), enter(1), H, enter(2))
    expect(idle.ui.hint?.step).toBe('idle')
    expect(reducer(idle, OPEN)).toBe(idle)
    const noChain = deepFreeze({ ...opened, ui: { ...opened.ui, hint: { sessionKey: FREE_PLAY_KEY, step: 'nudge' as const, result: { kind: 'none' as const }, definitionOpen: true } } })
    expect(reducer(noChain, OPEN)).toBe(noChain)
    expect(reducer(noChain, CLOSE)).toBe(noChain)
  })
})

describe('announcements', () => {
  it('one per step: the nudge, then the explanation; nothing for step 2 + H or Esc', () => {
    const s1 = say(fresh(), H)
    expect(s1.ui.announcement).toEqual({ text: 'Look for a naked single in row 5.', seq: 1 })
    const s2 = say(s1, H)
    expect(s2.ui.announcement).toEqual({
      text: 'Row 5, column 5 can only be a 5. Every other digit is already in its row, column or box.',
      seq: 2,
    })
    expect(say(s2, H)).toBe(s2)
    expect(say(s2, ESC).ui.announcement).toBe(s2.ui.announcement)
  })

  it('a digit that resets the Hint announces only the digit', () => {
    const s = say(fresh(), select(OTHER), H, enter(1))
    expect(s.ui.announcement?.text).toBe('1')
    expect(s.ui.hint?.step).toBe('idle')
  })
})

describe('acceptance: H twice from step 1', () => {
  /** What one H press does (the UI maps it with `hintAction`). */
  const press = (s: AppState) => reducer(s, { ...hintAction(activeHint(s, FREE_PLAY_KEY)), date: '2026-10-07' } as Action)

  it('the first press shows step 2, the second places the move, a third opens a new nudge', () => {
    const s1 = run(fresh(), H)
    expect(hintAction(s1.ui.hint)).toEqual(H)
    const s2 = press(s1)
    expect(s2.ui.hint?.step).toBe('explain')
    expect(hintAction(s2.ui.hint)).toEqual({ type: 'hintApplied' })
    const s3 = press(s2)
    expect(s3.sessions.free.digits[40]).toBe('5')
    expect(s3.ui.hint).toEqual({ sessionKey: FREE_PLAY_KEY, step: 'idle', result: null })
    const s4 = press(s3)
    expect(s4.ui.hint?.step).toBe('nudge')
    expect(s4.sessions.free.digits).toBe(s3.sessions.free.digits)
  })
})

describe('hintMove / hintAction', () => {
  it('the last chain Step\'s placement at step 2 only', () => {
    expect(hintMove(null)).toBeNull()
    const n = run(fresh(), H)
    expect(hintMove(n.ui.hint)).toBeNull()
    expect(hintMove(run(n, H).ui.hint)).toEqual({ cell: 40, digit: 5 })
    const pointing = run(createInitialState({ givens: HINT_POSITIONS.pointing, solution, difficulty: 'hard' }), H, H)
    const chain = pointing.ui.hint?.result?.kind === 'chain' ? pointing.ui.hint.result.chain : []
    expect(chain.length).toBeGreaterThan(1)
    expect(hintMove(pointing.ui.hint)).toEqual(chain[chain.length - 1].placements[0])
    expect(hintAction(null)).toEqual(H)
    expect(hintAction({ sessionKey: FREE_PLAY_KEY, step: 'explain', result: { kind: 'none' } })).toEqual(H)
  })
})

describe('hintApplied', () => {
  const atMove = (s: AppState = fresh()) => deepFreeze(run(s, select(OTHER), H, H))
  const idle = { sessionKey: FREE_PLAY_KEY, step: 'idle', result: null }

  it('apply: places the move, hintsUsed + 1, one Undo entry, Hint idle, announced once', () => {
    const s = atMove()
    const next = say(s, APPLY)
    expect(next.sessions.free.digits[40]).toBe('5')
    expect(next.sessions.free.digits).toBe(s.sessions.free.digits.slice(0, 40) + '5' + s.sessions.free.digits.slice(41))
    expect(next.sessions.free.hintsUsed).toBe(1)
    expect(next.sessions.free.status).toBe('inProgress')
    expect(next.ui.undo).toHaveLength(s.ui.undo.length + 1)
    expect(next.ui.undo.at(-1)).toEqual({ digits: s.sessions.free.digits, notes: s.sessions.free.notes })
    expect(next.ui.hint).toEqual(idle)
    expect(hintFocusCells(next.ui.hint).size).toBe(0)
    expect(next.ui.announcement).toEqual({ text: '5 placed, row 5, column 5', seq: (s.ui.announcement?.seq ?? 0) + 1 })
    expect(next.ui.selectedCell).toBe(OTHER)
    expect(next.meta.lastPlayedKey).toBe(FREE_PLAY_KEY)
  })

  it('closes an open Restart confirm', () => {
    const s = run(atMove(), { type: 'restartRequested' })
    expect(s.ui.restartConfirming).toBe(true)
    expect(run(s, APPLY).ui.restartConfirming).toBe(false)
  })

  it('Notes in the target: the digit hides them and the mask is kept', () => {
    const noted = run(fresh(), { type: 'entryModeChosen', mode: 'notes' }, select(40), enter(3), enter(5), { type: 'entryModeChosen', mode: 'digit' })
    const mask = noted.sessions.free.notes[40]
    expect(mask).not.toBe(0)
    const next = run(noted, H, H, APPLY)
    expect(next.sessions.free.digits[40]).toBe('5')
    expect(next.sessions.free.notes[40]).toBe(mask)
    expect(next.sessions.free.notes).toBe(noted.sessions.free.notes)
  })

  it('Notes entry mode: still places the digit; Notes untouched', () => {
    const noted = run(fresh(), { type: 'entryModeChosen', mode: 'notes' }, select(40), enter(3))
    const s = run(noted, H, H)
    expect(s.ui.entryMode).toBe('notes')
    const next = run(s, APPLY)
    expect(next.sessions.free.digits[40]).toBe('5')
    expect(next.sessions.free.notes).toBe(s.sessions.free.notes)
    expect(next.sessions.free.hintsUsed).toBe(1)
  })

  it('Undo after: digits and Notes come back; hintsUsed stays; Hint stays idle', () => {
    const noted = run(fresh(), { type: 'entryModeChosen', mode: 'notes' }, select(40), enter(3))
    const s = run(noted, H, H)
    const applied = run(s, APPLY)
    const undone = run(applied, { type: 'undoRequested' })
    expect(undone.sessions.free.digits).toBe(s.sessions.free.digits)
    expect(undone.sessions.free.notes).toBe(s.sessions.free.notes)
    expect(undone.sessions.free.hintsUsed).toBe(1)
    expect(undone.ui.hint).toBe(applied.ui.hint)
    expect(undone.ui.hint).toEqual(idle)
    // hintsUsed only goes up: a second Hint move counts again.
    expect(run(undone, H, H, APPLY).sessions.free.hintsUsed).toBe(2)
  })

  it('solves on the last empty cell in the same step; one message; Hint idle and refused', () => {
    const last = solution.slice(0, 40) + '0' + solution.slice(41)
    const s = deepFreeze(run(createInitialState({ givens: last, solution, difficulty: 'easy' }), H, H))
    const next = say(s, APPLY)
    expect(next.sessions.free.digits).toBe(solution)
    expect(next.sessions.free.status).toBe('solved')
    expect(next.sessions.free.hintsUsed).toBe(1)
    expect(next.ui.hint).toEqual(idle)
    expect(next.ui.announcement?.text).toBe('5 placed, row 5, column 5. Solved')
    expect(reducer(next, H)).toBe(next)
    expect(reducer(next, APPLY)).toBe(next)
  })

  describe('stale: same state, hintsUsed unchanged, no announcement; never throws', () => {
    const at = atMove()
    const withHint = (hint: AppState['ui']['hint']): AppState => deepFreeze({ ...at, ui: { ...at.ui, hint } })
    const cases: [string, AppState][] = [
      ['ui.hint null', withHint(null)],
      ["another Session's Hint", withHint({ ...at.ui.hint!, sessionKey: 'city:a' })],
      ['step idle', withHint({ ...at.ui.hint!, step: 'idle' })],
      ['step nudge', withHint({ ...at.ui.hint!, step: 'nudge' })],
      ['result not a chain', withHint({ ...at.ui.hint!, result: { kind: 'none' } })],
      ['result null', withHint({ ...at.ui.hint!, result: null })],
      ['no Session', deepFreeze({ ...at, sessions: {} })],
      ['solved', deepFreeze({ ...at, sessions: { free: { ...at.sessions.free, digits: solution, status: 'solved' } } })],
      [
        'target not empty',
        deepFreeze({ ...at, sessions: { free: { ...at.sessions.free, digits: at.sessions.free.digits.slice(0, 40) + '9' + at.sessions.free.digits.slice(41) } } }),
      ],
    ]
    for (const [name, s] of cases) {
      it(name, () => {
        expect(reducer(s, APPLY)).toBe(s)
        expect(say(s, APPLY)).toBe(s)
      })
    }

    it('a fresh state (closed panel)', () => {
      const s = fresh()
      expect(say(s, APPLY)).toBe(s)
      expect(s.sessions.free.hintsUsed).toBe(0)
    })
  })
})

describe('Mistake Hints', () => {
  /** Row 4, column 6 (1-based): empty in the sample, solution 1. */
  const M = 32
  /** Row 6, column 6: empty, solution 4. A later Mistake in row-major order. */
  const M2 = 50
  const notesMode: Action = { type: 'entryModeChosen', mode: 'notes' }
  const digitMode: Action = { type: 'entryModeChosen', mode: 'digit' }
  const UNDO: Action = { type: 'undoRequested' }
  const idle = { sessionKey: FREE_PLAY_KEY, step: 'idle', result: null }
  const NUDGE = "One of your digits doesn't fit — look at row 4."
  const EXPLAIN = "The 9 in row 4, column 6 isn't part of this Puzzle's solution. Clearing it gets you back on track."
  /** A 9 at M (with Notes 3 and 5 under it) and an 8 at M2, M2 placed first. */
  const wrong = () =>
    deepFreeze(run(fresh(), select(M2), enter(8), notesMode, select(M), enter(3), enter(5), digitMode, select(M), enter(9)))

  it('fixture: both cells are empty in the sample and the digits are Mistakes', () => {
    expect(givens[M]).toBe('0')
    expect(givens[M2]).toBe('0')
    expect(solution[M]).not.toBe('9')
    expect(solution[M2]).not.toBe('8')
  })

  it('step 1: the first Mistake in row-major order; Nudge, row text, "Explain it"; ring on that cell only; announced once', () => {
    const s = say(wrong(), H)
    expect(s.ui.hint).toEqual({ sessionKey: FREE_PLAY_KEY, step: 'nudge', result: { kind: 'mistake', cell: M, digit: 9 } })
    expect(hintView(s.ui.hint, s.sessions.free.digits)).toEqual({ label: 'Nudge', text: NUDGE, button: 'Explain it', technique: null })
    expect([...hintFocusCells(s.ui.hint)]).toEqual([M])
    expect(hintMistakeCell(s.ui.hint)).toBe(M)
    expect(hintMove(s.ui.hint)).toBeNull()
    expect(hintAction(s.ui.hint)).toEqual(H)
    expect(s.ui.announcement?.text).toBe(NUDGE)
    expect(s.ui.undo).toEqual(wrong().ui.undo)
  })

  it('step 2: Explanation, the digit and its place, "Show me the move"; ring stays; no Technique', () => {
    const s1 = say(wrong(), H)
    const s2 = say(s1, H)
    expect(s2.ui.hint?.step).toBe('explain')
    expect(hintView(s2.ui.hint, s2.sessions.free.digits)).toEqual({
      label: 'Explanation',
      text: EXPLAIN,
      button: 'Show me the move',
      technique: null,
    })
    expect([...hintFocusCells(s2.ui.hint)]).toEqual([M])
    expect(hintTechnique(s2.ui.hint)).toBeNull()
    expect(hintMove(s2.ui.hint)).toEqual({ cell: M, digit: 0 })
    expect(hintAction(s2.ui.hint)).toEqual({ type: 'hintApplied' })
    expect(s2.ui.announcement).toEqual({ text: EXPLAIN, seq: s1.ui.announcement!.seq + 1 })
    // The definition can't open for a Mistake.
    expect(reducer(s2, { type: 'techniqueDefinitionOpened' })).toBe(s2)
  })

  it('found whatever the Mistake Assist setting', () => {
    const w = wrong()
    const assistOn = deepFreeze({ ...w, settings: { ...w.settings, mistakeHighlighting: true } })
    expect(run(assistOn, H).ui.hint?.result).toEqual({ kind: 'mistake', cell: M, digit: 9 })
    expect(run(w, H).ui.hint?.result).toEqual({ kind: 'mistake', cell: M, digit: 9 })
  })

  it("Assist Off: only the Hint's cell is marked, at steps 1 and 2; idle or closed marks nothing", () => {
    const s0 = wrong()
    expect(s0.settings.mistakeHighlighting).toBe(false)
    const marked = (s: AppState) =>
      cellMarks(s.sessions.free, s.ui.selectedCell, s.settings, hintMistakeCell(activeHint(s, FREE_PLAY_KEY))).cells.flatMap(
        (m, i) => (m.mistake ? [i] : []),
      )
    expect(marked(s0)).toEqual([])
    const s1 = run(s0, H)
    expect(marked(s1)).toEqual([M])
    expect(marked(run(s1, H))).toEqual([M])
    expect(marked(run(s1, ESC))).toEqual([])
    const idleState = run(s1, select(OTHER), enter(Number(solution[OTHER])))
    expect(idleState.ui.hint?.step).toBe('idle')
    expect(hintMistakeCell(idleState.ui.hint)).toBeNull()
    expect(marked(idleState)).toEqual([])
    // A chain Hint marks nothing.
    expect(hintMistakeCell(run(fresh(), H).ui.hint)).toBeNull()
  })

  it('clear: digit → 0 with the Notes mask kept; hintsUsed + 1; one Undo entry; Hint idle; announced once', () => {
    const s = deepFreeze(say(wrong(), H, H))
    const notes = s.sessions.free.notes
    expect(notes[M]).not.toBe(0)
    const next = say(s, APPLY)
    const d = s.sessions.free.digits
    expect(next.sessions.free.digits).toBe(d.slice(0, M) + '0' + d.slice(M + 1))
    expect(next.sessions.free.notes).toBe(notes)
    expect(next.sessions.free.hintsUsed).toBe(1)
    expect(next.sessions.free.status).toBe('inProgress')
    expect(next.ui.undo).toHaveLength(s.ui.undo.length + 1)
    expect(next.ui.undo.at(-1)).toEqual({ digits: d, notes })
    expect(next.ui.hint).toEqual(idle)
    expect(hintFocusCells(next.ui.hint).size).toBe(0)
    expect(next.ui.announcement).toEqual({ text: 'row 4, column 6 cleared', seq: s.ui.announcement!.seq + 1 })
    expect(next.meta.lastPlayedKey).toBe(FREE_PLAY_KEY)
  })

  it('H three times (hintAction) clears it, in Notes entry mode too, Notes untouched', () => {
    const press = (st: AppState) => reducer(st, { ...hintAction(activeHint(st, FREE_PLAY_KEY)), date: '2026-10-07' } as Action)
    const s = run(wrong(), notesMode)
    const cleared = press(press(press(s)))
    expect(cleared.sessions.free.digits[M]).toBe('0')
    expect(cleared.sessions.free.notes).toBe(s.sessions.free.notes)
    expect(cleared.ui.entryMode).toBe('notes')
  })

  it('Undo after the clear: the Mistake digit comes back; hintsUsed unchanged; Hint idle', () => {
    const applied = run(wrong(), H, H, APPLY)
    const undone = run(applied, UNDO)
    expect(undone.sessions.free.digits).toBe(wrong().sessions.free.digits)
    expect(undone.sessions.free.notes).toEqual(wrong().sessions.free.notes)
    expect(undone.sessions.free.hintsUsed).toBe(1)
    expect(undone.ui.hint).toEqual(idle)
  })

  it('the next Hint reports the next Mistake; with none left, a chain', () => {
    const afterFirst = run(wrong(), H, H, APPLY, H)
    expect(afterFirst.ui.hint?.result).toEqual({ kind: 'mistake', cell: M2, digit: 8 })
    const afterBoth = run(afterFirst, H, APPLY, H)
    expect(afterBoth.sessions.free.digits[M2]).toBe('0')
    expect(afterBoth.ui.hint?.result?.kind).toBe('chain')
    expect(afterBoth.sessions.free.hintsUsed).toBe(2)
  })

  it('the player fixes or clears the cell: Hint idle; the next Hint moves on', () => {
    const s = run(wrong(), H, H)
    const fixed = run(s, select(M), enter(Number(solution[M])))
    expect(fixed.ui.hint).toEqual(idle)
    expect(run(fixed, H).ui.hint?.result).toEqual({ kind: 'mistake', cell: M2, digit: 8 })
    expect(run(s, select(M), { type: 'cellCleared' }).ui.hint).toEqual(idle)
  })

  it('asking never changes Notes, and the reported cell is never a Given', () => {
    const w = wrong()
    const s = run(w, H, H)
    expect(s.sessions.free.notes).toBe(w.sessions.free.notes)
    const result = s.ui.hint?.result
    expect(result?.kind === 'mistake' && givens[result.cell]).toBe('0')
  })

  describe('stale clear: same state, nothing announced; never throws', () => {
    const at = deepFreeze(run(wrong(), H, H))
    const withHint = (hint: AppState['ui']['hint']): AppState => deepFreeze({ ...at, ui: { ...at.ui, hint } })
    const withDigits = (digits: string): AppState => deepFreeze({ ...at, sessions: { free: { ...at.sessions.free, digits } } })
    const d = at.sessions.free.digits
    const cases: [string, AppState][] = [
      ['ui.hint null', withHint(null)],
      ["another Session's Hint", withHint({ ...at.ui.hint!, sessionKey: 'city:a' })],
      ['step nudge', withHint({ ...at.ui.hint!, step: 'nudge' })],
      ['step idle', withHint({ ...at.ui.hint!, step: 'idle' })],
      ['solved', deepFreeze({ ...at, sessions: { free: { ...at.sessions.free, digits: solution, status: 'solved' } } })],
      ['cell no longer holds the digit', withDigits(d.slice(0, M) + '7' + d.slice(M + 1))],
      ['cell already empty', withDigits(d.slice(0, M) + '0' + d.slice(M + 1))],
      ['a Given cell', withHint({ ...at.ui.hint!, result: { kind: 'mistake', cell: 0, digit: 5 } })],
      ['an out-of-range cell', withHint({ ...at.ui.hint!, result: { kind: 'mistake', cell: 81, digit: 9 } })],
    ]
    for (const [name, s] of cases) {
      it(name, () => {
        expect(reducer(s, APPLY)).toBe(s)
        expect(say(s, APPLY)).toBe(s)
      })
    }
  })
})

describe('full but wrong grid', () => {
  /** Two side-by-side empty cells in one row; swapping their solution digits fills the grid wrong. */
  const A = [...givens].findIndex((ch, i) => ch === '0' && i % 9 !== 8 && givens[i + 1] === '0')
  const B = A + 1
  const swapped = solution.slice(0, A) + solution[B] + solution[A] + solution.slice(B + 1)
  const withDigits = (digits: string): AppState => {
    const s = fresh()
    return deepFreeze({ ...s, sessions: { free: { ...s.sessions.free, digits } } })
  }

  it('isFullNotSolved: no empty cell and not the solution', () => {
    const session = createSession(FREE_PLAY_KEY, samplePuzzle)
    expect(isFullNotSolved(session)).toBe(false)
    expect(isFullNotSolved({ ...session, digits: solution })).toBe(false)
    expect(isFullNotSolved({ ...session, digits: swapped })).toBe(true)
    expect(isFullNotSolved({ ...session, digits: swapped.slice(0, A) + '0' + swapped.slice(B) })).toBe(false)
  })

  it('the last digit fills it wrong: inProgress, Assist untouched, the cue said once with the digit', () => {
    const s0 = withDigits(solution.slice(0, A) + solution[B] + '0' + solution.slice(B + 1))
    const s = say(s0, select(B), enter(Number(solution[A])))
    expect(s.sessions.free.digits).toBe(swapped)
    expect(s.sessions.free.status).toBe('inProgress')
    expect(s.settings).toBe(s0.settings)
    expect(s.ui.announcement?.text).toBe(`${solution[A]}. Something doesn't fit yet — want a hint?`)
    // Already full: a further change says only the digit.
    const again = say(s, select(A), enter(Number(solution[A])))
    expect(isFullNotSolved(again.sessions.free)).toBe(true)
    expect(again.ui.announcement?.text).toBe(solution[A])
    // Input stays live: fixing the last cell solves.
    const solved = say(again, select(B), enter(Number(solution[B])))
    expect(solved.sessions.free.digits).toBe(solution)
    expect(solved.sessions.free.status).toBe('solved')
  })

  it('a Hint on it is always a Mistake Hint', () => {
    expect(run(withDigits(swapped), H).ui.hint?.result).toEqual({ kind: 'mistake', cell: A, digit: Number(solution[B]) })
  })
})

describe('Mistake copy', () => {
  it('has no "!" and no "Wrong"', () => {
    for (const text of [
      copy.hintMistakeNudge(4),
      copy.hintMistakeExplain(9, 4, 6),
      copy.announceHintCleared(4, 6),
      copy.fullNotSolved,
      copy.announceDigitFullNotSolved(7),
    ]) {
      expect(text).not.toMatch(/!|wrong/i)
    }
    expect(copy.announceDigitFullNotSolved(7)).toBe("7. Something doesn't fit yet — want a hint?")
  })
})
