import type { Region } from '../content/cities.ts'
import type { Difficulty } from '../engine/grader.ts'
import type { HintResult } from '../engine/hints.ts'

/** Difficulty is owned by the engine (the grader); re-exported for game and ui. */
export type { Difficulty } from '../engine/grader.ts'
export type { HintResult } from '../engine/hints.ts'

export type SessionStatus = 'inProgress' | 'solved'

/** A Puzzle as supplied by content or the generator: Givens, solution and Difficulty. */
export type Puzzle = {
  readonly givens: string
  readonly solution: string
  readonly difficulty: Difficulty
}

export type Session = {
  readonly key: string
  /** 81-char digit string, cells 0–80 row-major, 0 = empty. */
  readonly givens: string
  readonly solution: string
  /** Givens plus player digits, 81 chars, 0 = empty. */
  readonly digits: string
  /** 81 nine-bit masks (bit d−1 = Note d). */
  readonly notes: readonly number[]
  readonly status: SessionStatus
  readonly difficulty: Difficulty
  readonly hintsUsed: number
}

/** A collected City. At most one per City; the Album keeps them in the order collected. */
export type Postcard = {
  readonly cityId: string
  /** Local date the City was solved, 'YYYY-MM-DD' (passed in by the shell). */
  readonly collectedOn: string
  readonly revealed: boolean
}

/** Postcards in the order collected. Reachability, counts and slot states are always computed from it, never stored. */
export type Album = readonly Postcard[]
/** Player preferences (Assists, Lamplight, last Free Play Difficulty). Reset on every load in Epic 1; saving is Epic 4. */
export type Settings = {
  readonly mistakeHighlighting: boolean
  readonly sameDigitHighlighting: boolean
  readonly unitHighlighting: boolean
  readonly lamplight: boolean
  /** The Difficulty of the last Free Play Puzzle started; null until one arrives. */
  readonly freePlayDifficulty: Difficulty | null
}

/** The on/off switches on the Settings screen. */
export type SettingName = 'mistakeHighlighting' | 'sameDigitHighlighting' | 'unitHighlighting' | 'lamplight'

/** The screen shown under the header; switched by state, no router. */
export type Screen = 'puzzle' | 'album' | 'freePlay' | 'settings'

export type FreePlayStatus = 'idle' | 'generating' | 'failed'

/** The Free Play entry screen. */
export type FreePlayUi = {
  /** The picker's Difficulty; seeded from `settings.freePlayDifficulty ?? 'easy'` when the entry opens. */
  readonly picked: Difficulty
  /** The latest request id (owned by the UI shell); only a reply with this id is applied. */
  readonly requestId: number
  readonly status: FreePlayStatus
  /** The inline "This replaces your current Free Play Puzzle." confirm is showing. */
  readonly confirmingReplace: boolean
}

export type Meta = {
  readonly lastPlayedKey: string | null
}

/** Digit places digits; Notes toggles pencil marks. */
export type EntryMode = 'digit' | 'notes'

/** cellFirst: pick a cell, then a digit. numberFirst: pick a digit, then click cells. */
export type InputMode = 'cellFirst' | 'numberFirst'

/** A snapshot of the grid taken before a change, restored by Undo. */
export type UndoEntry = {
  readonly digits: string
  readonly notes: readonly number[]
}

/** idle: the panel shows "Show a nudge"; nudge: step 1 shown; explain: step 2 shown. */
export type HintStep = 'idle' | 'nudge' | 'explain'

/**
 * The open Hint panel for one Session. `result` is null until a Hint is found
 * (idle after a reset). Never saved and never recorded in Undo.
 */
export type HintState = {
  readonly sessionKey: string
  readonly step: HintStep
  readonly result: HintResult | null
  /**
   * The "What's a {technique}?" definition is open inside the panel. Absent = closed.
   * Any reset rebuilds the Hint without it, so it closes with the Hint.
   */
  readonly definitionOpen?: boolean
}

