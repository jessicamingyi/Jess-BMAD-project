import { copy } from '../content/copy.ts'

type Props = {
  onDigit: (digit: number) => void
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function DigitPad({ onDigit }: Props) {
  return (
    <div className="digit-pad" role="group" aria-label={copy.digitPadLabel}>
      {DIGITS.map((digit) => (
        <button key={digit} type="button" className="digit-pad-key" onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
    </div>
  )
}
