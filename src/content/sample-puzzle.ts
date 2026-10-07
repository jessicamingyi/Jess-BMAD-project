/**
 * Built-in sample Puzzle (Easy). Loads at startup until Story 1.8 replaces it
 * with Free Play entry; afterwards it remains a test fixture.
 * 81-char digit strings, cells 0–80 row-major, 0 = empty.
 */
export const samplePuzzle = {
  givens: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  difficulty: 'easy',
} as const
