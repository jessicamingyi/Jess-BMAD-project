import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkKeyHandlers, type SourceFile } from './check-architecture.ts'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

describe('single keyboard handler guard', () => {
  it('allows key handling inside src/ui/keyboard*', () => {
    expect(
      checkKeyHandlers([
        { path: 'src/ui/keyboard.ts', source: "el.addEventListener('keydown', f)\nconst p = { onKeyDown: f }" },
        { path: 'src/ui/keyboard-map.ts', source: "window.addEventListener('keyup', f)" },
      ]),
    ).toEqual([])
  })

  it('passes ordinary components (onClick, onFocus, other events)', () => {
    expect(
      checkKeyHandlers([
        {
          path: 'src/ui/x.tsx',
          source: "export const X = () => <button onClick={f} onFocus={g} />\nel.addEventListener('click', h)",
        },
      ]),
    ).toEqual([])
  })

  it.each([
    ['onKeyDown JSX prop', 'src/ui/x.tsx', 'export const X = () => <div onKeyDown={f} />', 'onKeyDown'],
    ['onKeyUp JSX prop', 'src/ui/x.tsx', 'export const X = () => <div onKeyUp={f} />', 'onKeyUp'],
    ['onKeyPress JSX prop', 'src/ui/x.tsx', 'export const X = () => <div onKeyPress={f} />', 'onKeyPress'],
    ['onKeyDownCapture JSX prop', 'src/ui/x.tsx', 'export const X = () => <div onKeyDownCapture={f} />', 'onKeyDownCapture'],
    ['createElement props', 'src/ui/x.ts', "createElement('div', { onKeyDown: f })", 'onKeyDown'],
    ['DOM property', 'src/ui/x.ts', 'el.onkeydown = f', 'onkeydown'],
    ['addEventListener keydown', 'src/ui/x.ts', "document.addEventListener('keydown', f)", "addEventListener('keydown')"],
    ['addEventListener keyup', 'src/game/x.ts', 'el.addEventListener("keyup", f)', "addEventListener('keyup')"],
    ['addEventListener keypress', 'src/main.tsx', "window.addEventListener('keypress', f)", "addEventListener('keypress')"],
  ])('fails on %s, naming the file', (_label, path, source, name) => {
    const v = checkKeyHandlers([{ path, source }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: path, kind: 'key', name })
    expect(v[0].message).toContain(path)
  })

  it('ignores mentions in comments and strings', () => {
    expect(
      checkKeyHandlers([{ path: 'src/ui/x.ts', source: "// onKeyDown, addEventListener('keydown')\nconst s = 'onKeyDown'" }]),
    ).toEqual([])
  })
})

function collect(dir: string): SourceFile[] {
  const out: SourceFile[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collect(full))
    else if (/\.tsx?$/.test(entry.name)) {
      out.push({ path: relative(ROOT, full).replace(/\\/g, '/'), source: readFileSync(full, 'utf8') })
    }
  }
  return out
}

describe('single keyboard handler in the real tree', () => {
  it('only src/ui/keyboard* handles keys, and it does register a keydown listener', () => {
    const files = collect(join(ROOT, 'src'))
    expect(checkKeyHandlers(files).map((v) => v.message)).toEqual([])
    const keyboard = files.find((f) => f.path === 'src/ui/keyboard.ts')
    expect(keyboard?.source).toContain("addEventListener('keydown'")
  })
})
