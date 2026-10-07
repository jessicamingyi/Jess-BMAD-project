import { copy } from '../content/copy.ts'

type Props = {
  /** Index 1–9: how many of that digit are left to place (never below 0). */
  remaining: readonly number[]
  /** The current digit in number-first input; null before one is chosen. */
  currentDigit: number | null
  /** Number-first input: keys choose the current digit and expose aria-pressed. */
  numberFirst: boolean
  onDigit: (digit: number) => void
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function DigitPad({ remaining, currentDigit, numberFirst, onDigit }: Props) {
  return (
    <div className="digit-pad" role="group" aria-label={copy.digitPadLabel}>
      {DIGITS.map((digit) => {
        const left = Math.max(0, remaining[digit] ?? 0)
        const done = left === 0
        const current = numberFirst && digit === currentDigit
        const classes = ['digit-pad-key', done && 'digit-pad-key--done', current && 'digit-pad-key--current']
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={digit}
            type="button"
            className={classes}
            aria-label={copy.padKeyLabel(digit, left)}
            aria-pressed={numberFirst ? current : undefined}
            onClick={() => onDigit(digit)}
          >
            <span className="digit-pad-digit">{digit}</span>
            <span className="digit-pad-count">{done ? copy.padDone : copy.padRemaining(left)}</span>
          </button>
        )
      })}
    </div>
  )
}
