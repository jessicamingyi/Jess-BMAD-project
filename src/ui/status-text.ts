import { copy } from '../content/copy.ts'
import type { EntryMode, InputMode } from '../game/types.ts'

/** The mode status line: input mode · Digit/Notes · selected cell (cell-first) or current digit (number-first). */
export function statusText(
  entryMode: EntryMode,
  inputMode: InputMode,
  currentDigit: number | null,
  selectedCell: number | null,
): string {
  const entry = entryMode === 'notes' ? copy.entryNotes : copy.entryDigit
  if (inputMode === 'numberFirst') {
    const target = currentDigit === null ? copy.statusChooseDigit : String(currentDigit)
    return copy.statusLine(copy.statusNumberFirst, entry, target)
  }
  const target =
    selectedCell === null
      ? copy.statusChooseCell
      : copy.statusCell(Math.floor(selectedCell / 9) + 1, (selectedCell % 9) + 1)
  return copy.statusLine(copy.statusCellFirst, entry, target)
}
