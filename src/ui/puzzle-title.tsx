import { copy } from '../content/copy.ts'
import type { Difficulty } from '../game/types.ts'

type Props = {
  difficulty: Difficulty
}

/** The Puzzle header title. Free Play: "Free Play · {Difficulty}" in city-title type, never a Stamp. */
export function PuzzleTitle({ difficulty }: Props) {
  return <h1 className="puzzle-title">{copy.freePlayTitle(difficulty)}</h1>
}