export type UiState = {
  readonly screen: Screen
  /**
   * The Session key of the current Puzzle (`free` or `city:<id>`), null before
   * any. "Puzzle" in the nav returns to it. UI state, never saved.
   */
  readonly activeKey: string | null
  /** The Region tab the Album shows. */
  readonly albumRegion: Region
  /** Postcards in the Album at the last Album visit; a longer Album means a new Postcard. */
  readonly albumSeen: number
  readonly selectedCell: number | null
  readonly entryMode: EntryMode
  readonly inputMode: InputMode
  /** The chosen digit in number-first input; null until one is chosen. */
  readonly currentDigit: number | null
  /** Unlimited Undo history, oldest first; lives only here, never saved. */
  readonly undo: readonly UndoEntry[]
  /** The Restart confirm is showing in place of the action row. */
  readonly restartConfirming: boolean
  /**
   * The latest screen-reader announcement. `seq` increases with every message so
   * repeating the same text re-announces. Never recorded in Undo.
   */
  readonly announcement: Announcement | null
  readonly freePlay: FreePlayUi
  /** The Hint panel; null when closed. Shown only for its own Session. */
  readonly hint: HintState | null
}

export type Announcement = {
  readonly text: string
  readonly seq: number
}

export type AppState = {
  readonly album: Album
  readonly sessions: Readonly<Record<string, Session>>
  readonly settings: Settings
  readonly meta: Meta
  readonly ui: UiState
}

export type Action =
  | { readonly type: 'cellSelected'; readonly cell: number }
  | { readonly type: 'digitEntered'; readonly digit: number }
  | { readonly type: 'cellClicked'; readonly cell: number }
  | { readonly type: 'entryModeChosen'; readonly mode: EntryMode }
  | { readonly type: 'inputModeChosen'; readonly mode: InputMode }
  | { readonly type: 'inputModeToggled' }
  | { readonly type: 'entryModeToggled' }
  /** Backspace/Delete: clear the selected cell's player digit, or its Notes when empty. */
  | { readonly type: 'cellCleared' }
  /** Number-first Enter/Space: place the current digit in the selected cell. */
  | { readonly type: 'currentDigitPlaced' }
  | { readonly type: 'undoRequested' }
  | { readonly type: 'restartRequested' }
  | { readonly type: 'restartCancelled' }
  | { readonly type: 'restartConfirmed' }
  /** Flip one Settings switch. Never recorded in Undo. */
  | { readonly type: 'settingToggled'; readonly setting: SettingName }
  /** Header nav: show the Puzzle, Album, Free Play entry or Settings screen. */
  | { readonly type: 'screenChosen'; readonly screen: Screen }
  /**
   * An Album slot: travel to a Reachable City (a fresh Session) or carry on its
   * Puzzle in progress. Locked or unknown Cities change nothing. Never recorded in Undo.
   */
  | { readonly type: 'cityChosen'; readonly cityId: string }
  /** An Album Region tab. */
  | { readonly type: 'albumRegionChosen'; readonly region: Region }
  /** Free Play entry "Carry on": make the Free Play Puzzle current and show it. */
  | { readonly type: 'freePlayResumed' }
  /** Free Play entry. None of these is ever recorded in Undo. */
  | { readonly type: 'freePlayDifficultyPicked'; readonly difficulty: Difficulty }
  /** The shell started generating; `requestId` and the seed come from the shell. */
  | { readonly type: 'freePlayRequested'; readonly requestId: number; readonly difficulty: Difficulty }
  | { readonly type: 'freePlayReplaceRequested' }
  | { readonly type: 'freePlayReplaceCancelled' }
  /** Worker reply; applied only when `requestId` is the latest and a request is pending. */
  | { readonly type: 'freePlayGenerated'; readonly requestId: number; readonly puzzle: Puzzle }
  | { readonly type: 'freePlayFailed'; readonly requestId: number }
  /** H or the Hint / step button: open the panel, or advance one step. */
  | { readonly type: 'hintRequested' }
  /** Esc: set the Hint aside (close the panel). */
  | { readonly type: 'hintClosed' }
  /**
   * H, "Show me the move" or Hint at step 2: place the chain's final
   * placement, or clear a Mistake Hint's cell, through Undo (one entry), add 1
   * to `hintsUsed`, and send the Hint back to idle.
   * Acts only on the active Session's own Hint at step 'explain'; otherwise no change.
   */
  | { readonly type: 'hintApplied' }
  /**
   * "What's a {technique}?": open the definition inside the panel. Acts only on the
   * active Session's own Hint at step 1 or 2 with a chain; otherwise no change.
   * Never announced and never recorded in Undo.
   */
  | { readonly type: 'techniqueDefinitionOpened' }
  /** Esc, "Close" or the link again: close the definition. Same rules as opening. */
  | { readonly type: 'techniqueDefinitionClosed' }
