import type { Announcement } from '../game/types.ts'

/**
 * Visually hidden polite live region (UX-DR61). The message is keyed by `seq`,
 * so the same text twice ("7", "7") is a fresh node and is announced again.
 */
export function LiveRegion({ announcement }: { announcement: Announcement | null }) {
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {announcement && <span key={announcement.seq}>{announcement.text}</span>}
    </div>
  )
}
