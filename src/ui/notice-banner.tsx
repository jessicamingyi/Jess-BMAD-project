import { copy } from '../content/copy.ts'
import type { BannerKind, ReadOnlyReason } from '../game/types.ts'
import './controls.css'
import './banner.css'

/** The banner's line: read-only says why; storage that couldn't be read or backed up reuses the unreadable line. */
function bannerText(kind: BannerKind, readOnly: ReadOnlyReason | null): string {
  if (kind === 'saveFailed') return copy.bannerSaveFailed
  if (kind === 'unreadable') return copy.bannerUnreadable
  if (kind === 'updateReady') return copy.bannerUpdateReady
  if (readOnly === 'otherTab') return copy.bannerOtherTab
  if (readOnly === 'newerVersion') return copy.bannerNewerVersion
  return copy.bannerUnreadable
}

type Props = {
  kind: BannerKind
  readOnly: ReadOnlyReason | null
  /** "Got it": hide this banner. The shell moves focus (grid, else the page heading). */
  onDismiss: () => void
}

/**
 * Notice banner (UX): inline and non-modal, never over the grid. Card background,
 * a thin rule, a 4px left edge in postmark (info) or airmail-red (save failed),
 * body ink text and one text button, "Got it". On the Puzzle screen it heads the
 * side column; elsewhere it spans the content width under the header.
 */
export function NoticeBanner({ kind, readOnly, onDismiss }: Props) {
  const tone = kind === 'saveFailed' ? 'notice-banner--alert' : 'notice-banner--info'
  return (
    <div className={`notice-banner ${tone}`} data-banner={kind}>
      <p className="notice-banner-text">{bannerText(kind, readOnly)}</p>
      <button type="button" className="link-button notice-banner-button" onClick={onDismiss}>
        {copy.bannerGotIt}
      </button>
    </div>
  )
}
