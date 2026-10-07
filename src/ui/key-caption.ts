import { copy } from '../content/copy.ts'

/** True for a macOS `navigator.platform` string (Undo is Cmd+Z there, Ctrl+Z elsewhere). */
export function isMacPlatform(platform: string): boolean {
  return platform.includes('Mac')
}

/** The Undo key caption for a `navigator.platform` string: "⌘Z" on macOS, otherwise "Ctrl+Z". */
export function keyCaption(platform: string): string {
  return isMacPlatform(platform) ? copy.undoKeyMac : copy.undoKeyOther
}
