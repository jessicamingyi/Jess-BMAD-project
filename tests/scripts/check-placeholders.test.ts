import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { placeholderIds } from '../../scripts/check-placeholders.ts'
import { CITIES, cityById } from '../../src/content/cities.ts'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-placeholders.ts', import.meta.url))
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'traveller-placeholders-'))

afterAll(() => rmSync(dir, { recursive: true, force: true }))

function run(script: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--no-warnings', script, ...args], { encoding: 'utf8', cwd: ROOT })
}

/** A catalogue with two placeholder Cities, so the entry-point tests still see the gate block. */
const FIXTURE = join(dir, 'placeholders.json')
writeFileSync(
  FIXTURE,
  JSON.stringify([
    { id: 'europe-near-1', placeholder: true },
    cityById('lisbon'),
    { id: 'asia-far-3', placeholder: true },
  ]),
)
const blocked = 'Deploy blocked: 2 placeholder Cities: europe-near-1, asia-far-3'

describe('check-placeholders', () => {
  it('placeholderIds lists placeholder ids in order', () => {
    expect(placeholderIds([{ id: 'a', placeholder: true }, { id: 'b' }, { id: 'c', placeholder: true }])).toEqual(['a', 'c'])
    expect(placeholderIds([{ id: 'b' }])).toEqual([])
  })

  it('exits 0 on the committed catalogue: every Postcard line is written (TS-40)', () => {
    expect(CITIES.some((c) => c.placeholder === true)).toBe(false)
    const r = run(SCRIPT)
    expect(r.status).toBe(0)
    expect(r.stdout.trim()).toBe('No placeholder Cities.')
  })

  it('exits 1 on a catalogue with placeholders, listing their ids in order', () => {
    const r = run(SCRIPT, FIXTURE)
    expect(r.status).toBe(1)
    expect(r.stderr.trim()).toBe(blocked)
  })

  it('still blocks when started through a different but equivalent path', () => {
    // Relative path with a redundant segment (resolved against cwd = repo root).
    const r = run(relative(ROOT, SCRIPT).replace('scripts', join('scripts', '..', 'scripts')), FIXTURE)
    expect(r.status).toBe(1)
    expect(r.stderr.trim()).toBe(blocked)
  })

  it('still blocks when started through a symlinked directory (where the OS allows it)', () => {
    const link = join(dir, 'linked-scripts')
    try {
      symlinkSync(dirname(SCRIPT), link, 'junction')
    } catch {
      return // symlinks unavailable on this machine
    }
    let r
    try {
      r = run(join(link, 'check-placeholders.ts'), FIXTURE)
    } finally {
      unlinkSync(link) // remove the link itself before the temp dir is deleted recursively
    }
    expect(r.status).toBe(1)
    expect(r.stderr.trim()).toBe(blocked)
  })

  it('exits 0 when no City is a placeholder', () => {
    const path = join(dir, 'cities.json')
    writeFileSync(path, JSON.stringify([cityById('lisbon')]))
    const r = run(SCRIPT, path)
    expect(r.status).toBe(0)
    expect(r.stdout.trim()).toBe('No placeholder Cities.')
  })
})
