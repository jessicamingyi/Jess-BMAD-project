import { copy } from '../content/copy.ts'
import type { EntryMode, InputMode } from '../game/types.ts'
import { statusText } from './status-text.ts'

type Props = {
  entryMode: EntryMode
  inputMode: InputMode
  currentDigit: number | null
  selectedCell: number | null
  onEntryMode: (mode: EntryMode) => void
  onInputMode: (mode: InputMode) => void
}

type SegmentedProps<T extends string> = {
  label: string
  segments: readonly { value: T; label: string }[]
  active: T
  onChoose: (value: T) => void
  caption?: string
}

/** Two-part segmented control; the active segment is inverted and aria-pressed. */
function Segmented<T extends string>({ label, segments, active, onChoose, caption }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {segments.map((s) => (
        <button
          key={s.value}
          type="button"
          className={s.value === active ? 'segment segment--active' : 'segment'}
          aria-pressed={s.value === active}
          onClick={() => {
            if (s.value !== active) onChoose(s.value)
          }}
        >
          {s.label}
        </button>
      ))}
      {caption && (
        <span className="segmented-caption" aria-hidden="true">
          {caption}
        </span>
      )}
    </div>
  )
}

const ENTRY_SEGMENTS = [
  { value: 'digit', label: copy.entryDigit },
  { value: 'notes', label: copy.entryNotes },
] as const satisfies readonly { value: EntryMode; label: string }[]

const INPUT_SEGMENTS = [
  { value: 'cellFirst', label: copy.inputCellFirst },
  { value: 'numberFirst', label: copy.inputNumberFirst },
] as const satisfies readonly { value: InputMode; label: string }[]

export function ModeIndicator({
  entryMode,
  inputMode,
  currentDigit,
  selectedCell,
  onEntryMode,
  onInputMode,
}: Props) {
  return (
    <div className="mode-indicator">
      <div className="mode-indicator-controls">
        <Segmented<EntryMode>
          label={copy.entryModeLabel}
          segments={ENTRY_SEGMENTS}
          active={entryMode}
          onChoose={onEntryMode}
          caption={copy.entryModeKey}
        />
        <Segmented<InputMode>
          label={copy.inputModeLabel}
          segments={INPUT_SEGMENTS}
          active={inputMode}
          onChoose={onInputMode}
        />
      </div>
      <p className="mode-status">{statusText(entryMode, inputMode, currentDigit, selectedCell)}</p>
    </div>
  )
}
