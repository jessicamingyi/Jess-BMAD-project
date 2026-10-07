export type CellKind = 'given' | 'player' | 'notes' | 'empty'

/** Difficulty names (content may not import engine/game, so the union is restated here). */
const DIFFICULTY_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const

/** User-facing strings, kept in one place. */
export const copy = {
  /** Calm solve line in Free Play; followed by a link-styled button back to the entry. */
  solvedFreePlay: 'Solved. Another one?',

  /** Puzzle header title in Free Play, e.g. "Free Play · Easy" (no Stamp). */
  freePlayTitle: (difficulty: keyof typeof DIFFICULTY_NAMES): string => `Free Play · ${DIFFICULTY_NAMES[difficulty]}`,
  digitPadLabel: 'Digits',
  gridLabel: 'Sudoku grid',
  /**
   * e.g. "Row 4, column 6, 7, given" / "…, 7, your digit" / "…, notes 3, 7" / "…, empty".
   * Row and column are 1-based; `notes` is only read for kind 'notes'.
   * `mistake` appends ", mistake" to a player digit (only when the Mistake Assist is On).
   * `hint` appends ", hint" to a cell a Hint names.
   */
  cellLabel: (
    row: number,
    col: number,
    value: string,
    kind: CellKind,
    notes: readonly number[] = [],
    mistake = false,
    hint = false,
  ): string => {
    const where = `Row ${row}, column ${col}`
    const suffix = hint ? ', hint' : ''
    if (kind === 'empty') return `${where}, empty${suffix}`
    if (kind === 'notes') return `${where}, notes ${notes.join(', ')}${suffix}`
    if (kind === 'given') return `${where}, ${value}, given${suffix}`
    return `${where}, ${value}, your digit${mistake ? ', mistake' : ''}${suffix}`
  },

  /** Header nav ("Puzzle · Free Play · Settings"). */
  navLabel: 'Main',
  navPuzzle: 'Puzzle',
  navFreePlay: 'Free Play',
  navSettings: 'Settings',

  /** Free Play entry. */
  freePlayHeading: 'Free Play',
  difficultyPickerLabel: 'Difficulty',
  difficultyName: (difficulty: keyof typeof DIFFICULTY_NAMES): string => DIFFICULTY_NAMES[difficulty],
  freePlayStart: 'Start a Puzzle',
  freePlayCarryOn: 'Carry on',
  freePlayStartNew: 'Start a new one',
  freePlayReplaceLabel: 'Replace your Free Play Puzzle?',
  freePlayReplaceText: 'This replaces your current Free Play Puzzle.',
  freePlayGenerating: 'Finding a fair Puzzle…',
  freePlayFailed: "Couldn't find a fair Puzzle this time. Try again when you like.",

  /** Settings screen. */
  settingsHeading: 'Settings',
  settingsAssists: 'Assists',
  settingMistakeHighlighting: 'Mistake highlighting',
  settingSameDigitHighlighting: 'Same-digit highlighting',
  settingUnitHighlighting: 'Row, column and box highlighting',
  settingLamplight: 'Lamplight',
  settingOn: 'On',
  settingOff: 'Off',

  /** Digit pad captions and accessible names. */
  padRemaining: (n: number): string => `${n} left`,
  padDone: 'Done',
  padKeyLabel: (digit: number, remaining: number): string =>
    remaining === 0 ? `${digit}, all placed` : `${digit}, ${remaining} left`,

  /** Mode indicator: "Digit | Notes (N)" and "Cell first | Number first". */
  entryModeLabel: 'Entry mode',
  entryDigit: 'Digit',
  entryNotes: 'Notes',
  entryModeKey: '(N)',
  inputModeLabel: 'Input mode',
  inputCellFirst: 'Cell first',
  inputNumberFirst: 'Number first',

  /** Status line, e.g. "cell-first · Notes · row 4, column 6" or "number-first · Digit · 7". */
  statusLine: (input: string, entry: string, target: string): string => `${input} · ${entry} · ${target}`,
  statusCellFirst: 'cell-first',
  statusNumberFirst: 'number-first',
  statusCell: (row: number, col: number): string => `row ${row}, column ${col}`,
  statusChooseCell: 'choose a cell',
  statusChooseDigit: 'choose a digit',

  /** Action row: Undo · Hint · Restart, and the inline Restart confirm. */
  actionRowLabel: 'Puzzle actions',
  undo: 'Undo',
  hint: 'Hint',
  hintKey: 'H',
  restart: 'Restart',
  undoKeyMac: '⌘Z',
  undoKeyOther: 'Ctrl+Z',
  restartConfirmLabel: 'Restart the Puzzle?',
  restartConfirmText: 'Clear your digits and Notes? The Givens stay.',
  keepGoing: 'Keep going',

  /** Hint panel: region name, step labels, the one step button and its caption. */
  hintPanelLabel: 'Hint',
  hintLabelIdle: 'Hint',
  hintLabelNudge: 'Nudge',
  hintLabelExplain: 'Explanation',
  hintShowNudge: 'Show a nudge',
  hintExplainIt: 'Explain it',
  hintShowMove: 'Show me the move',
  hintSetAside: 'Esc to set aside',

  /** Polite live-region announcements (UX-DR61). Mode switches reuse entryDigit/entryNotes and statusCellFirst/statusNumberFirst. */
  announceDigit: (digit: number): string => String(digit),
  announceNoteAdded: (digit: number): string => `note ${digit} added`,
  announceNoteRemoved: (digit: number): string => `note ${digit} removed`,
  announceCleared: 'cleared',
  announceGiven: "Given, can't change",
  announceCurrentDigit: (digit: number): string => `current digit ${digit}`,
  announceSolved: 'Solved',
} as const
