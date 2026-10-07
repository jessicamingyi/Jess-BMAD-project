import { copy } from '../content/copy.ts'

/** The Undo key caption for a `navigator.platform` string: "⌘Z" on macOS, otherwise "Ctrl+Z". */
export function keyCaption(platform: string): string {
  return platform.includes('Mac') ? copy.undoKeyMac : copy.undoKeyOther
}
