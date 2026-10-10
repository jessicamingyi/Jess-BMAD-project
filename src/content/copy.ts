export type CellKind = 'given' | 'player' | 'notes' | 'empty'

/** Difficulty names (content may not import engine/game, so the union is restated here). */
const DIFFICULTY_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const
const REGION_NAMES = { europe: 'Europe', asia: 'Asia', americas: 'The Americas' } as const
const TIER_NAMES = { near: 'Near', mid: 'Mid', far: 'Far' } as const
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const

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
   * `mistake` appends ", mistake" to a player digit (when the Mistake Assist is On, or
   * when an open Mistake Hint names that cell).
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

  /** Calm solve line on a solved City Puzzle once its Postcard is in the Album; followed by an "Album" link-styled button. */
  solvedCity: 'Solved. Where to next?',

  /** Header nav ("Puzzle · Album · Free Play · Settings"). */
  navLabel: 'Main',
  navPuzzle: 'Puzzle',
  navAlbum: 'Album',
  navFreePlay: 'Free Play',

  /** Album: Region tabs, heading, slots. */
  regionName: (region: keyof typeof REGION_NAMES): string => REGION_NAMES[region],
  tierName: (tier: keyof typeof TIER_NAMES): string => TIER_NAMES[tier],
  albumRegionsLabel: 'Regions',
  /** A Region tab, e.g. "Europe 4 / 10". */
  regionTabCount: (region: keyof typeof REGION_NAMES, collected: number, total: number): string =>
    `${REGION_NAMES[region]} ${collected} / ${total}`,
  albumHeadingEmpty: 'Where to first?',
  albumHeading: 'Where to next?',
  /** Under the Album heading while any Puzzle is in progress. */
  albumNoRush: 'No rush - your Puzzle will wait.',
  /** A slot's caption, e.g. "Portugal · Mid". */
  slotCaption: (country: string, tier: keyof typeof TIER_NAMES): string => `${country} · ${TIER_NAMES[tier]}`,
  slotTravel: 'Travel here',
  slotCarryOn: 'Carry on',
  /** The caption on a Collected slot whose Postcard was just added. */
  justArrived: 'just arrived',
  /** A Reachable / In progress slot's accessible name, e.g. "Paris, France, Near — Travel here". */
  slotLabel: (name: string, country: string, tier: keyof typeof TIER_NAMES, action: string): string =>
    `${name}, ${country}, ${TIER_NAMES[tier]} — ${action}`,
  /** A locked slot's line, e.g. "Opens after 3 Near Postcards" (`waitTier` is the Tier it waits on). */
  slotLocked: (waitTier: keyof typeof TIER_NAMES, need: number): string =>
    `Opens after ${need} ${TIER_NAMES[waitTier]} Postcards`,
  /** A locked slot's accessible name, e.g. "Mid slot — opens after 3 Near Postcards, 1 of 3". */
  slotLockedLabel: (tier: keyof typeof TIER_NAMES, waitTier: keyof typeof TIER_NAMES, have: number, need: number): string =>
    `${TIER_NAMES[tier]} slot — opens after ${need} ${TIER_NAMES[waitTier]} Postcards, ${have} of ${need}`,

  /** City Puzzle header, e.g. "Lisbon · Mid · Medium". */
  cityTitle: (name: string, tier: keyof typeof TIER_NAMES, difficulty: keyof typeof DIFFICULTY_NAMES): string =>
    `${name} · ${TIER_NAMES[tier]} · ${DIFFICULTY_NAMES[difficulty]}`,
  /** City Puzzle meta line, e.g. "Portugal — Europe, Postcard 5 of 10" (the slot position). */
  cityMeta: (country: string, region: keyof typeof REGION_NAMES, position: number, total: number): string =>
    `${country} — ${REGION_NAMES[region]}, Postcard ${position} of ${total}`,
  /** Postmark date from 'YYYY-MM-DD': "06 OCT 26". */
  postmarkDate: (date: string): string => {
    const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) ?? []
    const name = MONTHS[Number(month) - 1]
    if (!name) return ''
    return `${day} ${name} ${year.slice(2)}`
  },
  navSettings: 'Settings',

  /** The Postcard: its region name, address lines and the reveal's one button. */
  postcardFrom: (city: string): string => `Postcard from ${city}`,
  addToAlbum: 'Add to Album',
  addressTo: 'To: the Traveller',
  /** e.g. "Album · Europe". */
  addressAlbum: (region: keyof typeof REGION_NAMES): string => `Album · ${REGION_NAMES[region]}`,
  /** e.g. "Lisbon, Portugal". */
  addressCity: (city: string, country: string): string => `${city}, ${country}`,

  /** The Postcard viewer over the Album (a Collected slot) and replay. */
  slotSeePostcard: 'See Postcard',
  playAgain: 'Play again',
  startFresh: 'Start fresh',
  /** The replay confirm's group label, e.g. "Start Lisbon again?". */
  replayConfirmLabel: (city: string): string => `Start ${city} again?`,
  replayConfirmText: 'This replaces your replay in progress.',
  /** The viewer's visible close control (Esc and a click outside also close it). */
  viewerClose: 'Close',
  /**
   * Solve line on a replayed City: "Solved again. {City} is already in your Album.",
   * split so its word "Album" (`navAlbum`) is the link-styled button to the Album.
   */
  solvedAgainBefore: (city: string): string => `Solved again. ${city} is already in your `,
  solvedAgainAfter: '.',

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
  hintDefinitionClose: 'Close',
  /** Mistake Hint, step 1 and step 2 (row and column 1-based). */
  hintMistakeNudge: (row: number): string => `One of your digits doesn't fit — look at row ${row}.`,
  hintMistakeExplain: (digit: number, row: number, col: number): string =>
    `The ${digit} in row ${row}, column ${col} isn't part of this Puzzle's solution. Clearing it gets you back on track.`,

  /** Inline side-column line when every cell is filled but the grid isn't the solution; its button reuses `hint`. */
  fullNotSolved: "Something doesn't fit yet — want a hint?",

  /** Polite live-region announcements (UX-DR61). Mode switches reuse entryDigit/entryNotes and statusCellFirst/statusNumberFirst. */
  announceDigit: (digit: number): string => String(digit),
  /** The digit that fills the grid wrong, with the cue once: "7. Something doesn't fit yet — want a hint?". */
  announceDigitFullNotSolved: (digit: number): string => `${digit}. ${copy.fullNotSolved}`,
  announceNoteAdded: (digit: number): string => `note ${digit} added`,
  announceNoteRemoved: (digit: number): string => `note ${digit} removed`,
  announceCleared: 'cleared',
  announceGiven: "Given, can't change",
  announceCurrentDigit: (digit: number): string => `current digit ${digit}`,
  announceSolved: 'Solved',
  /** A Hint move, e.g. "7 placed, row 4, column 4" (1-based); "… column 4. Solved" when it solves the Puzzle. */
  announceHintPlaced: (digit: number, row: number, col: number, solved = false): string =>
    `${digit} placed, row ${row}, column ${col}${solved ? `. ${copy.announceSolved}` : ''}`,
  /** A Mistake Hint's clear, e.g. "row 4, column 6 cleared" (1-based). */
  announceHintCleared: (row: number, col: number): string => `row ${row}, column ${col} cleared`,

  /** Notice banners (inline, one at a time); each has the one button `bannerGotIt`. The save-failed line is also announced once. */
  bannerSaveFailed: "Your last change couldn't be saved. Your next move will try again - your Puzzle is still here.",
  bannerOtherTab: 'Traveller Sudoku is open in another tab. Play there, or close it and reload this one.',
  bannerNewerVersion: 'A newer version saved your progress. Reload to carry on.',
  /** Storage can't be reached: the game plays on in memory, nothing is saved. */
  bannerSavingOff: "We can't save your progress in this browser right now. Anything saved before is left untouched. You can keep playing, but this session won't be kept - reload to try again.",
  bannerUnreadable: "We couldn't read your saved progress. It's been kept safe, not overwritten.",
  bannerStorageNotice: 'Your Album lives in this browser only. Clearing browser data erases it.',
  bannerAddToDock: 'Safari may clear your Album after 7 days away. Add Traveller Sudoku to the Dock (File › Add to Dock) to keep it.',
  bannerUpdateReady: 'A new version is ready. It arrives next time you open the game.',
  bannerGotIt: 'Got it',
} as const
