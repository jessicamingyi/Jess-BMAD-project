export type Difficulty = 'easy' | 'medium' | 'hard'

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

export type Album = Readonly<Record<string, never>>
export type Settings = Readonly<Record<string, never>>

export type Meta = {
  readonly lastPlayedKey: string | null
}

export type UiState = {
  readonly selectedCell: number | null
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
